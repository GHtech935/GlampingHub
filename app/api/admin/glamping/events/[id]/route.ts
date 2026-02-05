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

    const { id } = await params;

    // Get event with attached items
    const eventResult = await pool.query(
      `SELECT
        e.id,
        e.name,
        e.type,
        e.start_date,
        e.end_date,
        e.recurrence,
        e.days_of_week,
        e.pricing_type,
        e.status,
        e.active,
        e.dynamic_pricing_value,
        e.dynamic_pricing_mode,
        e.yield_thresholds,
        e.created_at
      FROM glamping_item_events e
      WHERE e.id = $1`,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get attached items
    const itemsResult = await pool.query(
      `SELECT ei.item_id
      FROM glamping_item_event_items ei
      WHERE ei.event_id = $1`,
      [id]
    );

    const eventData = eventResult.rows[0];

    // Format the response to match the modal expectations
    const event = {
      ...eventData,
      dynamic_pricing: eventData.dynamic_pricing_value !== null ? {
        value: eventData.dynamic_pricing_value,
        mode: eventData.dynamic_pricing_mode
      } : undefined,
      item_ids: itemsResult.rows.map(row => row.item_id)
    };

    // Remove the raw pricing fields
    delete event.dynamic_pricing_value;
    delete event.dynamic_pricing_mode;

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Event fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      type,
      start_date,
      end_date,
      recurrence,
      days_of_week,
      pricing_type,
      status,
      active,
      dynamic_pricing,
      yield_thresholds,
      item_ids,
    } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If recurrence is 'always', force dates to NULL
      const finalStartDate = recurrence === 'always' ? null : (start_date || null);
      const finalEndDate = recurrence === 'always' ? null : (end_date || null);
      // Only keep days_of_week when recurrence is 'weekly'
      const finalDaysOfWeek = recurrence === 'weekly' ? (days_of_week || null) : null;

      // Update event
      await client.query(
        `UPDATE glamping_item_events
        SET
          name = $1,
          type = $2,
          start_date = $3,
          end_date = $4,
          recurrence = $5,
          days_of_week = $6,
          pricing_type = $7,
          status = $8,
          active = $9,
          dynamic_pricing_value = $10,
          dynamic_pricing_mode = $11,
          yield_thresholds = $12
        WHERE id = $13`,
        [
          name,
          type,
          finalStartDate,
          finalEndDate,
          recurrence || 'one_time',
          finalDaysOfWeek,
          pricing_type || 'base_price',
          status || 'available',
          active !== undefined ? active : true,
          dynamic_pricing?.value || null,
          dynamic_pricing?.mode || null,
          yield_thresholds ? JSON.stringify(yield_thresholds) : null,
          id
        ]
      );

      // Delete existing item associations
      await client.query(
        'DELETE FROM glamping_item_event_items WHERE event_id = $1',
        [id]
      );

      // Re-attach items if provided
      if (item_ids && item_ids.length > 0) {
        for (const itemId of item_ids) {
          await client.query(
            'INSERT INTO glamping_item_event_items (event_id, item_id) VALUES ($1, $2)',
            [id, itemId]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({ success: true });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Event update error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete item associations first
      await client.query(
        'DELETE FROM glamping_item_event_items WHERE event_id = $1',
        [id]
      );

      // Delete event
      const result = await client.query(
        'DELETE FROM glamping_item_events WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }

      await client.query('COMMIT');

      return NextResponse.json({ success: true });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Event deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
