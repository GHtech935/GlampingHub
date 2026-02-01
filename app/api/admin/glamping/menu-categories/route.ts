import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/admin/glamping/menu-categories?zone_id=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');

    if (!zoneId) {
      return NextResponse.json(
        { error: 'zone_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT id, zone_id, name, description, weight, status, is_tent_category, created_at, updated_at
       FROM glamping_menu_categories
       WHERE zone_id = $1
       ORDER BY weight ASC, created_at DESC`,
      [zoneId]
    );

    return NextResponse.json({ categories: result.rows });
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu categories' },
      { status: 500 }
    );
  }
}

// POST /api/admin/glamping/menu-categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone_id, name, description, weight, status, is_tent_category } = body;

    // Validation
    if (!zone_id || !name) {
      return NextResponse.json(
        { error: 'zone_id and name are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO glamping_menu_categories
       (zone_id, name, description, weight, status, is_tent_category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        zone_id,
        JSON.stringify(name),
        description ? JSON.stringify(description) : null,
        weight || 0,
        status || 'active',
        is_tent_category !== false
      ]
    );

    return NextResponse.json(
      { category: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating menu category:', error);
    return NextResponse.json(
      { error: 'Failed to create menu category' },
      { status: 500 }
    );
  }
}
