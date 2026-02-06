/**
 * Glamping Email Automation Job
 *
 * Sends automated emails:
 * 1. Pre-arrival reminders (2 days before check-in)
 *
 * Note: Post-stay thank you emails are now sent immediately at checkout
 * (see /api/admin/glamping/bookings/[id]/route.ts PUT handler)
 */

import pool from '@/lib/db';
import { sendGlampingPreArrivalReminder } from '@/lib/email';
import { sendNotificationToCustomer } from '@/lib/notifications';
import type { CronJobFunction } from '../types';

export const emailAutomation: CronJobFunction = async (params) => {
  const client = await pool.connect();

  const results = {
    preArrivalEmailsSent: 0,
    errors: [] as string[],
  };

  try {
    // ========== PRE-ARRIVAL REMINDERS ==========
    // Send 2 days before check-in
    const preArrivalQuery = `
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
      WHERE b.check_in_date = CURRENT_DATE + INTERVAL '2 days'
        AND b.status = 'confirmed'
        AND b.payment_status IN ('deposit_paid', 'fully_paid')
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.template_slug = 'glamping-pre-arrival-reminder'
            AND el.recipient_email = b.guest_email
            AND el.variables->>'booking_code' = b.booking_code
            AND el.status = 'sent'
        )
      ORDER BY b.check_in_date, b.created_at
    `;

    const preArrivalBookings = await client.query(preArrivalQuery);

    console.log(`📧 Sending pre-arrival reminders to ${preArrivalBookings.rows.length} bookings...`);

    for (const booking of preArrivalBookings.rows) {
      try {
        // Send pre-arrival email
        await sendGlampingPreArrivalReminder({
          customerEmail: booking.guest_email,
          customerName: `${booking.guest_first_name} ${booking.guest_last_name}`,
          bookingCode: booking.booking_code,
          propertyName: `${booking.zone_name} - ${booking.item_name}`,
          checkInDate: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
          checkInTime: booking.check_in_time || '14:00',
          glampingBookingId: booking.id,
        });

        // Send in-app notification
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

        results.preArrivalEmailsSent++;
        console.log(`✅ Pre-arrival email sent for booking ${booking.booking_code}`);
      } catch (error: any) {
        const errorMsg = `Failed to send pre-arrival email for ${booking.booking_code}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    return {
      success: results.errors.length === 0 || results.preArrivalEmailsSent > 0,
      recordsProcessed: preArrivalBookings.rows.length,
      recordsAffected: results.preArrivalEmailsSent,
      metadata: {
        preArrivalEmailsSent: results.preArrivalEmailsSent,
        errors: results.errors,
      },
    };
  } catch (error: any) {
    console.error('Email automation error:', error);
    return {
      success: false,
      error: error.message,
      metadata: results,
    };
  } finally {
    client.release();
  }
};
