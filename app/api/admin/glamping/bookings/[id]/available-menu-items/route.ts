import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, isStaffSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  imageUrl: string | null;
  maxQuantity: number | null;
  categoryId: string | null;
  categoryName: string | null;
}

interface TentWithMenuItems {
  tentId: string;
  tentName: string;
  itemId: string;
  menuItems: MenuItem[];
}

/**
 * GET /api/admin/glamping/bookings/[id]/available-menu-items
 * Get menu items grouped by tents for a booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'vi';

    // Verify booking exists
    const bookingResult = await client.query(
      `SELECT id FROM glamping_bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Get all tents for this booking with their item info
    const tentsResult = await client.query(
      `SELECT
        bt.id as tent_id,
        bt.item_id,
        gi.name as tent_name
      FROM glamping_booking_tents bt
      JOIN glamping_items gi ON bt.item_id = gi.id
      WHERE bt.booking_id = $1
      ORDER BY gi.name`,
      [bookingId]
    );

    if (tentsResult.rows.length === 0) {
      return NextResponse.json({ tents: [] });
    }

    // Get menu items for each tent
    const tents: TentWithMenuItems[] = [];

    for (const tent of tentsResult.rows) {
      const menuItemsResult = await client.query(
        `SELECT
          mi.id,
          COALESCE(mi.name->>$2, mi.name->>'vi', mi.name->>'en') as name,
          COALESCE(mi.description->>$2, mi.description->>'vi', mi.description->>'en') as description,
          mi.price,
          COALESCE(mi.unit->>$2, mi.unit->>'vi', mi.unit->>'en') as unit,
          mi.image_url,
          mi.max_quantity,
          mc.id as category_id,
          COALESCE(mc.name->>$2, mc.name->>'vi', mc.name->>'en') as category_name
        FROM glamping_item_menu_products imp
        JOIN glamping_menu_items mi ON imp.menu_item_id = mi.id
        LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
        WHERE imp.item_id = $1 AND mi.status = 'active' AND mi.is_available = true
        ORDER BY imp.display_order, mc.weight, mi.sort_order, mi.name`,
        [tent.item_id, locale]
      );

      const menuItems: MenuItem[] = menuItemsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price || '0'),
        unit: row.unit,
        imageUrl: row.image_url,
        maxQuantity: row.max_quantity,
        categoryId: row.category_id,
        categoryName: row.category_name,
      }));

      tents.push({
        tentId: tent.tent_id,
        tentName: tent.tent_name,
        itemId: tent.item_id,
        menuItems,
      });
    }

    return NextResponse.json({ tents });
  } catch (error) {
    console.error('Error fetching available menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
