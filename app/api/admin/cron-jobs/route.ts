/**
 * GET /api/admin/cron-jobs
 *
 * Admin endpoint to list all cron jobs and their execution logs
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getJobStats } from '@/app/api/cron/utils';

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    // Get statistics
    const stats = await getJobStats();

    // Get all cron jobs from database
    const jobsQuery = await client.query(`
      SELECT
        id,
        slug,
        name,
        description,
        cron_expression,
        is_active,
        is_running,
        last_run_at,
        created_at,
        updated_at
      FROM cron_jobs
      ORDER BY name ASC
    `);

    // Get recent logs (last 50)
    const logsQuery = await client.query(`
      SELECT
        id,
        job_slug,
        status,
        started_at,
        completed_at,
        execution_time_ms,
        records_processed,
        records_affected,
        error_message,
        metadata
      FROM cron_job_logs
      ORDER BY started_at DESC
      LIMIT 50
    `);

    // Get execution stats for each job (last 24h)
    const jobStatsQuery = await client.query(`
      SELECT
        job_slug,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
        COUNT(*) FILTER (WHERE status = 'error') as failed_executions,
        AVG(execution_time_ms) FILTER (WHERE status = 'success') as avg_execution_time_ms
      FROM cron_job_logs
      WHERE started_at > NOW() - INTERVAL '24 hours'
      GROUP BY job_slug
    `);

    // Map job stats to a lookup object
    const jobStatsMap: Record<string, any> = {};
    for (const row of jobStatsQuery.rows) {
      jobStatsMap[row.job_slug] = {
        totalExecutions: parseInt(row.total_executions, 10),
        successfulExecutions: parseInt(row.successful_executions, 10),
        failedExecutions: parseInt(row.failed_executions, 10),
        avgExecutionTimeMs: row.avg_execution_time_ms ? parseFloat(row.avg_execution_time_ms) : null,
      };
    }

    // Combine job data with stats
    const jobs = jobsQuery.rows.map((job) => ({
      ...job,
      stats: jobStatsMap[job.slug] || {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgExecutionTimeMs: null,
      },
    }));

    return NextResponse.json({
      success: true,
      stats,
      jobs,
      logs: logsQuery.rows,
    });
  } catch (error: any) {
    console.error('Error fetching cron jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch cron jobs',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
