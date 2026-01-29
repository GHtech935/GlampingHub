/**
 * Cron Job Scheduler
 *
 * Singleton scheduler that manages all cron jobs using node-cron
 */

import cron, { ScheduledTask } from 'node-cron';
import type { CronJobRegistration } from './types';
import { executeJobWithLockAndLog } from './utils';

class CronScheduler {
  private jobs: Map<string, { registration: CronJobRegistration; task?: ScheduledTask }> = new Map();
  private isInitialized = false;

  /**
   * Register a cron job
   */
  registerJob(registration: CronJobRegistration): void {
    const { config } = registration;

    if (this.jobs.has(config.slug)) {
      console.warn(`⚠️  Job ${config.slug} is already registered, skipping`);
      return;
    }

    this.jobs.set(config.slug, { registration });
    console.log(`📝 Registered cron job: ${config.slug} (${config.cronExpression})`);
  }

  /**
   * Start all registered cron jobs
   */
  startAll(): void {
    if (this.isInitialized) {
      console.warn('⚠️  Scheduler is already initialized');
      return;
    }

    console.log(`🚀 Starting cron scheduler with ${this.jobs.size} jobs...`);

    for (const [slug, { registration }] of this.jobs) {
      this.startJob(slug);
    }

    this.isInitialized = true;
    console.log('✅ Cron scheduler initialized');
  }

  /**
   * Start a specific job
   */
  private startJob(slug: string): void {
    const jobData = this.jobs.get(slug);
    if (!jobData) {
      console.error(`❌ Job ${slug} not found`);
      return;
    }

    const { registration } = jobData;
    const { config, handler } = registration;

    if (!config.isActive) {
      console.log(`⏭️  Job ${slug} is inactive, skipping`);
      return;
    }

    // Validate cron expression
    if (!cron.validate(config.cronExpression)) {
      console.error(`❌ Invalid cron expression for job ${slug}: ${config.cronExpression}`);
      return;
    }

    // Create and start the cron task
    const task = cron.schedule(
      config.cronExpression,
      async () => {
        await executeJobWithLockAndLog(slug, handler);
      },
      {
        timezone: config.timezone || 'Asia/Ho_Chi_Minh',
      }
    );

    jobData.task = task;
    console.log(`✅ Started cron job: ${config.name} (${config.cronExpression})`);
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    console.log('🛑 Stopping all cron jobs...');

    for (const [slug, { task }] of this.jobs) {
      if (task) {
        task.stop();
        console.log(`✅ Stopped job: ${slug}`);
      }
    }

    this.isInitialized = false;
    console.log('✅ Cron scheduler stopped');
  }

  /**
   * Stop a specific job
   */
  stopJob(slug: string): void {
    const jobData = this.jobs.get(slug);
    if (!jobData || !jobData.task) {
      console.error(`❌ Job ${slug} not found or not running`);
      return;
    }

    jobData.task.stop();
    jobData.task = undefined;
    console.log(`✅ Stopped job: ${slug}`);
  }

  /**
   * Manually trigger a job (bypass schedule)
   */
  async triggerJob(slug: string): Promise<void> {
    const jobData = this.jobs.get(slug);
    if (!jobData) {
      throw new Error(`Job ${slug} not found`);
    }

    const { registration } = jobData;
    console.log(`🔄 Manually triggering job: ${slug}`);

    await executeJobWithLockAndLog(slug, registration.handler);
  }

  /**
   * Get list of all registered jobs
   */
  getJobs(): Array<{ slug: string; config: CronJobRegistration['config']; isRunning: boolean }> {
    return Array.from(this.jobs.entries()).map(([slug, { registration, task }]) => ({
      slug,
      config: registration.config,
      isRunning: !!task,
    }));
  }

  /**
   * Check if scheduler is initialized
   */
  isRunning(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const scheduler = new CronScheduler();
