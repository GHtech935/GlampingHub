/**
 * Menu Selection Reminder Job
 *
 * Sends reminder emails to customers who haven't selected menu items
 * Schedule: Daily at 9:00 AM
 *
 * NEW LOGIC:
 * - Day 3 before check-in: Send reminder #1 (glamping-menu-selection-reminder-day-3)
 * - Day 2 before check-in: Send reminder #2 (glamping-menu-selection-reminder-day-2)
 * - Day 1 before check-in: Send URGENT reminder #3 (glamping-menu-selection-reminder-day-1)
 *
 * Each day's reminder has a different template slug to track which reminders have been sent.
 */

import pool from '@/lib/db';
import { sendGlampingMenuSelectionReminder } from '@/lib/email';
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
  days_until_checkin: number;
}

export const menuSelectionReminder: CronJobFunction = async (params) => {
  const client = await pool.connect();

  const results = {
    remindersSent: 0,
    day3Sent: 0,
    day2Sent: 0,
    day1Sent: 0,
    errors: [] as string[],
  };

  try {
    // Find bookings that:
    // 1. Check-in in 1-3 days from now
    // 2. Status = confirmed
    // 3. Payment status = deposit_paid or fully_paid
    // 4. Have NO menu items selected
    // 5. Haven't received the specific day's reminder yet
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
        z.name as zone_name,
        (b.check_in_date - CURRENT_DATE)::integer as days_until_checkin
      FROM glamping_bookings b
      JOIN glamping_booking_items bi ON b.id = bi.booking_id
      JOIN glamping_items i ON bi.item_id = i.id
      JOIN glamping_zones z ON i.zone_id = z.id
      WHERE b.check_in_date >= CURRENT_DATE + INTERVAL '1 day'
        AND b.check_in_date <= CURRENT_DATE + INTERVAL '3 days'
        AND b.status = 'confirmed'
        AND b.payment_status IN ('deposit_paid', 'fully_paid')
        AND NOT EXISTS (
          SELECT 1 FROM glamping_booking_menu_products gbmp
          WHERE gbmp.booking_id = b.id
        )
      ORDER BY b.check_in_date, b.created_at
    `;

    const bookingsResult = await client.query<BookingRow>(query);
    const bookings = bookingsResult.rows;

    console.log(`🍽️  Found ${bookings.length} bookings without menu selection...`);

    for (const booking of bookings) {
      const daysUntil = booking.days_until_checkin;

      // Determine template slug based on days until check-in
      let templateSlug: string;
      if (daysUntil === 3) {
        templateSlug = 'glamping-menu-selection-reminder-day-3';
      } else if (daysUntil === 2) {
        templateSlug = 'glamping-menu-selection-reminder-day-2';
      } else if (daysUntil === 1) {
        templateSlug = 'glamping-menu-selection-reminder-day-1';
      } else {
        // Skip if days_until_checkin is not 1, 2, or 3
        continue;
      }

      // Check if this specific day's reminder was already sent
      const checkQuery = `
        SELECT 1 FROM email_logs el
        WHERE el.metadata->>'template_slug' = $1
          AND el.recipient_email = $2
          AND el.metadata->'variables'->>'booking_code' = $3
          AND el.status = 'sent'
      `;
      const alreadySent = await client.query(checkQuery, [
        templateSlug,
        booking.guest_email,
        booking.booking_code,
      ]);

      if (alreadySent.rows.length > 0) {
        console.log(`⏭️  Day ${daysUntil} reminder already sent for ${booking.booking_code}, skipping...`);
        continue;
      }

      try {
        // Send email reminder with day-specific template
        await sendGlampingMenuSelectionReminder({
          customerEmail: booking.guest_email,
          customerName: `${booking.guest_first_name} ${booking.guest_last_name}`,
          bookingCode: booking.booking_code,
          propertyName: `${booking.zone_name} - ${booking.item_name}`,
          checkInDate: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
          checkInTime: booking.check_in_time || '14:00',
          daysUntilCheckin: daysUntil,
          glampingBookingId: booking.id,
        });

        // Send in-app notification (using existing menu_selection_reminder type)
        if (booking.customer_id) {
          await sendNotificationToCustomer(
            booking.customer_id,
            'menu_selection_reminder',
            {
              booking_code: booking.booking_code,
              check_in_date: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
              booking_id: booking.id,
              days_until_checkin: daysUntil,
            },
            'glamping'
          );
        }

        results.remindersSent++;
        if (daysUntil === 3) results.day3Sent++;
        if (daysUntil === 2) results.day2Sent++;
        if (daysUntil === 1) results.day1Sent++;

        const urgency = daysUntil === 1 ? '🚨 URGENT' : daysUntil === 2 ? '⚠️' : '📧';
        console.log(`✅ ${urgency} Day ${daysUntil} menu reminder sent for booking ${booking.booking_code}`);
      } catch (error: any) {
        const errorMsg = `Failed to send day ${daysUntil} menu reminder for ${booking.booking_code}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`📊 Menu Selection Reminder Summary:`);
    console.log(`   - Day 3 reminders sent: ${results.day3Sent}`);
    console.log(`   - Day 2 reminders sent: ${results.day2Sent}`);
    console.log(`   - Day 1 (URGENT) reminders sent: ${results.day1Sent}`);
    console.log(`   - Total sent: ${results.remindersSent}`);
    console.log(`   - Errors: ${results.errors.length}`);

    return {
      success: results.errors.length === 0 || results.remindersSent > 0,
      recordsProcessed: bookings.length,
      recordsAffected: results.remindersSent,
      metadata: {
        remindersSent: results.remindersSent,
        day3Sent: results.day3Sent,
        day2Sent: results.day2Sent,
        day1Sent: results.day1Sent,
        errors: results.errors,
      },
    };
  } catch (error: any) {
    console.error('Menu selection reminder error:', error);
    return {
      success: false,
      error: error.message,
      metadata: results,
    };
  } finally {
    client.release();
  }
};
