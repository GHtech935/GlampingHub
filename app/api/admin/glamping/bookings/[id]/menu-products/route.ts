import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import {
  recalculateGlampingBookingTotals,
  logGlampingBookingEditAction,
} from "@/lib/booking-recalculate";
import { validateVoucherDirect } from "@/lib/voucher-validation";

export const dynamic = 'force-dynamic';

function getLocalizedString(value: any, fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.vi || value.en || fallback;
  return fallback;
}

/**
 * POST /api/admin/glamping/bookings/[id]/menu-products
 * Add a new menu product to a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await request.json();
    const {
      bookingTentId,
      menuItemId,
      quantity,
      unitPrice,
      servingDate,
      voucherCode,
      notes,
    } = body;

    // Validate required fields
    if (!menuItemId || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields: menuItemId, quantity" },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Verify booking exists
    const bookingResult = await client.query(
      `SELECT id, status FROM glamping_bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get menu item info
    const menuItemResult = await client.query(
      `SELECT mi.id, mi.name, mi.price, mc.zone_id
       FROM glamping_menu_items mi
       LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
       WHERE mi.id = $1`,
      [menuItemId]
    );

    if (menuItemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const menuItem = menuItemResult.rows[0];
    const menuItemName = getLocalizedString(menuItem.name);
    const finalUnitPrice = unitPrice ?? parseFloat(menuItem.price || '0');

    // Verify tent belongs to booking if provided
    if (bookingTentId) {
      const tentResult = await client.query(
        `SELECT id FROM glamping_booking_tents WHERE id = $1 AND booking_id = $2`,
        [bookingTentId, bookingId]
      );

      if (tentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "Tent not found in this booking" }, { status: 404 });
      }
    }

    // Handle voucher
    let discountAmount = 0;
    let discountType = null;
    let discountValue = 0;
    let voucherId = null;
    let finalVoucherCode = null;
    const totalPrice = quantity * finalUnitPrice;

    if (voucherCode) {
      const validation = await validateVoucherDirect(client, voucherCode, {
        zoneId: menuItem.zone_id,
        itemId: menuItemId,
        totalAmount: totalPrice,
        applicationType: 'menu_only',
      });

      if (!validation.valid) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: validation.error || 'Invalid voucher' }, { status: 400 });
      }

      discountAmount = validation.discountAmount;
      discountType = validation.discountType;
      discountValue = validation.discountValue;
      voucherId = validation.voucherId;
      finalVoucherCode = validation.voucherCode;
    }

    // Insert new menu product
    const insertResult = await client.query(
      `INSERT INTO glamping_booking_menu_products
       (booking_id, booking_tent_id, menu_item_id, quantity, unit_price, serving_date,
        voucher_code, voucher_id, discount_type, discount_value, discount_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        bookingId,
        bookingTentId || null,
        menuItemId,
        quantity,
        finalUnitPrice,
        servingDate || null,
        finalVoucherCode,
        voucherId,
        discountType,
        discountValue,
        discountAmount,
        notes || null,
      ]
    );

    const productId = insertResult.rows[0].id;

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log action
    const description = `Added menu product "${menuItemName}" (qty: ${quantity}, price: ${totalPrice.toLocaleString()})`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_add', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true, productId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding menu product:", error);
    return NextResponse.json(
      { error: "Failed to add menu product" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
