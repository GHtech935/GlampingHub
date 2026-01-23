import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');

    let query = `
      SELECT
        t.id,
        t.name,
        t.zone_id,
        t.weight,
        t.visibility,
        t.created_at,
        t.updated_at,
        z.name->>'vi' as zone_name,
        COUNT(DISTINCT it.item_id) as item_count
      FROM glamping_tags t
      LEFT JOIN glamping_zones z ON t.zone_id = z.id
      LEFT JOIN glamping_item_tags it ON it.tag_id = t.id
    `;

    const params: any[] = [];

    if (zoneId && zoneId !== 'all') {
      query += ' WHERE t.zone_id = $1';
      params.push(zoneId);
    }

    query += ' GROUP BY t.id, z.name ORDER BY t.weight DESC, t.name ASC';

    const result = await pool.query(query, params);

    // Convert item_count from string to number
    const tags = result.rows.map(tag => ({
      ...tag,
      item_count: parseInt(tag.item_count) || 0
    }));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Tags fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, zone_id, weight, visibility } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!zone_id || zone_id === 'all') {
      return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO glamping_tags (name, zone_id, weight, visibility)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, zone_id, weight, visibility`,
      [name, zone_id, weight || 0, visibility || 'staff']
    );

    return NextResponse.json({
      success: true,
      tag: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Tag creation error:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
