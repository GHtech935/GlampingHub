/**
 * POST /api/admin/cron-jobs/toggle
 *
 * Enable or disable a cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { jobSlug, isActive } = body;

    if (!jobSlug) {
      return NextResponse.json(
        { success: false, error: 'jobSlug is required' },
        { status: 400 }
      );
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Update job status
    const result = await client.query(
      `UPDATE cron_jobs
       SET is_active = $1, updated_at = NOW()
       WHERE slug = $2
       RETURNING id, slug, name, is_active`,
      [isActive, jobSlug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = result.rows[0];

    console.log(`✅ Job ${jobSlug} ${isActive ? 'enabled' : 'disabled'} by admin`);

    return NextResponse.json({
      success: true,
      message: `Job ${isActive ? 'enabled' : 'disabled'} successfully`,
      job,
    });
  } catch (error: any) {
    console.error('Error toggling cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to toggle job',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
