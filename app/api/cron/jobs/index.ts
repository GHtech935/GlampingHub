/**
 * Cron Jobs Registry
 *
 * Registers all cron jobs with the scheduler
 */

import { scheduler } from '../scheduler';
import { cancelExpiredBookings } from './cancel-expired-bookings';
import { emailAutomation } from './email-automation';
import { menuSelectionReminder } from './menu-selection-reminder';

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
  // Runs every 2 hours to remind customers to select menu items
  scheduler.registerJob({
    config: {
      name: 'Menu Selection Reminder',
      slug: 'menu-selection-reminder',
      description: 'Send reminder emails to customers who haven\'t selected menu items 48h before check-in',
      cronExpression: '0 */2 * * *', // Every 2 hours
      timezone: 'Asia/Ho_Chi_Minh',
      isActive: true,
    },
    handler: menuSelectionReminder,
  });

  console.log('✅ All cron jobs registered');
}
