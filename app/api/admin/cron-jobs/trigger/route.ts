/**
 * POST /api/admin/cron-jobs/trigger
 *
 * Manually trigger a cron job (for admin testing/debugging)
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduler } from '@/app/api/cron/scheduler';
import { registerAllJobs } from '@/app/api/cron/jobs';

// Ensure jobs are registered
let isJobsRegistered = false;
if (!isJobsRegistered) {
  registerAllJobs();
  isJobsRegistered = true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobSlug } = body;

    if (!jobSlug) {
      return NextResponse.json(
        { success: false, error: 'jobSlug is required' },
        { status: 400 }
      );
    }

    console.log(`📞 Admin manually triggering job: ${jobSlug}`);

    // Trigger the job
    await scheduler.triggerJob(jobSlug);

    return NextResponse.json({
      success: true,
      message: `Job ${jobSlug} triggered successfully`,
      jobSlug,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error triggering cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to trigger job',
      },
      { status: 500 }
    );
  }
}
