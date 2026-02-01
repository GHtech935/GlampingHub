/**
 * Cron Job System - Utility Functions
 *
 * Database operations, locking, logging, and helper functions for cron jobs
 */

import pool from '@/lib/db';
import type { CronJobConfig, CronJobResult, CronJobParams } from './types';

/**
 * Get cron job configuration from database
 */
export async function getCronJobConfig(jobSlug: string): Promise<CronJobConfig | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT name, slug, description, cron_expression, timezone, is_active
       FROM cron_jobs
       WHERE slug = $1`,
      [jobSlug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      name: row.name,
      slug: row.slug,
      description: row.description,
      cronExpression: row.cron_expression,
      timezone: row.timezone || 'Asia/Ho_Chi_Minh',
      isActive: row.is_active,
    };
  } finally {
    client.release();
  }
}

/**
 * Acquire lock for cron job execution
 * Returns the job ID if lock is acquired, null otherwise
 */
export async function acquireJobLock(jobSlug: string): Promise<string | null> {
  const client = await pool.connect();
  try {
    // Try to acquire lock by setting is_running = true
    // Only succeeds if job is not already running
    const result = await client.query(
      `UPDATE cron_jobs
       SET is_running = true,
           last_run_at = NOW()
       WHERE slug = $1
         AND is_running = false
         AND is_active = true
       RETURNING id`,
      [jobSlug]
    );

    if (result.rows.length === 0) {
      return null; // Lock not acquired
    }

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Release lock for cron job execution
 */
export async function releaseJobLock(jobSlug: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE cron_jobs
       SET is_running = false
       WHERE slug = $1`,
      [jobSlug]
    );
  } finally {
    client.release();
  }
}

/**
 * Create a log entry for cron job execution start
 */
export async function createJobLog(jobSlug: string): Promise<string> {
  const client = await pool.connect();
  try {
    // Get job info first to include job_id and job_name
    const jobResult = await client.query(
      `SELECT id, name FROM cron_jobs WHERE slug = $1`,
      [jobSlug]
    );

    if (jobResult.rows.length === 0) {
      throw new Error(`Job not found: ${jobSlug}`);
    }

    const job = jobResult.rows[0];

    const result = await client.query(
      `INSERT INTO cron_job_logs (job_id, job_name, job_slug, status, started_at)
       VALUES ($1, $2, $3, 'running', NOW())
       RETURNING id`,
      [job.id, job.name, jobSlug]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Update log entry when job completes
 */
export async function completeJobLog(
  logId: string,
  result: CronJobResult
): Promise<void> {
  const client = await pool.connect();
  try {
    const status = result.success ? 'success' : 'error';
    const completedAt = new Date();

    await client.query(
      `UPDATE cron_job_logs
       SET status = $1,
           completed_at = $2,
           execution_time_ms = EXTRACT(EPOCH FROM ($2 - started_at)) * 1000,
           records_processed = $3,
           records_affected = $4,
           error_message = $5,
           metadata = $6
       WHERE id = $7`,
      [
        status,
        completedAt,
        result.recordsProcessed || null,
        result.recordsAffected || null,
        result.error || null,
        result.metadata ? JSON.stringify(result.metadata) : null,
        logId,
      ]
    );
  } finally {
    client.release();
  }
}

/**
 * Wrapper function to execute a cron job with proper locking and logging
 */
export async function executeJobWithLockAndLog(
  jobSlug: string,
  handler: (params: CronJobParams) => Promise<CronJobResult>
): Promise<CronJobResult> {
  // Try to acquire lock
  const jobId = await acquireJobLock(jobSlug);
  if (!jobId) {
    console.log(`⏭️  Job ${jobSlug} is already running or inactive, skipping`);
    return {
      success: false,
      error: 'Job is already running or inactive',
    };
  }

  // Create log entry
  const logId = await createJobLog(jobSlug);
  console.log(`🚀 Starting cron job: ${jobSlug} (log ID: ${logId})`);

  let result: CronJobResult = {
    success: false,
    error: 'Job did not complete',
  };
  try {
    // Execute the job handler
    result = await handler({ jobId, jobSlug, logId });

    console.log(
      `✅ Job ${jobSlug} completed successfully:`,
      `Processed: ${result.recordsProcessed || 0},`,
      `Affected: ${result.recordsAffected || 0}`
    );
  } catch (error: any) {
    console.error(`❌ Job ${jobSlug} failed:`, error);
    result = {
      success: false,
      error: error.message || 'Unknown error',
    };
  } finally {
    // Complete log entry
    await completeJobLog(logId, result);

    // Release lock
    await releaseJobLock(jobSlug);
  }

  return result;
}

/**
 * Get job statistics for admin dashboard
 */
export async function getJobStats(): Promise<{
  totalJobs: number;
  activeJobs: number;
  executionsLast24h: number;
  failedExecutions: number;
}> {
  const client = await pool.connect();
  try {
    const statsQuery = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM cron_jobs) as total_jobs,
        (SELECT COUNT(*) FROM cron_jobs WHERE is_active = true) as active_jobs,
        (SELECT COUNT(*) FROM cron_job_logs WHERE started_at > NOW() - INTERVAL '24 hours') as executions_24h,
        (SELECT COUNT(*) FROM cron_job_logs WHERE status = 'error' AND started_at > NOW() - INTERVAL '24 hours') as failed_24h
    `);

    const stats = statsQuery.rows[0];
    return {
      totalJobs: parseInt(stats.total_jobs, 10),
      activeJobs: parseInt(stats.active_jobs, 10),
      executionsLast24h: parseInt(stats.executions_24h, 10),
      failedExecutions: parseInt(stats.failed_24h, 10),
    };
  } finally {
    client.release();
  }
}

/**
 * Format cron expression for human-readable display
 */
export function formatCronExpression(expression: string): string {
  const parts = expression.split(' ');
  if (parts.length < 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  if (expression === '*/5 * * * *') return 'Every 5 minutes';
  if (expression === '0 */2 * * *') return 'Every 2 hours';
  if (expression === '0 9 * * *') return 'Daily at 9:00 AM';
  if (expression === '0 0 * * *') return 'Daily at midnight';
  if (expression === '0 0 * * 0') return 'Weekly on Sunday';

  // Generic format
  return expression;
}
