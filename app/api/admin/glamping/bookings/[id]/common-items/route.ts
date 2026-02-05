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
      selectedDate, // Single date selected by customer (YYYY-MM-DD) or undefined
      parameters, // Array<{ parameterId, quantity, unitPrice, pricingMode? }>
      voucher, // { code, id, discountAmount, discountType, discountValue } or undefined
      priceOverride, // number | null | undefined
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

    // Verify booking tent exists and get tent's item_id
    const tentResult = await client.query(
      `SELECT id, item_id FROM glamping_booking_tents WHERE id = $1 AND booking_id = $2`,
      [bookingTentId, bookingId]
    );

    if (tentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Booking tent not found" }, { status: 404 });
    }

    const tentItemId = tentResult.rows[0]?.item_id;
    if (!tentItemId) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Tent item not found" }, { status: 404 });
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
         (booking_id, booking_tent_id, item_id, addon_item_id, parameter_id, quantity, unit_price, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          bookingId,
          bookingTentId,
          tentItemId,
          addonItemId,
          param.parameterId,
          param.quantity,
          param.unitPrice,
          JSON.stringify({
            type: 'addon',
            pricingMode,
            dates: addonDates || null,
            selectedDate: selectedDate || null,
            voucher: voucherMeta,
            priceOverride: priceOverride !== undefined ? priceOverride : null,
          }),
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
    const { itemId, bookingTentId, addonDates, selectedDate, parameters, voucher, priceOverride } = body;
    // parameters: Array<{ parameterId, quantity }>
    // addonDates: { from, to } | undefined
    // selectedDate: Single date selected by customer (YYYY-MM-DD) | undefined
    // voucher: { code, id, discountAmount, discountType, discountValue } | undefined
    // priceOverride: number | null | undefined

    if (!itemId || !parameters || !Array.isArray(parameters)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Verify these addon rows exist
    const existingRows = await client.query(
      `SELECT bi.id, bi.parameter_id, bi.quantity, bi.unit_price, bi.metadata,
              i.name as item_name
       FROM glamping_booking_items bi
       LEFT JOIN glamping_items i ON bi.addon_item_id = i.id
       WHERE bi.booking_id = $1
         AND bi.addon_item_id = $2
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

      // Build updated metadata
      const currentMetadata = existingRow.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        type: 'addon',
        pricingMode: currentMetadata.pricingMode || 'per_person',
      };

      // Update dates if provided
      if (addonDates !== undefined) {
        updatedMetadata.dates = addonDates;
      }

      // Update selectedDate if provided
      if (selectedDate !== undefined) {
        updatedMetadata.selectedDate = selectedDate;
      }

      // Update voucher if provided
      if (voucher !== undefined) {
        if (voucher) {
          updatedMetadata.voucher = {
            code: voucher.code,
            id: voucher.id,
            discountAmount: voucher.discountAmount,
            discountType: voucher.discountType,
            discountValue: voucher.discountValue,
          };
        } else {
          // Remove voucher if explicitly set to null/undefined
          delete updatedMetadata.voucher;
        }
      }

      // Update priceOverride if provided (set to null to remove)
      if (priceOverride !== undefined) {
        updatedMetadata.priceOverride = priceOverride;
        // Backward compat: Remove old field if it exists
        delete updatedMetadata.subtotalOverride;
      }

      // Update the row
      await client.query(
        `UPDATE glamping_booking_items
         SET quantity = $2,
             metadata = $3
         WHERE id = $1`,
        [existingRow.id, newQty, JSON.stringify(updatedMetadata)]
      );
    }

    // Track voucher changes
    if (voucher !== undefined) {
      const oldVoucher = existingRows.rows[0]?.metadata?.voucher;
      if (voucher && !oldVoucher) {
        changes.push(`Added voucher: ${voucher.code}`);
      } else if (!voucher && oldVoucher) {
        changes.push(`Removed voucher: ${oldVoucher.code}`);
      } else if (voucher && oldVoucher && voucher.code !== oldVoucher.code) {
        changes.push(`Changed voucher: ${oldVoucher.code} → ${voucher.code}`);
      }
    }

    // Track override changes
    if (priceOverride !== undefined) {
      const oldOverride = existingRows.rows[0]?.metadata?.priceOverride || existingRows.rows[0]?.metadata?.subtotalOverride;
      if (priceOverride !== null && !oldOverride) {
        changes.push(`Added price override: ${priceOverride.toLocaleString()}`);
      } else if (priceOverride === null && oldOverride) {
        changes.push('Removed price override');
      } else if (priceOverride !== null && oldOverride && priceOverride !== oldOverride) {
        changes.push(`Changed override: ${oldOverride} → ${priceOverride.toLocaleString()}`);
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
       LEFT JOIN glamping_items i ON bi.addon_item_id = i.id
       WHERE bi.booking_id = $1
         AND bi.addon_item_id = $2
         AND bi.metadata->>'type' = 'addon'
       LIMIT 1`,
      [bookingId, itemId]
    );

    const itemName = itemResult.rows.length > 0
      ? getLocalizedString(itemResult.rows[0].item_name)
      : 'Unknown';

    // Delete all addon rows matching booking_id + addon_item_id + booking_tent_id
    const deleteResult = await client.query(
      `DELETE FROM glamping_booking_items
       WHERE booking_id = $1
         AND addon_item_id = $2
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
