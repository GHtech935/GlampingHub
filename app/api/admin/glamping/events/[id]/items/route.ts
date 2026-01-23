import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const { item_id } = body;

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
    }

    // Check if association already exists
    const existingCheck = await pool.query(
      'SELECT * FROM glamping_item_event_items WHERE event_id = $1 AND item_id = $2',
      [eventId, item_id]
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Item already attached to this event'
      });
    }

    // Create association
    await pool.query(
      'INSERT INTO glamping_item_event_items (event_id, item_id) VALUES ($1, $2)',
      [eventId, item_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Item attached to event successfully'
    });
  } catch (error) {
    console.error('Error attaching item to event:', error);
    return NextResponse.json(
      { error: 'Failed to attach item to event' },
      { status: 500 }
    );
  }
}
