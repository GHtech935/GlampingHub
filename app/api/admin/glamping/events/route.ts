import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAccessibleGlampingZoneIds, canAccessGlampingZone } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get accessible zone IDs (null = all, [] = none)
    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);

    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');

    let query = `
      SELECT
        e.id,
        e.name,
        e.zone_id,
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
        e.created_at,
        z.name->>'vi' as zone_name,
        COUNT(DISTINCT ei.item_id) as item_count
      FROM glamping_item_events e
      LEFT JOIN glamping_zones z ON e.zone_id = z.id
      LEFT JOIN glamping_item_event_items ei ON e.id = ei.event_id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Filter by accessible zones for glamping_owner
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ events: [] });
      }
      conditions.push(`e.zone_id = ANY($${params.length + 1}::uuid[])`);
      params.push(accessibleZoneIds);
    }

    // Filter by zone_id if provided (skip if "all")
    if (zoneId && zoneId !== 'all') {
      if (accessibleZoneIds !== null && !accessibleZoneIds.includes(zoneId)) {
        return NextResponse.json(
          { error: 'You do not have access to this zone' },
          { status: 403 }
        );
      }
      conditions.push(`e.zone_id = $${params.length + 1}`);
      params.push(zoneId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY e.id, z.name
      ORDER BY e.created_at DESC
    `;

    const result = await pool.query(query, params);

    // Convert item_count from string to number
    const events = result.rows.map(event => ({
      ...event,
      item_count: parseInt(event.item_count) || 0
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      zone_id,
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

    if (!zone_id || zone_id === 'all') {
      return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
    }

    // Validate zone access for glamping_owner
    if (!canAccessGlampingZone(session, zone_id)) {
      return NextResponse.json(
        { error: 'You do not have access to this zone' },
        { status: 403 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If recurrence is 'always', force dates to NULL
      const finalStartDate = recurrence === 'always' ? null : (start_date || null);
      const finalEndDate = recurrence === 'always' ? null : (end_date || null);
      // Only keep days_of_week when recurrence is 'weekly'
      const finalDaysOfWeek = recurrence === 'weekly' ? (days_of_week || null) : null;

      // Create event
      const eventResult = await client.query(
        `INSERT INTO glamping_item_events (
          name,
          zone_id,
          type,
          start_date,
          end_date,
          recurrence,
          days_of_week,
          pricing_type,
          status,
          active,
          dynamic_pricing_value,
          dynamic_pricing_mode,
          yield_thresholds
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          name,
          zone_id,
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
          yield_thresholds ? JSON.stringify(yield_thresholds) : null
        ]
      );

      const eventId = eventResult.rows[0].id;

      // Attach items to event if provided
      if (item_ids && item_ids.length > 0) {
        for (const itemId of item_ids) {
          await client.query(
            'INSERT INTO glamping_item_event_items (event_id, item_id) VALUES ($1, $2)',
            [eventId, itemId]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        event_id: eventId
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
