import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/glamping/bookings/[id]/stay
 * Update stay information for a glamping booking (guests, dates)
 */
export async function PATCH(
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
    const body = await request.json();
    const { guests, totalGuests } = body;

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

    const booking = bookingResult.rows[0];

    // Check if booking can be modified
    const modifiableStatuses = ['pending', 'confirmed', 'checked_in'];
    if (!modifiableStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: "Cannot modify this booking" },
        { status: 400 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (guests !== undefined) {
      updates.push(`guests = $${paramIndex}`);
      values.push(JSON.stringify(guests));
      paramIndex++;
    }

    if (totalGuests !== undefined) {
      updates.push(`total_guests = $${paramIndex}`);
      values.push(totalGuests);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await client.query(
      `UPDATE glamping_bookings
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating glamping stay info:", error);
    return NextResponse.json(
      { error: "Failed to update stay info" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
