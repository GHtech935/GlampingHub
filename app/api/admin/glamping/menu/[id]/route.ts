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
      `SELECT
        id,
        zone_id,
        name,
        description,
        category,
        category_id,
        unit,
        price,
        tax_rate,
        is_available,
        max_quantity,
        requires_advance_booking,
        advance_hours,
        image_url,
        sort_order,
        weight,
        status,
        min_guests,
        max_guests,
        stock,
        created_at,
        updated_at
       FROM glamping_menu_items
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Fetch associated item_ids from junction table
    const itemsResult = await pool.query(
      `SELECT item_id FROM glamping_item_menu_products WHERE menu_item_id = $1 ORDER BY display_order`,
      [id]
    );
    const item_ids = itemsResult.rows.map(row => row.item_id);

    return NextResponse.json({
      menuItem: {
        ...result.rows[0],
        item_ids
      }
    });

  } catch (error) {
    console.error('Menu item fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu item' }, { status: 500 });
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
      description,
      category,
      category_id,
      unit,
      price,
      tax_rate,
      is_available,
      max_quantity,
      requires_advance_booking,
      advance_hours,
      image_url,
      weight,
      status,
      min_guests,
      max_guests,
      stock,
      item_ids // Array of item UUIDs this menu product applies to
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (price === null || price === undefined || price < 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    // Use a transaction to update menu item and item associations
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE glamping_menu_items
         SET
           name = $1,
           description = $2,
           category = $3,
           category_id = $4,
           unit = $5,
           price = $6,
           tax_rate = $7,
           is_available = $8,
           max_quantity = $9,
           requires_advance_booking = $10,
           advance_hours = $11,
           image_url = $12,
           weight = $13,
           status = $14,
           min_guests = $15,
           max_guests = $16,
           stock = $17,
           updated_at = NOW()
         WHERE id = $18
         RETURNING *`,
        [
          name,
          description || { vi: '', en: '' },
          category || { vi: '', en: '' },
          category_id || null,
          unit || { vi: 'món', en: 'item' },
          price,
          tax_rate || 0,
          is_available !== undefined ? is_available : true,
          max_quantity || 10,
          requires_advance_booking || false,
          advance_hours || 0,
          image_url || null,
          weight || 0,
          status || 'active',
          min_guests || null,
          max_guests || null,
          stock || null,
          id
        ]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
      }

      // Update item associations if item_ids is provided
      if (item_ids !== undefined) {
        // Delete existing associations
        await client.query(
          'DELETE FROM glamping_item_menu_products WHERE menu_item_id = $1',
          [id]
        );

        // Insert new associations
        if (Array.isArray(item_ids) && item_ids.length > 0) {
          const values = item_ids.map((itemId: string, index: number) =>
            `($1, $${index + 2}, false, ${index})`
          ).join(', ');

          await client.query(
            `INSERT INTO glamping_item_menu_products (menu_item_id, item_id, is_required, display_order)
             VALUES ${values}`,
            [id, ...item_ids]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        menuItem: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Menu item update error:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
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
      'DELETE FROM glamping_menu_items WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Menu item deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}
