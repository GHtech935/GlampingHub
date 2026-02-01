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
        p.id,
        p.name,
        p.zone_id,
        p.color_code,
        p.default_value,
        p.display_order,
        p.link_to_guests,
        p.controls_inventory,
        p.sets_pricing,
        p.price_range,
        p.required,
        p.visibility,
        p.counted_for_menu,
        p.created_at,
        p.updated_at,
        z.name->>'vi' as zone_name
      FROM glamping_parameters p
      LEFT JOIN glamping_zones z ON p.zone_id = z.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Filter by accessible zones for glamping_owner
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ parameters: [] });
      }
      conditions.push(`p.zone_id = ANY($${params.length + 1}::uuid[])`);
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
      conditions.push(`p.zone_id = $${params.length + 1}`);
      params.push(zoneId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.display_order ASC, p.name ASC';

    const result = await pool.query(query, params);

    return NextResponse.json({ parameters: result.rows });
  } catch (error) {
    console.error('Parameters fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch parameters' }, { status: 500 });
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
      color_code,
      default_value,
      display_order,
      link_to_guests,
      controls_inventory,
      sets_pricing,
      price_range,
      required,
      visibility,
      counted_for_menu
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
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

    // Validate visibility value
    if (visibility && !['everyone', 'staff', 'hidden'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 });
    }

    // Get max display_order for this zone and add 1
    const maxOrderResult = await pool.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
       FROM glamping_parameters
       WHERE zone_id = $1`,
      [zone_id]
    );
    const nextDisplayOrder = maxOrderResult.rows[0]?.next_order ?? 0;

    const result = await pool.query(
      `INSERT INTO glamping_parameters (
        name,
        zone_id,
        color_code,
        default_value,
        display_order,
        link_to_guests,
        controls_inventory,
        sets_pricing,
        price_range,
        required,
        visibility,
        counted_for_menu
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        name,
        zone_id,
        color_code || null,
        default_value !== undefined ? default_value : 1,
        nextDisplayOrder,
        link_to_guests || false,
        controls_inventory || false,
        sets_pricing !== undefined ? sets_pricing : true,
        price_range || false,
        required || false,
        visibility || 'everyone',
        counted_for_menu || false
      ]
    );

    return NextResponse.json({
      success: true,
      parameter: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Parameter creation error:', error);
    return NextResponse.json({ error: 'Failed to create parameter' }, { status: 500 });
  }
}
