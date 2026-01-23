import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/glamping/bookings/[id]/add-payment
 * Add a payment record to a glamping booking
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

    const { id } = await params;
    const body = await request.json();
    const { amount, paymentMethod, paymentType = 'additional', notes } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount is required and must be positive" },
        { status: 400 }
      );
    }

    // Check if booking exists
    const bookingResult = await client.query(
      `SELECT id, booking_code, total_amount, payment_status FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    await client.query('BEGIN');

    // Insert payment record
    const paymentResult = await client.query(
      `INSERT INTO glamping_booking_payments
       (booking_id, payment_method, amount, status, created_by_user_id, paid_at)
       VALUES ($1, $2, $3, 'paid', $4, NOW())
       RETURNING id`,
      [
        id,
        paymentMethod || 'cash',
        amount,
        session.id,
      ]
    );

    // Update payment status if needed
    // Get total paid after this payment
    const totalPaidResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM glamping_booking_payments
       WHERE booking_id = $1 AND status IN ('paid', 'successful', 'completed')`,
      [id]
    );

    const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid);
    const totalAmount = parseFloat(booking.total_amount);

    // Update payment_status based on total paid
    let newPaymentStatus = booking.payment_status;
    if (totalPaid >= totalAmount) {
      newPaymentStatus = 'fully_paid';
    } else if (totalPaid > 0) {
      newPaymentStatus = 'deposit_paid';
    }

    if (newPaymentStatus !== booking.payment_status) {
      await client.query(
        `UPDATE glamping_bookings
         SET payment_status = $1, updated_at = NOW()
         WHERE id = $2`,
        [newPaymentStatus, id]
      );

      // Record status change in history
      await client.query(
        `INSERT INTO glamping_booking_status_history
         (booking_id, previous_status, new_status, previous_payment_status, new_payment_status, changed_by_user_id)
         VALUES ($1, (SELECT status FROM glamping_bookings WHERE id = $1), (SELECT status FROM glamping_bookings WHERE id = $1), $2, $3, $4)`,
        [id, booking.payment_status, newPaymentStatus, session.id]
      );
    }

    await client.query('COMMIT');

    console.log(`✅ Payment record created for glamping booking ${booking.booking_code}: ${amount} VND`);

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      paymentId: paymentResult.rows[0].id,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding glamping payment:", error);
    return NextResponse.json(
      { error: "Failed to add payment" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
