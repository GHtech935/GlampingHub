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

    const result = await pool.query(
      `SELECT id, name, color_code, controls_inventory, sets_pricing,
              price_range, visibility, created_at, updated_at,
              default_value, display_order, link_to_guests, required, zone_id,
              counted_for_menu
       FROM glamping_parameters
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Parameter not found' }, { status: 404 });
    }

    return NextResponse.json({
      parameter: result.rows[0]
    });

  } catch (error) {
    console.error('Parameter fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch parameter' }, { status: 500 });
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
      color_code,
      controls_inventory,
      sets_pricing,
      price_range,
      visibility,
      default_value,
      display_order,
      link_to_guests,
      required,
      counted_for_menu
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE glamping_parameters
       SET
         name = $1,
         color_code = $2,
         controls_inventory = $3,
         sets_pricing = $4,
         price_range = $5,
         visibility = $6,
         default_value = $7,
         display_order = $8,
         link_to_guests = $9,
         required = $10,
         counted_for_menu = $11,
         updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        name,
        color_code || null,
        controls_inventory || false,
        sets_pricing !== undefined ? sets_pricing : true,
        price_range || false,
        visibility || 'everyone',
        default_value !== undefined ? default_value : 1,
        display_order !== undefined ? display_order : 0,
        link_to_guests || false,
        required || false,
        counted_for_menu || false,
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Parameter not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      parameter: result.rows[0]
    });

  } catch (error) {
    console.error('Parameter update error:', error);
    return NextResponse.json({ error: 'Failed to update parameter' }, { status: 500 });
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

    const result = await pool.query(
      'DELETE FROM glamping_parameters WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Parameter not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Parameter deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete parameter' }, { status: 500 });
  }
}
