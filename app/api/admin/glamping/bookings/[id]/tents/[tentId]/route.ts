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
 * PUT /api/admin/glamping/bookings/[id]/tents/[tentId]
 * Update a single tent in a booking
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tentId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, tentId } = await params;
    const body = await request.json();
    const {
      itemId,
      checkInDate,
      checkOutDate,
      specialRequests,
      parameters, // Array<{ parameterId, quantity, unitPrice }>
      subtotalOverride, // number | null - admin manual override
      voucherCode,
      taxInvoiceRequired,
    } = body;

    await client.query('BEGIN');

    // Verify tent belongs to this booking
    const tentResult = await client.query(
      `SELECT bt.*, i.name as item_name
       FROM glamping_booking_tents bt
       LEFT JOIN glamping_items i ON bt.item_id = i.id
       WHERE bt.id = $1 AND bt.booking_id = $2`,
      [tentId, bookingId]
    );

    if (tentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Tent not found" }, { status: 404 });
    }

    const oldTent = tentResult.rows[0];
    const oldTentName = getLocalizedString(oldTent.item_name);

    // Calculate nights
    const checkIn = new Date(checkInDate || oldTent.check_in_date);
    const checkOut = new Date(checkOutDate || oldTent.check_out_date);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate subtotal from parameters if provided
    // unitPrice is already the total per unit for ALL nights, no need to multiply by nights
    // For per_group pricing mode, don't multiply by quantity (it's a fixed package price)
    let subtotal = 0;
    if (parameters && Array.isArray(parameters) && parameters.length > 0) {
      subtotal = parameters.reduce((sum: number, p: any) => {
        const pricingMode = p.pricingMode || 'per_person';
        if (pricingMode === 'per_group') {
          return sum + p.unitPrice; // Fixed price, don't multiply by quantity
        }
        return sum + (p.quantity * p.unitPrice);
      }, 0);
    } else {
      subtotal = parseFloat(oldTent.subtotal || '0');
    }

    // Apply subtotal override if admin provided one
    const oldSubtotal = parseFloat(oldTent.subtotal || '0');
    if (subtotalOverride !== undefined && subtotalOverride !== null) {
      subtotal = subtotalOverride;
    }

    // Handle voucher
    let discountAmount = parseFloat(oldTent.discount_amount || '0');
    let discountType = oldTent.discount_type;
    let discountValue = parseFloat(oldTent.discount_value || '0');
    let voucherId = oldTent.voucher_id;
    let finalVoucherCode = oldTent.voucher_code;

    if (voucherCode !== undefined) {
      if (voucherCode === null || voucherCode === '') {
        // Remove voucher
        discountAmount = 0;
        discountType = null;
        discountValue = 0;
        voucherId = null;
        finalVoucherCode = null;
      } else if (voucherCode !== oldTent.voucher_code) {
        // Validate new voucher
        const zoneResult = await client.query(
          `SELECT i.zone_id FROM glamping_items i WHERE i.id = $1`,
          [itemId || oldTent.item_id]
        );
        const zoneId = zoneResult.rows[0]?.zone_id;

        const validation = await validateVoucherDirect(client, voucherCode, {
          zoneId,
          itemId: itemId || oldTent.item_id,
          checkIn: checkInDate || oldTent.check_in_date,
          totalAmount: subtotal,
          applicationType: 'accommodation',
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

    // Determine subtotal_override value
    // If subtotalOverride is explicitly set, store it; if null/undefined, clear it
    const subtotalOverrideValue = subtotalOverride !== undefined && subtotalOverride !== null
      ? subtotalOverride
      : null;

    // Update tent row (nights is a generated column — do not set it)
    // subtotal stores the calculated value, subtotal_override stores the manual override
    await client.query(
      `UPDATE glamping_booking_tents SET
         item_id = $3,
         check_in_date = $4,
         check_out_date = $5,
         subtotal = $6,
         subtotal_override = $7,
         special_requests = $8,
         voucher_code = $9,
         voucher_id = $10,
         discount_type = $11,
         discount_value = $12,
         discount_amount = $13
       WHERE id = $1 AND booking_id = $2`,
      [
        tentId,
        bookingId,
        itemId || oldTent.item_id,
        checkInDate || oldTent.check_in_date,
        checkOutDate || oldTent.check_out_date,
        subtotal, // Always store calculated subtotal
        subtotalOverrideValue, // Store override separately (can be null)
        specialRequests !== undefined ? specialRequests : oldTent.special_requests,
        finalVoucherCode,
        voucherId,
        discountType,
        discountValue,
        discountAmount,
      ]
    );

    // Update booking items (parameters) if provided
    if (parameters && Array.isArray(parameters) && parameters.length > 0) {
      // Delete old booking items and parameters for this tent
      await client.query(
        `DELETE FROM glamping_booking_items WHERE booking_tent_id = $1`,
        [tentId]
      );
      await client.query(
        `DELETE FROM glamping_booking_parameters WHERE booking_tent_id = $1`,
        [tentId]
      );

      // Fetch parameter details to get label and controls_inventory
      const parameterIds = parameters.map(p => p.parameterId);
      const paramDetailsResult = await client.query(
        `SELECT id, name, controls_inventory FROM glamping_parameters WHERE id = ANY($1)`,
        [parameterIds]
      );
      const paramDetailsMap = new Map(
        paramDetailsResult.rows.map(p => [p.id, { name: p.name, controls_inventory: p.controls_inventory }])
      );

      // Insert new booking items and parameters
      for (const param of parameters) {
        // Insert into glamping_booking_items
        await client.query(
          `INSERT INTO glamping_booking_items
           (booking_id, booking_tent_id, item_id, parameter_id, quantity, unit_price, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            bookingId,
            tentId,
            itemId || oldTent.item_id,
            param.parameterId,
            param.quantity,
            param.unitPrice,
            JSON.stringify({
              checkInDate: checkInDate || oldTent.check_in_date,
              checkOutDate: checkOutDate || oldTent.check_out_date,
              pricingMode: param.pricingMode || 'per_person',
            }),
          ]
        );

        // Insert into glamping_booking_parameters (for guest count tracking)
        const paramDetails = paramDetailsMap.get(param.parameterId);
        if (paramDetails) {
          await client.query(
            `INSERT INTO glamping_booking_parameters
             (booking_id, booking_tent_id, parameter_id, label, booked_quantity, controls_inventory)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              bookingId,
              tentId,
              param.parameterId,
              paramDetails.name,
              param.quantity,
              paramDetails.controls_inventory || false,
            ]
          );
        }
      }
    }

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
    const newItemName = itemId && itemId !== oldTent.item_id
      ? (await client.query(`SELECT name FROM glamping_items WHERE id = $1`, [itemId])).rows[0]?.name
      : null;

    if (newItemName) {
      changes.push(`Item: ${oldTentName} → ${getLocalizedString(newItemName)}`);
    }
    if (checkInDate && checkInDate !== oldTent.check_in_date) {
      changes.push(`Check-in: ${oldTent.check_in_date} → ${checkInDate}`);
    }
    if (checkOutDate && checkOutDate !== oldTent.check_out_date) {
      changes.push(`Check-out: ${oldTent.check_out_date} → ${checkOutDate}`);
    }
    if (subtotalOverride !== undefined && subtotalOverride !== null && subtotalOverride !== oldSubtotal) {
      changes.push(`Subtotal override: ${oldSubtotal.toLocaleString()} → ${subtotalOverride.toLocaleString()}`);
    }
    if (voucherCode !== undefined && voucherCode !== oldTent.voucher_code) {
      changes.push(`Voucher: ${oldTent.voucher_code || 'none'} → ${voucherCode || 'removed'}`);
    }

    const description = changes.length > 0
      ? `Edited tent "${newItemName ? getLocalizedString(newItemName) : oldTentName}": ${changes.join(', ')}`
      : `Edited tent "${oldTentName}"`;

    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_edit', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating tent:", error);
    return NextResponse.json(
      { error: "Failed to update tent" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/admin/glamping/bookings/[id]/tents/[tentId]
 * Delete a tent and all cascading data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tentId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, tentId } = await params;

    await client.query('BEGIN');

    // Get tent info for logging
    const tentResult = await client.query(
      `SELECT bt.*, i.name as item_name
       FROM glamping_booking_tents bt
       LEFT JOIN glamping_items i ON bt.item_id = i.id
       WHERE bt.id = $1 AND bt.booking_id = $2`,
      [tentId, bookingId]
    );

    if (tentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Tent not found" }, { status: 404 });
    }

    const tent = tentResult.rows[0];
    const tentName = getLocalizedString(tent.item_name);

    // Delete cascading: menu products associated with this tent
    await client.query(
      `DELETE FROM glamping_booking_menu_products WHERE booking_tent_id = $1`,
      [tentId]
    );

    // Delete booking items for this tent
    await client.query(
      `DELETE FROM glamping_booking_items WHERE booking_tent_id = $1`,
      [tentId]
    );

    // Delete booking parameters for this tent
    await client.query(
      `DELETE FROM glamping_booking_parameters WHERE booking_tent_id = $1`,
      [tentId]
    );

    // Delete the tent itself
    await client.query(
      `DELETE FROM glamping_booking_tents WHERE id = $1 AND booking_id = $2`,
      [tentId, bookingId]
    );

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log deletion
    const description = `Deleted tent "${tentName}" (${tent.check_in_date} - ${tent.check_out_date}, subtotal: ${parseFloat(tent.subtotal || 0).toLocaleString()})`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_delete', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting tent:", error);
    return NextResponse.json(
      { error: "Failed to delete tent" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
