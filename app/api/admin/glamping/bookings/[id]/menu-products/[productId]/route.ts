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
 * PUT /api/admin/glamping/bookings/[id]/menu-products/[productId]
 * Update a single menu product in a booking
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, productId } = await params;
    const body = await request.json();
    const {
      menuItemId,
      quantity,
      unitPrice,
      servingDate,
      subtotalOverride,
      voucherCode,
      taxInvoiceRequired,
    } = body;

    await client.query('BEGIN');

    // Verify product belongs to this booking
    const productResult = await client.query(
      `SELECT mp.*, mi.name as product_name, mc.name as category_name
       FROM glamping_booking_menu_products mp
       LEFT JOIN glamping_menu_items mi ON mp.menu_item_id = mi.id
       LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
       WHERE mp.id = $1 AND mp.booking_id = $2`,
      [productId, bookingId]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const oldProduct = productResult.rows[0];
    const oldProductName = getLocalizedString(oldProduct.product_name);

    // Calculate new totals
    const newQuantity = quantity ?? oldProduct.quantity;
    const newUnitPrice = unitPrice ?? parseFloat(oldProduct.unit_price || '0');
    let totalPrice = newQuantity * newUnitPrice;

    // Apply subtotal override if provided
    const oldTotalPrice = parseFloat(oldProduct.total_price || '0');
    if (subtotalOverride !== undefined && subtotalOverride !== null) {
      totalPrice = subtotalOverride;
    }

    // Handle voucher
    let discountAmount = parseFloat(oldProduct.discount_amount || '0');
    let discountType = oldProduct.discount_type;
    let discountValue = parseFloat(oldProduct.discount_value || '0');
    let voucherId = oldProduct.voucher_id;
    let finalVoucherCode = oldProduct.voucher_code;

    if (voucherCode !== undefined) {
      if (voucherCode === null || voucherCode === '') {
        discountAmount = 0;
        discountType = null;
        discountValue = 0;
        voucherId = null;
        finalVoucherCode = null;
      } else if (voucherCode !== oldProduct.voucher_code) {
        // Get zone info
        const zoneResult = await client.query(
          `SELECT gz.id as zone_id
           FROM glamping_menu_items mi
           JOIN glamping_menu_categories mc ON mi.category_id = mc.id
           JOIN glamping_zones gz ON mc.zone_id = gz.id
           WHERE mi.id = $1`,
          [menuItemId || oldProduct.menu_item_id]
        );
        const zoneId = zoneResult.rows[0]?.zone_id;

        const validation = await validateVoucherDirect(client, voucherCode, {
          zoneId,
          itemId: menuItemId || oldProduct.menu_item_id,
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
    }

    // Update product row (total_price is a generated column — do not set it)
    // subtotal_override allows manual price override
    const newSubtotalOverride = subtotalOverride !== undefined ? subtotalOverride : oldProduct.subtotal_override;
    await client.query(
      `UPDATE glamping_booking_menu_products SET
         menu_item_id = $3,
         quantity = $4,
         unit_price = $5,
         serving_date = $6,
         voucher_code = $7,
         voucher_id = $8,
         discount_type = $9,
         discount_value = $10,
         discount_amount = $11,
         subtotal_override = $12
       WHERE id = $1 AND booking_id = $2`,
      [
        productId,
        bookingId,
        menuItemId || oldProduct.menu_item_id,
        newQuantity,
        newUnitPrice,
        servingDate !== undefined ? servingDate : oldProduct.serving_date,
        finalVoucherCode,
        voucherId,
        discountType,
        discountValue,
        discountAmount,
        newSubtotalOverride,
      ]
    );

    // Handle tax toggle
    if (taxInvoiceRequired !== undefined) {
      await client.query(
        `UPDATE glamping_bookings SET tax_invoice_required = $2 WHERE id = $1`,
        [bookingId, taxInvoiceRequired]
      );
    }

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Build change description
    const changes: string[] = [];
    const newItemName = menuItemId && menuItemId !== oldProduct.menu_item_id
      ? getLocalizedString(
          (await client.query(`SELECT name FROM glamping_menu_items WHERE id = $1`, [menuItemId])).rows[0]?.name
        )
      : null;

    if (newItemName) {
      changes.push(`Item: ${oldProductName} → ${newItemName}`);
    }
    if (quantity !== undefined && quantity !== oldProduct.quantity) {
      changes.push(`Qty: ${oldProduct.quantity} → ${quantity}`);
    }
    if (subtotalOverride !== undefined && subtotalOverride !== null && subtotalOverride !== oldTotalPrice) {
      changes.push(`Subtotal override: ${oldTotalPrice.toLocaleString()} → ${subtotalOverride.toLocaleString()}`);
    }
    if (voucherCode !== undefined && voucherCode !== oldProduct.voucher_code) {
      changes.push(`Voucher: ${oldProduct.voucher_code || 'none'} → ${voucherCode || 'removed'}`);
    }

    const displayName = newItemName || oldProductName;
    const description = changes.length > 0
      ? `Edited menu product "${displayName}": ${changes.join(', ')}`
      : `Edited menu product "${displayName}"`;

    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_edit', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating menu product:", error);
    return NextResponse.json(
      { error: "Failed to update menu product" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/admin/glamping/bookings/[id]/menu-products/[productId]
 * Delete a single menu product from a booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, productId } = await params;

    await client.query('BEGIN');

    // Get product info for logging
    const productResult = await client.query(
      `SELECT mp.*, mi.name as product_name
       FROM glamping_booking_menu_products mp
       LEFT JOIN glamping_menu_items mi ON mp.menu_item_id = mi.id
       WHERE mp.id = $1 AND mp.booking_id = $2`,
      [productId, bookingId]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productResult.rows[0];
    const productName = getLocalizedString(product.product_name);

    // Delete the product
    await client.query(
      `DELETE FROM glamping_booking_menu_products WHERE id = $1 AND booking_id = $2`,
      [productId, bookingId]
    );

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log deletion
    const description = `Deleted menu product "${productName}" (qty: ${product.quantity}, total: ${parseFloat(product.total_price || 0).toLocaleString()})`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_delete', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting menu product:", error);
    return NextResponse.json(
      { error: "Failed to delete menu product" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
