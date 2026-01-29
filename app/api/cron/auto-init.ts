/**
 * Auto-initialize cron scheduler on application startup
 *
 * This file is automatically executed when the cron module is imported
 * Only runs in production when ENABLE_CRON_SCHEDULER environment variable is set to 'true'
 */

import { scheduler } from './scheduler';
import { registerAllJobs } from './jobs';

let isInitialized = false;

/**
 * Initialize the cron scheduler
 * Safe to call multiple times - will only initialize once
 */
export function initScheduler(): void {
  if (isInitialized) {
    console.log('⏭️  Cron scheduler already initialized');
    return;
  }

  // Only auto-initialize in production when explicitly enabled
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ENABLE_CRON_SCHEDULER === 'true'
  ) {
    console.log('🚀 Auto-initializing cron scheduler in production...');

    try {
      // Register all jobs
      registerAllJobs();

      // Start the scheduler
      scheduler.startAll();

      isInitialized = true;
      console.log('✅ Cron scheduler auto-initialized successfully');
    } catch (error) {
      console.error('❌ Failed to auto-initialize cron scheduler:', error);
    }
  } else {
    console.log('⏭️  Cron scheduler auto-initialization skipped (not in production or not enabled)');
  }
}

// Auto-initialize when this module is imported
initScheduler();
