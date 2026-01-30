import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import {
  recalculateGlampingBookingTotals,
  logGlampingBookingEditAction,
} from "@/lib/booking-recalculate";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/glamping/bookings/[id]/additional-costs
 * Get all additional costs for a booking
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

    const { id: bookingId } = await params;

    // Verify booking exists
    const bookingResult = await client.query(
      `SELECT id FROM glamping_bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Fetch additional costs
    const result = await client.query(
      `SELECT
        id,
        booking_id,
        name,
        quantity,
        unit_price,
        total_price,
        tax_rate,
        tax_amount,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      FROM glamping_booking_additional_costs
      WHERE booking_id = $1
      ORDER BY created_at DESC`,
      [bookingId]
    );

    const additionalCosts = result.rows.map(row => ({
      id: row.id,
      bookingId: row.booking_id,
      name: row.name,
      quantity: row.quantity,
      unitPrice: parseFloat(row.unit_price || '0'),
      totalPrice: parseFloat(row.total_price || '0'),
      taxRate: parseFloat(row.tax_rate || '0'),
      taxAmount: parseFloat(row.tax_amount || '0'),
      notes: row.notes || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ additionalCosts });
  } catch (error) {
    console.error("Error fetching additional costs:", error);
    return NextResponse.json(
      { error: "Failed to fetch additional costs" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * POST /api/admin/glamping/bookings/[id]/additional-costs
 * Add a new additional cost to a booking
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
    const { name, unitPrice, quantity = 1, notes } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (unitPrice === undefined || unitPrice === null || isNaN(Number(unitPrice))) {
      return NextResponse.json({ error: "Unit price is required" }, { status: 400 });
    }

    const parsedUnitPrice = parseFloat(unitPrice);
    if (parsedUnitPrice < 0) {
      return NextResponse.json({ error: "Unit price must be non-negative" }, { status: 400 });
    }

    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Verify booking exists and get tax settings
    const bookingResult = await client.query(
      `SELECT id, tax_invoice_required, tax_rate
       FROM glamping_bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingResult.rows[0];
    const taxRate = booking.tax_invoice_required ? parseFloat(booking.tax_rate || '10') : 0;

    // Insert additional cost
    const insertResult = await client.query(
      `INSERT INTO glamping_booking_additional_costs
        (booking_id, name, quantity, unit_price, tax_rate, notes, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
        id, booking_id, name, quantity, unit_price, total_price,
        tax_rate, tax_amount, notes, created_at, updated_at`,
      [bookingId, name.trim(), parsedQuantity, parsedUnitPrice, taxRate, notes || null, session.id]
    );

    const newCost = insertResult.rows[0];

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log action
    const totalPrice = parseFloat(newCost.total_price || '0');
    const description = `Added additional cost "${name}" (qty: ${parsedQuantity}, total: ${totalPrice.toLocaleString()})`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_edit', description);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      additionalCost: {
        id: newCost.id,
        bookingId: newCost.booking_id,
        name: newCost.name,
        quantity: newCost.quantity,
        unitPrice: parseFloat(newCost.unit_price || '0'),
        totalPrice: parseFloat(newCost.total_price || '0'),
        taxRate: parseFloat(newCost.tax_rate || '0'),
        taxAmount: parseFloat(newCost.tax_amount || '0'),
        notes: newCost.notes,
        createdAt: newCost.created_at,
        updatedAt: newCost.updated_at,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding additional cost:", error);
    return NextResponse.json(
      { error: "Failed to add additional cost" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
