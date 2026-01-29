/**
 * Menu Selection Reminder Job
 *
 * Sends reminder emails to customers who haven't selected menu items
 * 48 hours before check-in (since menu editing is locked 24h before check-in)
 */

import pool from '@/lib/db';
import { sendGlampingMenuSelectionReminder } from '@/lib/email';
import { sendNotificationToCustomer } from '@/lib/notifications';
import type { CronJobFunction } from '../types';

export const menuSelectionReminder: CronJobFunction = async (params) => {
  const client = await pool.connect();

  const results = {
    remindersSent: 0,
    errors: [] as string[],
  };

  try {
    // Find bookings that:
    // 1. Check-in in next 48 hours (2 days)
    // 2. Status = confirmed
    // 3. Payment status = deposit_paid or fully_paid
    // 4. Have NO menu items selected
    // 5. Haven't received this reminder before
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
      WHERE b.check_in_date >= CURRENT_DATE
        AND b.check_in_date <= CURRENT_DATE + INTERVAL '2 days'
        AND b.status = 'confirmed'
        AND b.payment_status IN ('deposit_paid', 'fully_paid')
        AND NOT EXISTS (
          SELECT 1 FROM glamping_booking_menu_products gbmp
          WHERE gbmp.booking_id = b.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.template_slug = 'glamping-menu-selection-reminder'
            AND el.recipient_email = b.guest_email
            AND el.variables->>'booking_code' = b.booking_code
            AND el.status = 'sent'
        )
      ORDER BY b.check_in_date, b.created_at
    `;

    const bookings = await client.query(query);

    console.log(`🍽️  Sending menu selection reminders to ${bookings.rows.length} bookings...`);

    for (const booking of bookings.rows) {
      try {
        // Send email reminder
        await sendGlampingMenuSelectionReminder({
          customerEmail: booking.guest_email,
          customerName: `${booking.guest_first_name} ${booking.guest_last_name}`,
          bookingCode: booking.booking_code,
          propertyName: `${booking.zone_name} - ${booking.item_name}`,
          checkInDate: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
          checkInTime: booking.check_in_time || '14:00',
        });

        // Send in-app notification
        if (booking.customer_id) {
          await sendNotificationToCustomer(
            booking.customer_id,
            'menu_selection_reminder',
            {
              booking_code: booking.booking_code,
              check_in_date: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
              booking_id: booking.id,
            },
            'glamping'
          );
        }

        results.remindersSent++;
        console.log(`✅ Menu reminder sent for booking ${booking.booking_code}`);
      } catch (error: any) {
        const errorMsg = `Failed to send menu reminder for ${booking.booking_code}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    return {
      success: results.errors.length === 0 || results.remindersSent > 0,
      recordsProcessed: bookings.rows.length,
      recordsAffected: results.remindersSent,
      metadata: {
        remindersSent: results.remindersSent,
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
