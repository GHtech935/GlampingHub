/**
 * POST /api/cron/trigger
 *
 * Manually trigger a cron job
 * Requires authorization header with CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduler } from '../scheduler';

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { jobSlug } = body;

    if (!jobSlug) {
      return NextResponse.json(
        { success: false, error: 'jobSlug is required' },
        { status: 400 }
      );
    }

    // Trigger the job
    console.log(`📞 Manual trigger requested for job: ${jobSlug}`);
    await scheduler.triggerJob(jobSlug);

    return NextResponse.json({
      success: true,
      message: `Job ${jobSlug} triggered successfully`,
      jobSlug,
    });
  } catch (error: any) {
    console.error('Failed to trigger cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to trigger job',
      },
      { status: 500 }
    );
  }
}
