import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/glamping/bookings/[id]/payments/[paymentId]
 * Update a payment record
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, paymentId } = await params;
    const body = await request.json();
    const { amount, paymentMethod, notes } = body;

    // Check if booking exists
    const bookingResult = await client.query(
      `SELECT id, status FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if payment exists
    const paymentResult = await client.query(
      `SELECT id, status FROM glamping_booking_payments WHERE id = $1 AND booking_id = $2`,
      [paymentId, id]
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }

    if (paymentMethod !== undefined) {
      updates.push(`payment_method = $${paramIndex}`);
      values.push(paymentMethod);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(paymentId);

    await client.query(
      `UPDATE glamping_booking_payments
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating glamping payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/admin/glamping/bookings/[id]/payments/[paymentId]
 * Delete (soft) a payment record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, paymentId } = await params;
    const body = await request.json();
    const { reason } = body;

    // Check if booking exists
    const bookingResult = await client.query(
      `SELECT id, status FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if payment exists
    const paymentResult = await client.query(
      `SELECT id FROM glamping_booking_payments WHERE id = $1 AND booking_id = $2`,
      [paymentId, id]
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Soft delete by updating status
    await client.query(
      `UPDATE glamping_booking_payments
       SET status = 'deleted', notes = CONCAT(COALESCE(notes, ''), ' [Deleted: ', $1, ']')
       WHERE id = $2`,
      [reason || 'No reason provided', paymentId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting glamping payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
