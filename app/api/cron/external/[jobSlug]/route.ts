/**
 * GET/POST /api/cron/external/[jobSlug]
 *
 * External trigger endpoint for Vercel Cron or other services
 * Used when cron is managed externally instead of in-process
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduler } from '../../scheduler';
import { registerAllJobs } from '../../jobs';

// Ensure jobs are registered on cold start
let isJobsRegistered = false;
if (!isJobsRegistered) {
  registerAllJobs();
  isJobsRegistered = true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobSlug: string }> }
) {
  const { jobSlug } = await params;
  return handleTrigger(request, jobSlug);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobSlug: string }> }
) {
  const { jobSlug } = await params;
  return handleTrigger(request, jobSlug);
}

async function handleTrigger(request: NextRequest, jobSlug: string) {
  try {
    // Verify authorization - check for Vercel Cron secret or custom CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const vercelCronAuth = request.headers.get('x-vercel-cron-secret');

    const isAuthorized =
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      vercelCronAuth === process.env.CRON_SECRET;

    if (!isAuthorized) {
      console.error('❌ Unauthorized cron trigger attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`🌐 External trigger for job: ${jobSlug}`);

    // Trigger the job directly (bypass scheduler)
    await scheduler.triggerJob(jobSlug);

    return NextResponse.json({
      success: true,
      message: `Job ${jobSlug} executed successfully`,
      jobSlug,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`Failed to execute external cron job ${jobSlug}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute job',
        jobSlug,
      },
      { status: 500 }
    );
  }
}
