import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; tentId: string }> }
) {
  try {
    const { code: bookingCode, tentId } = await params;

    // Get item_id from the specific tent
    const tentResult = await query(`
      SELECT
        bt.item_id,
        bt.id as tent_id,
        b.id as booking_id
      FROM glamping_bookings b
      JOIN glamping_booking_tents bt ON bt.booking_id = b.id AND bt.id = $2
      WHERE b.booking_code = $1
    `, [bookingCode, tentId]);

    if (tentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking or tent not found' },
        { status: 404 }
      );
    }

    const { item_id: itemId, booking_id: bookingId } = tentResult.rows[0];

    // Get menu items attached to this specific item
    const menuItemsResult = await query(`
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.unit,
        mi.image_url,
        mi.max_quantity,
        mi.min_guests,
        mi.max_guests,
        mc.id as category_id,
        mc.name as category_name,
        imp.is_required,
        imp.display_order
      FROM glamping_item_menu_products imp
      JOIN glamping_menu_items mi ON imp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE imp.item_id = $1
        AND mi.status = 'active'
        AND mi.is_available = true
      ORDER BY imp.display_order, mc.weight, mi.sort_order, mi.name
    `, [itemId]);

    return NextResponse.json({
      success: true,
      bookingId,
      tentId,
      itemId,
      menuItems: menuItemsResult.rows,
    });
  } catch (error: any) {
    console.error('Error fetching available menu items for tent:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
