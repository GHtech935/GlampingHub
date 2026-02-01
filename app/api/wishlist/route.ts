import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, isCustomerSession } from '@/lib/auth';

// GET /api/wishlist - Get customer's wishlist
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getSession();

    if (!session || !isCustomerSession(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await client.query(
      `SELECT
        w.id as wishlist_id,
        w.created_at as added_at,
        i.id as item_id,
        i.name as item_name,
        i.summary as item_summary,
        ia.inventory_quantity,
        z.id as zone_id,
        z.name as zone_name,
        -- Get first image
        (
          SELECT url FROM glamping_item_media
          WHERE item_id = i.id AND type = 'image'
          ORDER BY display_order ASC
          LIMIT 1
        ) as image_url,
        -- Get base price (adult parameter, no event)
        (
          SELECT p.amount FROM glamping_pricing p
          JOIN glamping_parameters param ON p.parameter_id = param.id
          WHERE p.item_id = i.id
            AND p.event_id IS NULL
            AND (param.name ILIKE '%người lớn%' OR param.name ILIKE '%adult%')
          ORDER BY p.group_min ASC
          LIMIT 1
        ) as base_price
      FROM customer_glamping_wishlists w
      JOIN glamping_items i ON w.item_id = i.id
      LEFT JOIN glamping_item_attributes ia ON ia.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE w.customer_id = $1
      ORDER BY w.created_at DESC`,
      [session.id]
    );

    const items = result.rows.map(row => ({
      wishlistId: row.wishlist_id,
      addedAt: row.added_at,
      itemId: row.item_id,
      itemName: row.item_name,
      itemSummary: row.item_summary,
      inventoryQuantity: row.inventory_quantity,
      zoneId: row.zone_id,
      zoneName: row.zone_name,
      imageUrl: row.image_url,
      basePrice: row.base_price ? parseFloat(row.base_price) : null,
    }));

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST /api/wishlist - Add item to wishlist
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getSession();

    if (!session || !isCustomerSession(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Check if item exists
    const itemCheck = await client.query(
      'SELECT id FROM glamping_items WHERE id = $1',
      [itemId]
    );

    if (itemCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Add to wishlist (ignore if already exists due to unique constraint)
    await client.query(
      `INSERT INTO customer_glamping_wishlists (customer_id, item_id)
       VALUES ($1, $2)
       ON CONFLICT (customer_id, item_id) DO NOTHING`,
      [session.id, itemId]
    );

    return NextResponse.json({
      success: true,
      message: 'Item added to wishlist',
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
