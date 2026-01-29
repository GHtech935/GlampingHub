/**
 * POST /api/cron/init
 *
 * Initialize and start the cron scheduler
 * This should be called once when the application starts
 */

import { NextResponse } from 'next/server';
import { scheduler } from '../scheduler';
import { registerAllJobs } from '../jobs';

// Track if scheduler has been initialized
let isSchedulerInitialized = false;

export async function POST() {
  try {
    if (isSchedulerInitialized) {
      return NextResponse.json(
        {
          success: true,
          message: 'Scheduler is already initialized',
          isRunning: scheduler.isRunning(),
        },
        { status: 200 }
      );
    }

    // Register all jobs
    registerAllJobs();

    // Start the scheduler
    scheduler.startAll();

    isSchedulerInitialized = true;

    const jobs = scheduler.getJobs();

    return NextResponse.json(
      {
        success: true,
        message: 'Cron scheduler initialized successfully',
        jobsRegistered: jobs.length,
        jobs: jobs.map((j) => ({
          slug: j.slug,
          name: j.config.name,
          schedule: j.config.cronExpression,
          isActive: j.config.isActive,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to initialize cron scheduler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to initialize scheduler',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check initialization status
export async function GET() {
  const jobs = scheduler.getJobs();

  return NextResponse.json({
    isInitialized: isSchedulerInitialized,
    isRunning: scheduler.isRunning(),
    jobsRegistered: jobs.length,
    jobs: jobs.map((j) => ({
      slug: j.slug,
      name: j.config.name,
      schedule: j.config.cronExpression,
      isActive: j.config.isActive,
      isRunning: j.isRunning,
    })),
  });
}
