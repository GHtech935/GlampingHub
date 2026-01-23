import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Disable caching - payment status needs real-time data
export const dynamic = 'force-dynamic';

/**
 * Check Glamping Payment Status API
 *
 * Endpoint is polled by frontend to check if booking has been paid.
 * Uses polling: frontend calls this API every 2 seconds while waiting for payment.
 *
 * Usage:
 * GET /api/glamping/bookings/{booking_id}/payment-status
 *
 * Response:
 * {
 *   success: true,
 *   payment_status: 'pending' | 'deposit_paid' | 'fully_paid' | 'refund_pending' | 'refunded' | 'no_refund' | 'expired',
 *   booking_code: 'GL26000001',
 *   transaction: { ... } | null
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = id;

    // Query booking info
    const result = await pool.query(
      `SELECT
        b.id,
        b.booking_code,
        b.status,
        b.payment_status,
        b.deposit_due,
        b.balance_due,
        b.total_amount,
        b.subtotal_amount,
        b.payment_expires_at,
        b.created_at
      FROM glamping_bookings b
      WHERE b.id = $1`,
      [bookingId]
    );

    // Try to get transaction info (may fail if glamping_booking_id column doesn't exist yet)
    let transaction = null;
    try {
      const txResult = await pool.query(
        `SELECT
          transaction_code,
          amount as paid_amount,
          description as transaction_description,
          transaction_date,
          bank_name
        FROM sepay_transactions
        WHERE glamping_booking_id = $1 AND status = 'matched'
        LIMIT 1`,
        [bookingId]
      );
      if (txResult.rows.length > 0) {
        const tx = txResult.rows[0];
        transaction = {
          transaction_code: tx.transaction_code,
          amount: tx.paid_amount,
          description: tx.transaction_description,
          transaction_date: tx.transaction_date,
          bank_name: tx.bank_name,
        };
      }
    } catch {
      // glamping_booking_id column may not exist yet, ignore
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = result.rows[0];

    // Simple comparison using stored payment_expires_at
    let isExpired = booking.payment_expires_at
      ? new Date(booking.payment_expires_at) < new Date()
      : false;

    // Override: if payment_status is already expired or booking is cancelled
    if (booking.payment_status === 'expired' || booking.status === 'cancelled') {
      isExpired = true;
    }

    console.log('[Payment Status] ===== SIMPLIFIED LOGIC =====');
    console.log('[Payment Status] payment_expires_at:', booking.payment_expires_at);
    console.log('[Payment Status] now:', new Date().toISOString());
    console.log('[Payment Status] isExpired:', isExpired);
    console.log('[Payment Status] ===== END =====');

    const totalAmount = booking.total_amount ? parseFloat(booking.total_amount) : (booking.subtotal_amount ? parseFloat(booking.subtotal_amount) : 0);
    const depositDue = booking.deposit_due ? parseFloat(booking.deposit_due) : 0;
    const balanceDue = booking.balance_due ? parseFloat(booking.balance_due) : 0;

    return NextResponse.json({
      success: true,
      payment_status: booking.payment_status,
      status: booking.status,
      booking_code: booking.booking_code,
      is_expired: isExpired,
      expires_at: booking.payment_expires_at,
      transaction,
      amounts: {
        total: totalAmount,
        deposit: depositDue,
        balance: balanceDue,
        paid: transaction?.amount ? parseFloat(transaction.amount) : 0,
      },
    });
  } catch (error) {
    console.error('Error checking glamping payment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
