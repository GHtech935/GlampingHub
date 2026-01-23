import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  sendGlampingMenuUpdateConfirmation,
  sendGlampingMenuUpdateNotificationToStaff,
} from '@/lib/email';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { menuProducts } = await request.json();
    const { id: bookingId } = await params;

    await client.query('BEGIN');

    // 1. Validate 24-hour restriction and get booking details
    const bookingResult = await client.query(`
      SELECT
        b.id, b.booking_code, b.check_in_date, b.status,
        b.payment_status, b.discount_amount, b.total_amount as old_total,
        b.balance_due as old_balance_due,
        c.email as customer_email, c.first_name, c.last_name
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1
      FOR UPDATE
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = bookingResult.rows[0];
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const msUntilCheckIn = checkInDate.getTime() - now.getTime();
    const hoursUntilCheckIn = msUntilCheckIn / (1000 * 60 * 60);

    if (hoursUntilCheckIn < 24) {
      throw new Error('Menu editing not allowed within 24 hours of check-in');
    }

    if (booking.status !== 'confirmed') {
      throw new Error('Can only edit menu for confirmed bookings');
    }

    // 2. Get accommodation cost
    const accommResult = await client.query(`
      SELECT SUM(total_price) as accommodation_cost
      FROM glamping_booking_items
      WHERE booking_id = $1
    `, [bookingId]);

    const accommodationCost = parseFloat(accommResult.rows[0].accommodation_cost) || 0;

    // 3. Delete existing menu products
    await client.query(`
      DELETE FROM glamping_booking_menu_products
      WHERE booking_id = $1
    `, [bookingId]);

    // 4. Insert new menu products
    let menuTotal = 0;

    for (const item of menuProducts) {
      if (item.quantity > 0) {
        await client.query(`
          INSERT INTO glamping_booking_menu_products
            (booking_id, menu_item_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `, [bookingId, item.id, item.quantity, item.price]);

        menuTotal += item.price * item.quantity;
      }
    }

    // 5. Calculate new totals
    const discountAmount = parseFloat(booking.discount_amount) || 0;
    const newSubtotal = accommodationCost + menuTotal - discountAmount;
    // Note: total_amount is a GENERATED column, so we don't set it directly
    // It will be automatically calculated from subtotal + tax

    // 6. Get the new total_amount after update (from generated column)
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

    // 7. Calculate payment adjustment
    let newBalanceDue = parseFloat(booking.old_balance_due) || 0;

    if (priceDifference > 0 && booking.payment_status === 'paid') {
      // Paid booking with price increase → add to balance_due
      newBalanceDue = priceDifference;

      await client.query(`
        UPDATE glamping_bookings
        SET balance_due = $1
        WHERE id = $2
      `, [newBalanceDue, bookingId]);
    } else if (priceDifference > 0 && booking.payment_status === 'pending') {
      // Pending booking with price increase → add to balance_due
      newBalanceDue += priceDifference;

      await client.query(`
        UPDATE glamping_bookings
        SET balance_due = balance_due + $1
        WHERE id = $2
      `, [priceDifference, bookingId]);
    }

    // 8. Create status history
    await client.query(`
      INSERT INTO glamping_booking_status_history
        (booking_id, previous_status, new_status,
         previous_payment_status, new_payment_status, reason)
      VALUES ($1, 'confirmed', 'confirmed', $2, $2,
              'Customer updated menu products')
    `, [bookingId, booking.payment_status]);

    await client.query('COMMIT');

    // 9. Send email notifications (outside transaction)
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
      console.error('⚠️ Failed to send menu update emails:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      updated_menu_total: menuTotal,
      updated_subtotal: newSubtotal,
      updated_total_amount: newTotal,
      balance_due: newBalanceDue,
      message: 'Menu updated successfully',
    });

  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error.message.includes('24 hours')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message.includes('only edit menu for confirmed bookings')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update menu' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
