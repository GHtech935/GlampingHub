import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/glamping/bookings/[id]/products
 * Get all menu products ordered with this booking
 * Products are stored in glamping_booking_menu_products when customer orders them
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if booking exists and get item info
    const bookingResult = await client.query(
      `SELECT b.id, b.status, b.payment_status,
              bi.item_id, bi.quantity as booking_quantity,
              z.id as zone_id,
              i.name as item_name
       FROM glamping_bookings b
       LEFT JOIN glamping_booking_items bi ON bi.booking_id = b.id
       LEFT JOIN glamping_items i ON bi.item_id = i.id
       LEFT JOIN glamping_zones z ON i.zone_id = z.id
       WHERE b.id = $1
       LIMIT 1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Fetch booked menu products from glamping_booking_menu_products
    const productsResult = await client.query(
      `SELECT
        bmp.id,
        bmp.menu_item_id,
        bmp.quantity,
        bmp.unit_price,
        bmp.total_price,
        bmp.notes,
        bmp.created_at,
        mi.name as product_name,
        mi.description as product_description,
        mi.unit as product_unit,
        mi.image_url,
        mc.name as category_name
      FROM glamping_booking_menu_products bmp
      JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE bmp.booking_id = $1
      ORDER BY bmp.created_at, mi.name`,
      [id]
    );

    const products = productsResult.rows.map(row => ({
      id: row.id,
      menuItemId: row.menu_item_id,
      productName: typeof row.product_name === 'object'
        ? (row.product_name.vi || row.product_name.en || 'Unknown')
        : (row.product_name || 'Unknown Product'),
      productDescription: typeof row.product_description === 'object'
        ? (row.product_description.vi || row.product_description.en || '')
        : (row.product_description || ''),
      productCategory: typeof row.category_name === 'object'
        ? (row.category_name.vi || row.category_name.en || '')
        : (row.category_name || ''),
      quantity: row.quantity,
      unitPrice: parseFloat(row.unit_price || 0),
      totalPrice: parseFloat(row.total_price || 0),
      productUnit: row.product_unit,
      imageUrl: row.image_url,
      notes: row.notes,
      createdAt: row.created_at,
    }));

    // Calculate total for all products
    const productsTotal = products.reduce((sum, p) => sum + p.totalPrice, 0);

    // Determine if booking can be modified
    const modifiableStatuses = ['pending', 'confirmed', 'checked_in'];
    const canModify = modifiableStatuses.includes(booking.status);

    // Extract localized item name
    const itemName = typeof booking.item_name === 'object'
      ? (booking.item_name.vi || booking.item_name.en || '')
      : (booking.item_name || '');

    return NextResponse.json({
      products,
      productsTotal,
      canModify,
      zoneId: booking.zone_id,
      itemId: booking.item_id,
      itemName,
    });
  } catch (error) {
    console.error("Error fetching glamping products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
