/**
 * Cron Jobs Registry
 *
 * Registers all cron jobs with the scheduler
 */

import { scheduler } from '../scheduler';
import { cancelExpiredBookings } from './cancel-expired-bookings';
import { emailAutomation } from './email-automation';
import { menuSelectionReminder } from './menu-selection-reminder';
import { tripReminder } from './trip-reminder';

export function registerAllJobs(): void {
  console.log('📝 Registering all cron jobs...');

  // Job 1: Cancel Expired Bookings
  // Runs every 5 minutes to check for expired pending payments
  scheduler.registerJob({
    config: {
      name: 'Cancel Expired Glamping Bookings',
      slug: 'cancel-expired-bookings',
      description: 'Automatically cancel glamping bookings in pending_payment status after 30 minutes',
      cronExpression: '*/5 * * * *', // Every 5 minutes
      timezone: 'Asia/Ho_Chi_Minh',
      isActive: true,
    },
    handler: cancelExpiredBookings,
  });

  // Job 2: Email Automation
  // Runs daily at 9:00 AM to send pre-arrival and post-stay emails
  scheduler.registerJob({
    config: {
      name: 'Glamping Email Automation',
      slug: 'email-automation',
      description: 'Send glamping pre-arrival reminders (2 days before) and post-stay thank you emails (1 day after)',
      cronExpression: '0 9 * * *', // Daily at 9:00 AM
      timezone: 'Asia/Ho_Chi_Minh',
      isActive: true,
    },
    handler: emailAutomation,
  });

  // Job 3: Menu Selection Reminder
  // Runs daily at 9:00 AM to remind customers who HAVEN'T selected menu
  // Sends on day 3, 2, 1 before check-in with increasing urgency
  scheduler.registerJob({
    config: {
      name: 'Menu Selection Reminder',
      slug: 'menu-selection-reminder',
      description: 'Send reminder emails to customers who haven\'t selected menu items (day 3, 2, 1 before check-in)',
      cronExpression: '0 9 * * *', // Daily at 9:00 AM
      timezone: 'Asia/Ho_Chi_Minh',
      isActive: true,
    },
    handler: menuSelectionReminder,
  });

  // Job 4: Trip Reminder (24h before check-in)
  // Runs daily at 9:00 AM to send 24h reminder to customers who HAVE selected menu
  scheduler.registerJob({
    config: {
      name: 'Trip Reminder (24h)',
      slug: 'trip-reminder',
      description: 'Send 24h trip reminder emails to customers who have selected menu items (1 day before check-in)',
      cronExpression: '0 9 * * *', // Daily at 9:00 AM
      timezone: 'Asia/Ho_Chi_Minh',
      isActive: true,
    },
    handler: tripReminder,
  });

  console.log('✅ All cron jobs registered');
}
