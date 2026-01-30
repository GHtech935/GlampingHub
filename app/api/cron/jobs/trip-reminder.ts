/**
 * Trip Reminder Job
 *
 * Sends 24h reminder emails to customers who HAVE selected menu items
 * Schedule: Daily at 9:00 AM
 *
 * This is sent to customers who already chose their menu, reminding them
 * about their upcoming trip with a positive, excited tone.
 *
 * Customers who haven't selected menu will receive the URGENT menu reminder
 * instead (from menu-selection-reminder job).
 */

import pool from '@/lib/db';
import { sendGlampingTripReminder } from '@/lib/email';
import { sendNotificationToCustomer } from '@/lib/notifications';
import type { CronJobFunction } from '../types';

interface BookingRow {
  id: string;
  booking_code: string;
  customer_id: string | null;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  check_in_date: string;
  check_in_time: string | null;
  item_name: string;
  zone_name: string;
}

export const tripReminder: CronJobFunction = async (params) => {
  const client = await pool.connect();

  const results = {
    remindersSent: 0,
    errors: [] as string[],
  };

  try {
    // Find bookings that:
    // 1. Check-in is tomorrow (1 day away)
    // 2. Status = confirmed
    // 3. Payment status = deposit_paid or fully_paid
    // 4. HAVE menu items selected (EXISTS instead of NOT EXISTS)
    // 5. Haven't received this trip reminder before
    const query = `
      SELECT DISTINCT
        b.id,
        b.booking_code,
        b.customer_id,
        b.guest_email,
        b.guest_first_name,
        b.guest_last_name,
        b.check_in_date,
        b.check_in_time,
        i.name as item_name,
        z.name as zone_name
      FROM glamping_bookings b
      JOIN glamping_booking_items bi ON b.id = bi.booking_id
      JOIN glamping_items i ON bi.item_id = i.id
      JOIN glamping_zones z ON i.zone_id = z.id
      WHERE b.check_in_date = CURRENT_DATE + INTERVAL '1 day'
        AND b.status = 'confirmed'
        AND b.payment_status IN ('deposit_paid', 'fully_paid')
        AND EXISTS (
          SELECT 1 FROM glamping_booking_menu_products gbmp
          WHERE gbmp.booking_id = b.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.metadata->>'template_slug' = 'glamping-trip-reminder'
            AND el.recipient_email = b.guest_email
            AND el.metadata->'variables'->>'booking_code' = b.booking_code
            AND el.status = 'sent'
        )
      ORDER BY b.check_in_date, b.created_at
    `;

    const bookingsResult = await client.query<BookingRow>(query);
    const bookings = bookingsResult.rows;

    console.log(`🏕️  Found ${bookings.length} bookings with menu selected for 24h trip reminder...`);

    for (const booking of bookings) {
      try {
        // Send trip reminder email
        await sendGlampingTripReminder({
          customerEmail: booking.guest_email,
          customerName: `${booking.guest_first_name} ${booking.guest_last_name}`,
          bookingCode: booking.booking_code,
          propertyName: `${booking.zone_name} - ${booking.item_name}`,
          checkInDate: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
          checkInTime: booking.check_in_time || '14:00',
          glampingBookingId: booking.id,
        });

        // Send in-app notification (using pre_arrival_reminder type for trip reminder)
        if (booking.customer_id) {
          await sendNotificationToCustomer(
            booking.customer_id,
            'pre_arrival_reminder',
            {
              booking_code: booking.booking_code,
              check_in_date: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
              booking_id: booking.id,
            },
            'glamping'
          );
        }

        results.remindersSent++;
        console.log(`✅ 🎉 Trip reminder sent for booking ${booking.booking_code} - See you tomorrow!`);
      } catch (error: any) {
        const errorMsg = `Failed to send trip reminder for ${booking.booking_code}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`📊 Trip Reminder Summary:`);
    console.log(`   - Reminders sent: ${results.remindersSent}`);
    console.log(`   - Errors: ${results.errors.length}`);

    return {
      success: results.errors.length === 0 || results.remindersSent > 0,
      recordsProcessed: bookings.length,
      recordsAffected: results.remindersSent,
      metadata: {
        remindersSent: results.remindersSent,
        errors: results.errors,
      },
    };
  } catch (error: any) {
    console.error('Trip reminder error:', error);
    return {
      success: false,
      error: error.message,
      metadata: results,
    };
  } finally {
    client.release();
  }
};
