import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { recalculateGlampingBookingTotals } from '@/lib/booking-recalculate';
import {
  broadcastToAllowedRoles,
  notifyGlampingOwnersOfZone,
} from '@/lib/notifications';

interface AddonSelectionPayload {
  addonItemId: string;
  selected: boolean;
  parameterQuantities: Record<string, number>;
  dates?: { from: string; to: string } | null;
  voucher?: {
    code: string;
    id: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
  } | null;
  totalPrice?: number;
  parameterPricing?: Record<string, { unitPrice: number; pricingMode: string; paramName: string }>;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tentId: string }> }
) {
  const client = await pool.connect();

  try {
    const { addonSelections } = await request.json() as {
      addonSelections: Record<string, AddonSelectionPayload>;
    };
    const { id: bookingId, tentId } = await params;

    await client.query('BEGIN');

    // 1. Get booking and tent details, validate permissions
    const bookingResult = await client.query(`
      SELECT
        b.id,
        b.booking_code,
        b.check_in_date,
        b.status,
        b.payment_status,
        b.total_amount as old_total,
        b.balance_due as old_balance_due,
        c.email as customer_email,
        c.first_name,
        c.last_name,
        bt.id as tent_id,
        bt.item_id,
        bt.check_in_date as tent_check_in,
        bt.check_out_date as tent_check_out,
        gi.zone_id
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id AND bt.id = $2
      LEFT JOIN glamping_items gi ON bt.item_id = gi.id
      WHERE b.id = $1
      FOR UPDATE OF b
    `, [bookingId, tentId]);

    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = bookingResult.rows[0];

    if (!booking.tent_id) {
      throw new Error('Tent not found in this booking');
    }

    // Check permission: payment_status must be deposit_paid or fully_paid
    if (!['deposit_paid', 'fully_paid'].includes(booking.payment_status)) {
      throw new Error('Common items editing is only allowed after deposit or full payment');
    }

    // Check 24-hour restriction
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilCheckIn < 24) {
      throw new Error('Common items cannot be edited within 24 hours of check-in');
    }

    // 2. Delete existing addon items for this tent
    await client.query(`
      DELETE FROM glamping_booking_items
      WHERE booking_id = $1
        AND booking_tent_id = $2
        AND metadata->>'type' = 'addon'
    `, [bookingId, tentId]);

    // 3. Insert new addon items based on selections
    const selectedAddons = Object.values(addonSelections).filter(sel => sel.selected);

    for (const sel of selectedAddons) {
      // Insert one row per parameter with quantity > 0
      for (const [paramId, qty] of Object.entries(sel.parameterQuantities)) {
        if (qty <= 0) continue;

        const paramPricing = sel.parameterPricing?.[paramId];
        const unitPrice = paramPricing?.unitPrice || 0;
        const pricingMode = paramPricing?.pricingMode || 'per_person';

        const metadata: Record<string, any> = {
          type: 'addon',
          pricingMode,
          paramName: paramPricing?.paramName || '',
        };

        if (sel.dates) {
          metadata.dates = sel.dates;
        }

        if (sel.voucher) {
          metadata.voucher = sel.voucher;
        }

        await client.query(`
          INSERT INTO glamping_booking_items
            (booking_id, booking_tent_id, item_id, addon_item_id, parameter_id,
             quantity, unit_price, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          bookingId,
          tentId,
          booking.item_id,
          sel.addonItemId,
          paramId,
          qty,
          unitPrice,
          JSON.stringify(metadata),
        ]);
      }
    }

    // 4. Increment voucher usage for newly applied vouchers
    for (const sel of selectedAddons) {
      if (sel.voucher?.id) {
        await client.query(`
          UPDATE glamping_discounts
          SET times_used = COALESCE(times_used, 0) + 1
          WHERE id = $1
        `, [sel.voucher.id]);
      }
    }

    // 5. Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Get updated total
    const updatedResult = await client.query(`
      SELECT total_amount, balance_due
      FROM glamping_bookings
      WHERE id = $1
    `, [bookingId]);

    const newTotal = parseFloat(updatedResult.rows[0].total_amount);
    const newBalanceDue = parseFloat(updatedResult.rows[0].balance_due);

    // 6. Create status history
    await client.query(`
      INSERT INTO glamping_booking_status_history
        (booking_id, previous_status, new_status,
         previous_payment_status, new_payment_status, reason)
      VALUES ($1, $2, $2, $3, $3,
              'Customer updated common items for tent')
    `, [bookingId, booking.status, booking.payment_status]);

    await client.query('COMMIT');

    // 7. Send notifications (outside transaction)
    const oldTotal = parseFloat(booking.old_total);
    const priceDifference = newTotal - oldTotal;
    const customerName = `${booking.first_name} ${booking.last_name}`.trim();

    try {
      const notificationData = {
        booking_id: bookingId,
        booking_code: booking.booking_code,
        customer_name: customerName,
        new_total: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(newTotal),
        old_total: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(oldTotal),
        price_difference: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.abs(priceDifference)),
      };

      await broadcastToAllowedRoles('glamping_menu_updated', notificationData, 'glamping');

      if (booking.zone_id) {
        await notifyGlampingOwnersOfZone(booking.zone_id, 'glamping_menu_updated', notificationData);
      }
    } catch (notificationError) {
      console.error('Failed to send common items update notifications:', notificationError);
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      tent_id: tentId,
      updated_total_amount: newTotal,
      balance_due: newBalanceDue,
      message: 'Common items updated successfully',
    });

  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error.message.includes('only allowed after deposit')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message.includes('Tent not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('within 24 hours')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('Error updating tent common items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update common items' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
