import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import { calculatePerItemTax } from "@/lib/glamping-tax-utils";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/glamping/bookings/[id]/toggle-tax-invoice
 * Toggle tax invoice requirement for a glamping booking
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
    const { taxInvoiceRequired } = body;

    if (typeof taxInvoiceRequired !== 'boolean') {
      return NextResponse.json(
        { error: "taxInvoiceRequired must be a boolean" },
        { status: 400 }
      );
    }

    // Get current booking
    const bookingResult = await client.query(
      `SELECT
        id,
        status,
        payment_status,
        subtotal_amount,
        discount_amount,
        tax_rate,
        tax_amount,
        total_amount
      FROM glamping_bookings
      WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Calculate new tax amount using per-item tax rates
    let newTaxAmount = 0;
    if (taxInvoiceRequired) {
      const { totalTaxAmount } = await calculatePerItemTax(client, id);
      newTaxAmount = totalTaxAmount;
    }

    const subtotal = parseFloat(booking.subtotal_amount);
    const discountAmount = parseFloat(booking.discount_amount || '0');
    const newTotalAmount = subtotal - discountAmount + newTaxAmount;

    // Calculate balance due based on payments
    const paymentsResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM glamping_booking_payments
       WHERE booking_id = $1 AND status IN ('paid', 'successful', 'completed')`,
      [id]
    );
    const totalPaid = parseFloat(paymentsResult.rows[0].total_paid);
    const newBalanceDue = Math.max(0, newTotalAmount - totalPaid);

    // Update booking (total_amount is GENERATED — do not set it directly)
    await client.query(
      `UPDATE glamping_bookings
       SET
         tax_invoice_required = $1,
         tax_amount = $2,
         balance_due = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [taxInvoiceRequired, newTaxAmount, newBalanceDue, id]
    );

    // Record in history
    await client.query(
      `INSERT INTO glamping_booking_status_history
       (booking_id, previous_status, new_status, previous_payment_status, new_payment_status, changed_by_user_id, description)
       VALUES ($1, $2, $2, $3, $3, $4, $5)`,
      [
        id,
        booking.status,
        booking.payment_status,
        session.id,
        taxInvoiceRequired ? 'VAT invoice enabled' : 'VAT invoice disabled',
      ]
    );

    return NextResponse.json({
      success: true,
      taxInvoiceRequired,
      taxAmount: newTaxAmount,
      totalAmount: newTotalAmount,
      balanceDue: newBalanceDue,
    });
  } catch (error) {
    console.error("Error toggling glamping tax invoice:", error);
    return NextResponse.json(
      { error: "Failed to toggle tax invoice" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
