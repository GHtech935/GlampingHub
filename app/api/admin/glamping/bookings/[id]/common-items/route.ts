import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import {
  recalculateGlampingBookingTotals,
  logGlampingBookingEditAction,
} from "@/lib/booking-recalculate";

export const dynamic = 'force-dynamic';

function getLocalizedString(value: any, fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.vi || value.en || fallback;
  return fallback;
}

/**
 * POST /api/admin/glamping/bookings/[id]/common-items
 * Add a new common item (addon) to an existing booking
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
      addonItemId,
      addonDates, // { from, to } or undefined
      parameters, // Array<{ parameterId, quantity, unitPrice, pricingMode? }>
      voucher, // { code, id, discountAmount, discountType, discountValue } or undefined
    } = body;

    if (!addonItemId || !bookingTentId || !parameters || !Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: addonItemId, bookingTentId, parameters" },
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

    // Verify booking tent exists
    const tentResult = await client.query(
      `SELECT id FROM glamping_booking_tents WHERE id = $1 AND booking_id = $2`,
      [bookingTentId, bookingId]
    );

    if (tentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Booking tent not found" }, { status: 404 });
    }

    // Get addon item info
    const itemResult = await client.query(
      `SELECT id, name FROM glamping_items WHERE id = $1`,
      [addonItemId]
    );

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Addon item not found" }, { status: 404 });
    }

    const itemName = getLocalizedString(itemResult.rows[0].name);

    // Insert booking items for each parameter
    // Note: total_price is a generated column, so we omit it from the INSERT
    const voucherMeta = voucher?.code ? {
      code: voucher.code,
      id: voucher.id,
      discountAmount: voucher.discountAmount,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
    } : null;

    for (const param of parameters) {
      const pricingMode = param.pricingMode || 'per_person';
      await client.query(
        `INSERT INTO glamping_booking_items
         (booking_id, booking_tent_id, item_id, parameter_id, quantity, unit_price, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          bookingId,
          bookingTentId,
          addonItemId,
          param.parameterId,
          param.quantity,
          param.unitPrice,
          JSON.stringify({ type: 'addon', pricingMode, dates: addonDates || null, voucher: voucherMeta }),
        ]
      );
    }

    // Increment voucher usage if a voucher was applied
    if (voucher?.id) {
      await client.query(
        `UPDATE glamping_discounts
         SET current_uses = current_uses + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [voucher.id]
      );
    }

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log action
    const paramDesc = parameters.map((p: any) => `${p.parameterId}: ${p.quantity}`).join(', ');
    const description = `Added common item "${itemName}" (${paramDesc})`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_add', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding common item:", error);
    return NextResponse.json(
      { error: "Failed to add common item" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * PUT /api/admin/glamping/bookings/[id]/common-items
 * Update quantities for a common item (addon) group
 */
export async function PUT(
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
    const { itemId, bookingTentId, addonDates, parameters } = body;
    // parameters: Array<{ parameterId, quantity }>
    // addonDates: { from, to } | undefined

    if (!itemId || !parameters || !Array.isArray(parameters)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Verify these addon rows exist
    const existingRows = await client.query(
      `SELECT bi.id, bi.parameter_id, bi.quantity, bi.unit_price, bi.metadata,
              i.name as item_name
       FROM glamping_booking_items bi
       LEFT JOIN glamping_items i ON bi.item_id = i.id
       WHERE bi.booking_id = $1
         AND bi.item_id = $2
         AND bi.metadata->>'type' = 'addon'
         AND ${bookingTentId ? `bi.booking_tent_id = $3` : `bi.booking_tent_id IS NULL`}`,
      bookingTentId ? [bookingId, itemId, bookingTentId] : [bookingId, itemId]
    );

    if (existingRows.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Common item not found" }, { status: 404 });
    }

    const itemName = getLocalizedString(existingRows.rows[0].item_name);
    const changes: string[] = [];

    // Update quantity for each parameter row
    for (const param of parameters) {
      const existingRow = existingRows.rows.find(r => r.parameter_id === param.parameterId);
      if (!existingRow) continue;

      const oldQty = existingRow.quantity;
      const newQty = param.quantity;

      if (oldQty !== newQty) {
        changes.push(`${param.parameterId}: ${oldQty} → ${newQty}`);
      }

      // Note: total_price is a generated column, so we only update quantity
      // Also update metadata.dates if addonDates was provided
      if (addonDates !== undefined) {
        await client.query(
          `UPDATE glamping_booking_items
           SET quantity = $2,
               metadata = jsonb_set(COALESCE(metadata, '{}'), '{dates}', $3::jsonb)
           WHERE id = $1`,
          [existingRow.id, newQty, JSON.stringify(addonDates || null)]
        );
      } else {
        await client.query(
          `UPDATE glamping_booking_items
           SET quantity = $2
           WHERE id = $1`,
          [existingRow.id, newQty]
        );
      }
    }

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log action
    const description = changes.length > 0
      ? `Edited common item "${itemName}": ${changes.join(', ')}`
      : `Edited common item "${itemName}"`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_edit', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating common item:", error);
    return NextResponse.json(
      { error: "Failed to update common item" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/admin/glamping/bookings/[id]/common-items
 * Delete all rows for a common item (addon) group
 */
export async function DELETE(
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
    const { itemId, bookingTentId } = body;

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Get item name for logging
    const itemResult = await client.query(
      `SELECT i.name as item_name
       FROM glamping_booking_items bi
       LEFT JOIN glamping_items i ON bi.item_id = i.id
       WHERE bi.booking_id = $1
         AND bi.item_id = $2
         AND bi.metadata->>'type' = 'addon'
       LIMIT 1`,
      [bookingId, itemId]
    );

    const itemName = itemResult.rows.length > 0
      ? getLocalizedString(itemResult.rows[0].item_name)
      : 'Unknown';

    // Delete all addon rows matching booking_id + item_id + booking_tent_id
    const deleteResult = await client.query(
      `DELETE FROM glamping_booking_items
       WHERE booking_id = $1
         AND item_id = $2
         AND metadata->>'type' = 'addon'
         AND ${bookingTentId ? `booking_tent_id = $3` : `booking_tent_id IS NULL`}`,
      bookingTentId ? [bookingId, itemId, bookingTentId] : [bookingId, itemId]
    );

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Common item not found" }, { status: 404 });
    }

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log deletion
    const description = `Deleted common item "${itemName}" (${deleteResult.rowCount} rows)`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_delete', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting common item:", error);
    return NextResponse.json(
      { error: "Failed to delete common item" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
