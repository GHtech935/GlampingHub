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

    // Get zone_id filter
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');

    let query = `
      SELECT
        m.id,
        m.zone_id,
        m.name,
        m.description,
        m.category,
        m.category_id,
        mc.name as category_name,
        m.unit,
        m.price,
        m.tax_rate,
        m.is_available,
        m.max_quantity,
        m.requires_advance_booking,
        m.advance_hours,
        m.image_url,
        m.sort_order,
        m.weight,
        m.status,
        m.created_at,
        m.updated_at,
        z.name->>'vi' as zone_name
      FROM glamping_menu_items m
      LEFT JOIN glamping_zones z ON m.zone_id = z.id
      LEFT JOIN glamping_menu_categories mc ON m.category_id = mc.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Filter by accessible zones for glamping_owner
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ menuItems: [] });
      }
      conditions.push(`m.zone_id = ANY($${params.length + 1}::uuid[])`);
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
      conditions.push(`m.zone_id = $${params.length + 1}`);
      params.push(zoneId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY m.weight DESC, m.sort_order ASC, m.name ASC';

    const result = await pool.query(query, params);

    return NextResponse.json({ menuItems: result.rows });
  } catch (error) {
    console.error('Menu items fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
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
      description,
      category,
      category_id,
      unit,
      price,
      tax_rate,
      zone_id,
      is_available,
      max_quantity,
      requires_advance_booking,
      advance_hours,
      image_url,
      weight,
      status
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!price || price < 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
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

    const result = await pool.query(
      `INSERT INTO glamping_menu_items (
        name,
        description,
        category,
        category_id,
        unit,
        price,
        tax_rate,
        zone_id,
        is_available,
        max_quantity,
        requires_advance_booking,
        advance_hours,
        image_url,
        weight,
        status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        name,
        description || { vi: '', en: '' },
        category || { vi: '', en: '' },
        category_id || null,
        unit || { vi: 'món', en: 'item' },
        price,
        tax_rate || 0,
        zone_id,
        is_available !== undefined ? is_available : true,
        max_quantity || 10,
        requires_advance_booking || false,
        advance_hours || 0,
        image_url || null,
        weight || 0,
        status || 'active'
      ]
    );

    return NextResponse.json({
      success: true,
      menuItem: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Menu item creation error:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}
