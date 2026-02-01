import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/admin/glamping/menu-categories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      `SELECT id, zone_id, name, description, weight, status, is_tent_category, created_at, updated_at
       FROM glamping_menu_categories
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Menu category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Error fetching menu category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu category' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/glamping/menu-categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, weight, status, is_tent_category } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE glamping_menu_categories
       SET name = $1,
           description = $2,
           weight = $3,
           status = $4,
           is_tent_category = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        JSON.stringify(name),
        description ? JSON.stringify(description) : null,
        weight || 0,
        status || 'active',
        is_tent_category !== false,
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Menu category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Error updating menu category:', error);
    return NextResponse.json(
      { error: 'Failed to update menu category' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/glamping/menu-categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First, set category_id to NULL for all menu items using this category
    await pool.query(
      `UPDATE glamping_menu_items
       SET category_id = NULL
       WHERE category_id = $1`,
      [id]
    );

    // Then delete the category
    const result = await pool.query(
      `DELETE FROM glamping_menu_categories
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Menu category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu category:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu category' },
      { status: 500 }
    );
  }
}
