/**
 * Glamping Email Automation Job
 *
 * Sends automated emails:
 * 1. Pre-arrival reminders (2 days before check-in)
 * 2. Post-stay thank you emails (1 day after check-out)
 */

import pool from '@/lib/db';
import { sendGlampingPreArrivalReminder, sendGlampingPostStayThankYou } from '@/lib/email';
import { sendNotificationToCustomer } from '@/lib/notifications';
import type { CronJobFunction } from '../types';

export const emailAutomation: CronJobFunction = async (params) => {
  const client = await pool.connect();

  const results = {
    preArrivalEmailsSent: 0,
    postStayEmailsSent: 0,
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

    // ========== POST-STAY THANK YOU EMAILS ==========
    // Send 1 day after check-out
    const postStayQuery = `
      SELECT DISTINCT
        b.id,
        b.booking_code,
        b.customer_id,
        b.guest_email,
        b.guest_first_name,
        b.guest_last_name,
        b.check_out_date,
        i.name as item_name,
        z.name as zone_name
      FROM glamping_bookings b
      JOIN glamping_booking_items bi ON b.id = bi.booking_id
      JOIN glamping_items i ON bi.item_id = i.id
      JOIN glamping_zones z ON i.zone_id = z.id
      WHERE b.check_out_date = CURRENT_DATE - INTERVAL '1 day'
        AND b.status = 'confirmed'
        AND b.payment_status IN ('deposit_paid', 'fully_paid')
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE el.template_slug = 'glamping-post-stay-thank-you'
            AND el.recipient_email = b.guest_email
            AND el.variables->>'booking_code' = b.booking_code
            AND el.status = 'sent'
        )
      ORDER BY b.check_out_date, b.created_at
    `;

    const postStayBookings = await client.query(postStayQuery);

    console.log(`📧 Sending post-stay thank you to ${postStayBookings.rows.length} bookings...`);

    for (const booking of postStayBookings.rows) {
      try {
        // Send post-stay thank you email
        await sendGlampingPostStayThankYou({
          customerEmail: booking.guest_email,
          customerName: `${booking.guest_first_name} ${booking.guest_last_name}`,
          bookingCode: booking.booking_code,
          propertyName: `${booking.zone_name} - ${booking.item_name}`,
        });

        // Send in-app notification (review request)
        if (booking.customer_id) {
          await sendNotificationToCustomer(
            booking.customer_id,
            'review_request',
            {
              booking_code: booking.booking_code,
              booking_id: booking.id,
            },
            'glamping'
          );
        }

        results.postStayEmailsSent++;
        console.log(`✅ Post-stay email sent for booking ${booking.booking_code}`);
      } catch (error: any) {
        const errorMsg = `Failed to send post-stay email for ${booking.booking_code}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    return {
      success: results.errors.length === 0 || (results.preArrivalEmailsSent + results.postStayEmailsSent) > 0,
      recordsProcessed: preArrivalBookings.rows.length + postStayBookings.rows.length,
      recordsAffected: results.preArrivalEmailsSent + results.postStayEmailsSent,
      metadata: {
        preArrivalEmailsSent: results.preArrivalEmailsSent,
        postStayEmailsSent: results.postStayEmailsSent,
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
