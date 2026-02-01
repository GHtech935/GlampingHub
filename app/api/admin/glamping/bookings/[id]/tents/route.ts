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
 * POST /api/admin/glamping/bookings/[id]/tents
 * Add a new tent to an existing booking
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
      itemId,
      checkInDate,
      checkOutDate,
      parameters, // Array<{ parameterId, quantity, unitPrice, pricingMode }>
      subtotal,
      specialRequests,
      voucherCode,
    } = body;

    // Validate required fields
    if (!itemId || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: "Missing required fields: itemId, checkInDate, checkOutDate" },
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

    // Get item info
    const itemResult = await client.query(
      `SELECT id, name, zone_id FROM glamping_items WHERE id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = itemResult.rows[0];
    const itemName = getLocalizedString(item.name);

    // Check item availability for the date range
    const availabilityResult = await client.query(
      `SELECT date, status FROM glamping_availability
       WHERE item_id = $1 AND date >= $2 AND date < $3`,
      [itemId, checkInDate, checkOutDate]
    );

    const unavailableDates = availabilityResult.rows.filter(
      row => row.status === 'unavailable' || row.status === 'blocked'
    );

    if (unavailableDates.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: "Item not available for selected dates", unavailableDates: unavailableDates.map(d => d.date) },
        { status: 400 }
      );
    }

    // Calculate subtotal from parameters if not provided
    let calculatedSubtotal = subtotal || 0;
    if (!subtotal && parameters && Array.isArray(parameters) && parameters.length > 0) {
      calculatedSubtotal = parameters.reduce((sum: number, p: any) => {
        const pricingMode = p.pricingMode || 'per_person';
        if (pricingMode === 'per_group') {
          return sum + p.unitPrice; // Fixed price, don't multiply by quantity
        }
        return sum + (p.quantity * p.unitPrice);
      }, 0);
    }

    // Handle voucher
    let discountAmount = 0;
    let discountType = null;
    let discountValue = 0;
    let voucherId = null;
    let finalVoucherCode = null;

    if (voucherCode) {
      const validation = await validateVoucherDirect(client, voucherCode, {
        zoneId: item.zone_id,
        itemId,
        checkIn: checkInDate,
        totalAmount: calculatedSubtotal,
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

    // Insert new tent row (nights is a generated column — do not set it)
    const tentInsertResult = await client.query(
      `INSERT INTO glamping_booking_tents
       (booking_id, item_id, check_in_date, check_out_date, subtotal, special_requests,
        voucher_code, voucher_id, discount_type, discount_value, discount_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        bookingId,
        itemId,
        checkInDate,
        checkOutDate,
        calculatedSubtotal,
        specialRequests || null,
        finalVoucherCode,
        voucherId,
        discountType,
        discountValue,
        discountAmount,
      ]
    );

    const tentId = tentInsertResult.rows[0].id;

    // Insert booking items (parameters)
    if (parameters && Array.isArray(parameters) && parameters.length > 0) {
      for (const param of parameters) {
        await client.query(
          `INSERT INTO glamping_booking_items
           (booking_id, booking_tent_id, item_id, parameter_id, quantity, unit_price, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            bookingId,
            tentId,
            itemId,
            param.parameterId,
            param.quantity,
            param.unitPrice,
            JSON.stringify({
              checkInDate,
              checkOutDate,
              pricingMode: param.pricingMode || 'per_person',
            }),
          ]
        );
      }
    }

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log action to booking history
    const description = `Added tent "${itemName}" (${checkInDate} - ${checkOutDate}, subtotal: ${calculatedSubtotal.toLocaleString()})`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_add', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true, tentId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding tent:", error);
    return NextResponse.json(
      { error: "Failed to add tent" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
