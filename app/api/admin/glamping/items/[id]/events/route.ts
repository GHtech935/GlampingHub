import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await params;

    // Fetch all events attached to this item
    const result = await pool.query(`
      SELECT
        e.id,
        e.name,
        e.type,
        e.start_date,
        e.end_date,
        e.recurrence,
        e.days_of_week,
        e.pricing_type,
        e.status,
        e.rules_id
      FROM glamping_item_events e
      INNER JOIN glamping_item_event_items ei ON e.id = ei.event_id
      WHERE ei.item_id = $1
      ORDER BY e.start_date ASC
    `, [itemId]);

    return NextResponse.json({
      success: true,
      events: result.rows
    });
  } catch (error) {
    console.error('Error fetching item events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item events' },
      { status: 500 }
    );
  }
}
