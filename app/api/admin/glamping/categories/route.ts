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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');
    const isTentCategory = searchParams.get('is_tent_category');

    let query = `
      SELECT
        c.id,
        c.name,
        c.zone_id,
        c.weight,
        c.status,
        c.is_tent_category,
        c.created_at,
        c.updated_at,
        z.name->>'vi' as zone_name,
        COUNT(DISTINCT i.id) as item_count
      FROM glamping_categories c
      LEFT JOIN glamping_zones z ON c.zone_id = z.id
      LEFT JOIN glamping_items i ON i.category_id = c.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Filter by accessible zones for glamping_owner
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ categories: [] });
      }
      conditions.push(`c.zone_id = ANY($${params.length + 1}::uuid[])`);
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
      conditions.push(`c.zone_id = $${params.length + 1}`);
      params.push(zoneId);
    }

    // Filter by is_tent_category if provided
    if (isTentCategory !== null) {
      conditions.push(`c.is_tent_category = $${params.length + 1}`);
      params.push(isTentCategory === 'true');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY c.id, z.name ORDER BY c.weight DESC, c.name ASC';

    const result = await pool.query(query, params);

    // Convert item_count from string to number
    const categories = result.rows.map(cat => ({
      ...cat,
      item_count: parseInt(cat.item_count) || 0
    }));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, zone_id, weight, status, is_tent_category } = body;

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

    const result = await pool.query(
      `INSERT INTO glamping_categories (name, zone_id, weight, status, is_tent_category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, zone_id, weight, status, is_tent_category`,
      [name, zone_id, weight || 0, status || 'active', is_tent_category !== false]
    );

    return NextResponse.json({
      success: true,
      category: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Category creation error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
