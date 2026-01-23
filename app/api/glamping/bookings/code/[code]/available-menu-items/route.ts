import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: bookingCode } = await params;

    // Get item_id from booking using booking_code
    const itemResult = await query(`
      SELECT bi.item_id
      FROM glamping_bookings b
      JOIN glamping_booking_items bi ON b.id = bi.booking_id
      WHERE b.booking_code = $1 LIMIT 1
    `, [bookingCode]);

    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const itemId = itemResult.rows[0].item_id;

    // Get menu items attached to this specific item
    const menuItemsResult = await query(`
      SELECT
        mi.id, mi.name, mi.description, mi.price, mi.unit,
        mi.image_url, mi.max_quantity,
        mc.id as category_id, mc.name as category_name,
        imp.is_required, imp.display_order
      FROM glamping_item_menu_products imp
      JOIN glamping_menu_items mi ON imp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE imp.item_id = $1 AND mi.status = 'active' AND mi.is_available = true
      ORDER BY imp.display_order, mc.weight, mi.sort_order, mi.name
    `, [itemId]);

    return NextResponse.json({
      success: true,
      menuItems: menuItemsResult.rows,
    });
  } catch (error: any) {
    console.error('Error fetching available menu items:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
