import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  sendGlampingMenuUpdateConfirmation,
  sendGlampingMenuUpdateNotificationToStaff,
} from '@/lib/email';
import {
  broadcastToAllowedRoles,
  notifyGlampingOwnersOfZone,
} from '@/lib/notifications';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; tentId: string }> }
) {
  const client = await pool.connect();

  try {
    const { menuProducts } = await request.json();
    const { code: bookingCode, tentId } = await params;

    await client.query('BEGIN');

    // 1. Get booking and tent details, validate permissions
    const bookingResult = await client.query(`
      SELECT
        b.id,
        b.booking_code,
        b.check_in_date,
        b.status,
        b.payment_status,
        b.discount_amount,
        b.total_amount as old_total,
        b.balance_due as old_balance_due,
        c.email as customer_email,
        c.first_name,
        c.last_name,
        bt.id as tent_id,
        bt.item_id,
        bt.check_in_date as tent_check_in,
        bt.nights as tent_nights,
        gi.zone_id
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id AND bt.id = $2
      LEFT JOIN glamping_items gi ON bt.item_id = gi.id
      WHERE b.booking_code = $1
      FOR UPDATE OF b
    `, [bookingCode, tentId]);

    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = bookingResult.rows[0];

    if (!booking.tent_id) {
      throw new Error('Tent not found in this booking');
    }

    const bookingId = booking.id;

    // Check canEditMenu permission: payment_status must be deposit_paid or fully_paid
    if (!['deposit_paid', 'fully_paid'].includes(booking.payment_status)) {
      throw new Error('Menu editing is only allowed after deposit or full payment');
    }

    // 2. Get current accommodation cost for the entire booking
    const accommResult = await client.query(`
      SELECT SUM(total_price) as accommodation_cost
      FROM glamping_booking_items
      WHERE booking_id = $1
    `, [bookingId]);

    const accommodationCost = parseFloat(accommResult.rows[0].accommodation_cost) || 0;

    // 3. Delete existing menu products for this specific tent
    await client.query(`
      DELETE FROM glamping_booking_menu_products
      WHERE booking_id = $1 AND booking_tent_id = $2
    `, [bookingId, tentId]);

    // 4. Insert new menu products with booking_tent_id
    let tentMenuTotal = 0;

    for (const item of menuProducts) {
      if (item.quantity > 0) {
        await client.query(`
          INSERT INTO glamping_booking_menu_products
            (booking_id, booking_tent_id, menu_item_id, quantity, unit_price, serving_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          bookingId,
          tentId,
          item.id,
          item.quantity,
          item.price,
          item.servingDate || null,
        ]);

        tentMenuTotal += item.price * item.quantity;
      }
    }

    // 5. Recalculate total menu cost (all tents + shared)
    const totalMenuResult = await client.query(`
      SELECT COALESCE(SUM(unit_price * quantity), 0) as total_menu
      FROM glamping_booking_menu_products
      WHERE booking_id = $1
    `, [bookingId]);

    const totalMenuCost = parseFloat(totalMenuResult.rows[0].total_menu) || 0;

    // 6. Calculate new totals
    const discountAmount = parseFloat(booking.discount_amount) || 0;
    const newSubtotal = accommodationCost + totalMenuCost - discountAmount;

    // 7. Update booking subtotal (total_amount is GENERATED column)
    await client.query(`
      UPDATE glamping_bookings
      SET
        subtotal_amount = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [newSubtotal, bookingId]);

    // Get the updated total_amount (from generated column)
    const updatedBookingResult = await client.query(`
      SELECT total_amount
      FROM glamping_bookings
      WHERE id = $1
    `, [bookingId]);

    const newTotal = parseFloat(updatedBookingResult.rows[0].total_amount);
    const oldTotal = parseFloat(booking.old_total);
    const priceDifference = newTotal - oldTotal;

    // 8. Calculate payment adjustment
    let newBalanceDue = parseFloat(booking.old_balance_due) || 0;

    if (priceDifference > 0 && booking.payment_status === 'fully_paid') {
      // Fully paid booking with price increase → add to balance_due
      newBalanceDue = priceDifference;

      await client.query(`
        UPDATE glamping_bookings
        SET balance_due = $1
        WHERE id = $2
      `, [newBalanceDue, bookingId]);
    } else if (priceDifference > 0 && booking.payment_status === 'deposit_paid') {
      // Deposit paid booking with price increase → add to balance_due
      newBalanceDue += priceDifference;

      await client.query(`
        UPDATE glamping_bookings
        SET balance_due = balance_due + $1
        WHERE id = $2
      `, [priceDifference, bookingId]);
    } else if (priceDifference < 0) {
      // Price decrease → reduce balance_due (but not below 0)
      const reduction = Math.abs(priceDifference);
      const currentBalance = parseFloat(booking.old_balance_due) || 0;
      newBalanceDue = Math.max(0, currentBalance - reduction);

      await client.query(`
        UPDATE glamping_bookings
        SET balance_due = $1
        WHERE id = $2
      `, [newBalanceDue, bookingId]);
    }

    // 9. Create status history
    await client.query(`
      INSERT INTO glamping_booking_status_history
        (booking_id, previous_status, new_status,
         previous_payment_status, new_payment_status, reason)
      VALUES ($1, $2, $2, $3, $3,
              'Customer updated menu products for tent')
    `, [bookingId, booking.status, booking.payment_status]);

    await client.query('COMMIT');

    // 10. Send email notifications (outside transaction)
    const customerName = `${booking.first_name} ${booking.last_name}`.trim();

    try {
      // Email to customer
      await sendGlampingMenuUpdateConfirmation({
        customerEmail: booking.customer_email,
        customerName,
        bookingCode: booking.booking_code,
        oldTotal,
        newTotal,
        priceDifference,
        glampingBookingId: bookingId,
      });

      // Email to staff
      await sendGlampingMenuUpdateNotificationToStaff({
        bookingCode: booking.booking_code,
        customerName,
        oldTotal,
        newTotal,
        priceDifference,
        requiresPayment: newBalanceDue > 0,
        glampingBookingId: bookingId,
      });
    } catch (emailError) {
      console.error('Failed to send menu update emails:', emailError);
      // Don't fail the request if email fails
    }

    // 11. Create in-app notifications for admin/staff and zone owners
    try {
      const notificationData = {
        booking_id: bookingId,
        booking_code: booking.booking_code,
        customer_name: customerName,
        new_total: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(newTotal),
        old_total: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(oldTotal),
        price_difference: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.abs(priceDifference)),
      };

      // Notify admin and operations staff
      await broadcastToAllowedRoles('glamping_menu_updated', notificationData, 'glamping');

      // Notify glamping owners of the zone
      if (booking.zone_id) {
        await notifyGlampingOwnersOfZone(booking.zone_id, 'glamping_menu_updated', notificationData);
      }
    } catch (notificationError) {
      console.error('Failed to send menu update notifications:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      tent_id: tentId,
      tent_menu_total: tentMenuTotal,
      updated_menu_total: totalMenuCost,
      updated_subtotal: newSubtotal,
      updated_total_amount: newTotal,
      balance_due: newBalanceDue,
      message: 'Menu updated successfully',
    });

  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error.message.includes('only allowed after deposit')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message.includes('Tent not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Error updating tent menu products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update menu' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
