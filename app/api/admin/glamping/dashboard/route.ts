import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch metrics
    const today = new Date().toISOString().split('T')[0];

    const [revenueResult, bookingsResult, itemsResult] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as revenue
         FROM glamping_bookings
         WHERE DATE(created_at) = $1 AND status != 'cancelled'`,
        [today]
      ),
      pool.query(
        `SELECT COUNT(*) as count
         FROM glamping_bookings
         WHERE status IN ('confirmed', 'checked_in')
         AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)`
      ),
      pool.query(
        `SELECT COUNT(*) as count
         FROM glamping_items`
      ),
    ]);

    return NextResponse.json({
      metrics: {
        revenue: parseFloat(revenueResult.rows[0].revenue),
        bookings: parseInt(bookingsResult.rows[0].count),
        items: parseInt(itemsResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
