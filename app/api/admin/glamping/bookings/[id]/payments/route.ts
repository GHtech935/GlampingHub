import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import { getGlampingBookingLiveTotal } from "@/lib/booking-recalculate";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/glamping/bookings/[id]/payments
 * Get all payments for a glamping booking
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

    const { id } = await params;

    // Check if booking exists and get status
    const bookingResult = await client.query(
      `SELECT id, status, payment_status, total_amount FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Fetch all payments for this booking
    const paymentsResult = await client.query(
      `SELECT
        id,
        payment_method,
        amount,
        status,
        notes,
        transaction_reference,
        created_by_user_id,
        paid_at,
        created_at
      FROM glamping_booking_payments
      WHERE booking_id = $1
      ORDER BY created_at DESC`,
      [id]
    );

    // Get staff names for created_by_user_id
    const staffIds = [...new Set(paymentsResult.rows.filter(r => r.created_by_user_id).map(r => r.created_by_user_id))];
    let staffNames: Record<string, string> = {};

    if (staffIds.length > 0) {
      const staffResult = await client.query(
        `SELECT id, first_name, last_name, email FROM users WHERE id = ANY($1)`,
        [staffIds]
      );
      staffResult.rows.forEach(s => {
        staffNames[s.id] = s.first_name && s.last_name
          ? `${s.first_name} ${s.last_name}`
          : s.email;
      });
    }

    const payments = paymentsResult.rows.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount),
      currency: 'VND',
      paymentType: 'payment',
      paymentMethod: row.payment_method,
      status: row.status === 'paid' || row.status === 'successful' ? 'completed' : row.status,
      notes: row.notes || '',
      transactionReference: row.transaction_reference,
      createdBy: row.created_by_user_id || '',
      createdByName: row.created_by_user_id ? (staffNames[row.created_by_user_id] || 'Admin') : 'System',
      createdAt: row.created_at,
      processedAt: row.paid_at,
    }));

    // Calculate total paid
    const totalPaid = payments
      .filter(p => ['completed', 'paid', 'successful'].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate live total from individual items (not the potentially stale stored value)
    const liveTotal = await getGlampingBookingLiveTotal(client, id);

    // Determine if booking can be modified
    const modifiableStatuses = ['pending', 'confirmed', 'checked_in'];
    const canModify = modifiableStatuses.includes(booking.status);

    return NextResponse.json({
      payments,
      totalPaid,
      totalAmount: liveTotal.totalAmount,
      canModify,
    });
  } catch (error) {
    console.error("Error fetching glamping payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
