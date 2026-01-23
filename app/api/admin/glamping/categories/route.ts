import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get zone_id filter
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');

    let query = `
      SELECT
        c.id,
        c.name,
        c.zone_id,
        c.weight,
        c.status,
        c.created_at,
        c.updated_at,
        z.name->>'vi' as zone_name,
        COUNT(DISTINCT i.id) as item_count
      FROM glamping_categories c
      LEFT JOIN glamping_zones z ON c.zone_id = z.id
      LEFT JOIN glamping_items i ON i.category_id = c.id
    `;

    const params: any[] = [];

    // Filter by zone_id if provided (skip if "all")
    if (zoneId && zoneId !== 'all') {
      query += ' WHERE c.zone_id = $1';
      params.push(zoneId);
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
    const { name, zone_id, weight, status } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!zone_id || zone_id === 'all') {
      return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO glamping_categories (name, zone_id, weight, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, zone_id, weight, status`,
      [name, zone_id, weight || 0, status || 'active']
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
