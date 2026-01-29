/**
 * Cancel Expired Glamping Bookings Job
 *
 * Automatically cancels bookings in pending_payment status after 30 minutes
 * and frees up the calendar dates
 */

import pool from '@/lib/db';
import { sendNotificationToCustomer } from '@/lib/notifications';
import type { CronJobFunction } from '../types';

export const cancelExpiredBookings: CronJobFunction = async (params) => {
  const client = await pool.connect();

  const results = {
    bookingsCancelled: 0,
    calendarDatesFreed: 0,
    errors: [] as string[],
  };

  try {
    await client.query('BEGIN');

    // Find bookings to cancel:
    // 1. payment_status = 'pending'
    // 2. status = 'pending'
    // 3. created_at > 30 minutes ago
    // 4. payment_expires_at < now (if exists)
    const expiredBookingsQuery = `
      SELECT
        id,
        booking_code,
        customer_id,
        guest_email,
        guest_first_name,
        guest_last_name,
        check_in_date,
        check_out_date
      FROM glamping_bookings
      WHERE payment_status = 'pending'
        AND status = 'pending'
        AND created_at < NOW() - INTERVAL '30 minutes'
        AND (payment_expires_at IS NULL OR payment_expires_at < NOW())
      ORDER BY created_at ASC
      LIMIT 100
    `;

    const expiredBookings = await client.query(expiredBookingsQuery);

    console.log(`📋 Found ${expiredBookings.rows.length} expired bookings to cancel`);

    for (const booking of expiredBookings.rows) {
      try {
        // Update booking status
        await client.query(
          `UPDATE glamping_bookings
           SET status = 'cancelled',
               payment_status = 'expired',
               updated_at = NOW()
           WHERE id = $1`,
          [booking.id]
        );

        // Get all booking items to free up calendar dates
        const bookingItems = await client.query(
          `SELECT item_id, check_in_date, check_out_date
           FROM glamping_booking_items
           WHERE booking_id = $1`,
          [booking.id]
        );

        // Free up calendar dates for each item
        for (const item of bookingItems.rows) {
          const deleteResult = await client.query(
            `DELETE FROM glamping_availability_calendar
             WHERE item_id = $1
               AND booking_id = $2
               AND date >= $3
               AND date < $4`,
            [item.item_id, booking.id, item.check_in_date, item.check_out_date]
          );

          results.calendarDatesFreed += deleteResult.rowCount || 0;
        }

        // Send notification to customer if they have an account
        if (booking.customer_id) {
          try {
            await sendNotificationToCustomer(
              booking.customer_id,
              'booking_cancelled',
              {
                booking_code: booking.booking_code,
                reason: 'Payment not completed within 30 minutes',
                booking_id: booking.id,
              },
              'glamping'
            );
          } catch (notifError) {
            console.warn(`⚠️  Failed to send notification for booking ${booking.booking_code}:`, notifError);
            // Don't fail the whole process if notification fails
          }
        }

        results.bookingsCancelled++;
        console.log(`✅ Cancelled expired booking: ${booking.booking_code}`);
      } catch (error: any) {
        const errorMsg = `Failed to cancel booking ${booking.booking_code}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        // Continue processing other bookings
      }
    }

    await client.query('COMMIT');

    return {
      success: results.errors.length === 0 || results.bookingsCancelled > 0,
      recordsProcessed: expiredBookings.rows.length,
      recordsAffected: results.bookingsCancelled,
      metadata: {
        bookingsCancelled: results.bookingsCancelled,
        calendarDatesFreed: results.calendarDatesFreed,
        errors: results.errors,
      },
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Cancel expired bookings error:', error);
    return {
      success: false,
      error: error.message,
      metadata: results,
    };
  } finally {
    client.release();
  }
};
