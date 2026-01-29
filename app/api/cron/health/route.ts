/**
 * GET /api/cron/health
 *
 * Health check endpoint for cron scheduler
 * Returns scheduler status and job information
 */

import { NextResponse } from 'next/server';
import { scheduler } from '../scheduler';
import { getJobStats } from '../utils';

export async function GET() {
  try {
    const isRunning = scheduler.isRunning();
    const jobs = scheduler.getJobs();
    const stats = await getJobStats();

    return NextResponse.json({
      status: 'healthy',
      scheduler: {
        isRunning,
        jobsRegistered: jobs.length,
        activeJobs: jobs.filter((j) => j.config.isActive).length,
      },
      stats,
      jobs: jobs.map((j) => ({
        slug: j.slug,
        name: j.config.name,
        schedule: j.config.cronExpression,
        isActive: j.config.isActive,
        isRunning: j.isRunning,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
