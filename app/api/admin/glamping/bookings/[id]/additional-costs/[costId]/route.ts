import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import {
  recalculateGlampingBookingTotals,
  logGlampingBookingEditAction,
} from "@/lib/booking-recalculate";

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/glamping/bookings/[id]/additional-costs/[costId]
 * Update an additional cost
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; costId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, costId } = await params;
    const body = await request.json();
    const { name, unitPrice, quantity, notes } = body;

    await client.query('BEGIN');

    // Verify cost belongs to this booking
    const costResult = await client.query(
      `SELECT * FROM glamping_booking_additional_costs
       WHERE id = $1 AND booking_id = $2`,
      [costId, bookingId]
    );

    if (costResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Additional cost not found" }, { status: 404 });
    }

    const oldCost = costResult.rows[0];

    // Build update fields
    const newName = name !== undefined ? name.trim() : oldCost.name;
    const newUnitPrice = unitPrice !== undefined ? parseFloat(unitPrice) : parseFloat(oldCost.unit_price);
    const newQuantity = quantity !== undefined ? parseInt(quantity, 10) : oldCost.quantity;
    const newNotes = notes !== undefined ? (notes?.trim() || null) : oldCost.notes;

    // Validation
    if (!newName) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (isNaN(newUnitPrice) || newUnitPrice < 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Invalid unit price" }, { status: 400 });
    }

    if (isNaN(newQuantity) || newQuantity < 1) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    // Update the cost (total_price and tax_amount are generated columns)
    await client.query(
      `UPDATE glamping_booking_additional_costs SET
         name = $3,
         quantity = $4,
         unit_price = $5,
         notes = $6,
         updated_at = NOW()
       WHERE id = $1 AND booking_id = $2`,
      [costId, bookingId, newName, newQuantity, newUnitPrice, newNotes]
    );

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Build change description
    const changes: string[] = [];
    if (name !== undefined && name.trim() !== oldCost.name) {
      changes.push(`Name: "${oldCost.name}" → "${newName}"`);
    }
    if (quantity !== undefined && newQuantity !== oldCost.quantity) {
      changes.push(`Qty: ${oldCost.quantity} → ${newQuantity}`);
    }
    if (unitPrice !== undefined && newUnitPrice !== parseFloat(oldCost.unit_price)) {
      changes.push(`Price: ${parseFloat(oldCost.unit_price).toLocaleString()} → ${newUnitPrice.toLocaleString()}`);
    }

    const description = changes.length > 0
      ? `Edited additional cost "${newName}": ${changes.join(', ')}`
      : `Edited additional cost "${newName}"`;

    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_edit', description);

    await client.query('COMMIT');

    // Fetch updated cost to return
    const updatedResult = await client.query(
      `SELECT * FROM glamping_booking_additional_costs WHERE id = $1`,
      [costId]
    );
    const updatedCost = updatedResult.rows[0];

    return NextResponse.json({
      success: true,
      additionalCost: {
        id: updatedCost.id,
        bookingId: updatedCost.booking_id,
        name: updatedCost.name,
        quantity: updatedCost.quantity,
        unitPrice: parseFloat(updatedCost.unit_price || '0'),
        totalPrice: parseFloat(updatedCost.total_price || '0'),
        taxRate: parseFloat(updatedCost.tax_rate || '0'),
        taxAmount: parseFloat(updatedCost.tax_amount || '0'),
        notes: updatedCost.notes,
        createdAt: updatedCost.created_at,
        updatedAt: updatedCost.updated_at,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating additional cost:", error);
    return NextResponse.json(
      { error: "Failed to update additional cost" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/admin/glamping/bookings/[id]/additional-costs/[costId]
 * Delete an additional cost
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; costId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, costId } = await params;

    await client.query('BEGIN');

    // Get cost info for logging
    const costResult = await client.query(
      `SELECT * FROM glamping_booking_additional_costs
       WHERE id = $1 AND booking_id = $2`,
      [costId, bookingId]
    );

    if (costResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Additional cost not found" }, { status: 404 });
    }

    const cost = costResult.rows[0];

    // Delete the cost
    await client.query(
      `DELETE FROM glamping_booking_additional_costs WHERE id = $1 AND booking_id = $2`,
      [costId, bookingId]
    );

    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, bookingId);

    // Log deletion
    const totalPrice = parseFloat(cost.total_price || '0');
    const description = `Deleted additional cost "${cost.name}" (qty: ${cost.quantity}, total: ${totalPrice.toLocaleString()})`;
    await logGlampingBookingEditAction(client, bookingId, session.id, 'item_delete', description);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting additional cost:", error);
    return NextResponse.json(
      { error: "Failed to delete additional cost" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
