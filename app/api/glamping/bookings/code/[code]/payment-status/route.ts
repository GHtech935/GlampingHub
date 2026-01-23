import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Disable caching - payment status needs real-time data
export const dynamic = 'force-dynamic';

/**
 * Check Glamping Payment Status API (by Booking Code)
 *
 * Endpoint is polled by frontend to check if booking has been paid.
 * Uses polling: frontend calls this API every 2 seconds while waiting for payment.
 *
 * Usage:
 * GET /api/glamping/bookings/code/{booking_code}/payment-status
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
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: bookingCode } = await params;

    // Query booking info using booking_code
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
        b.created_at
      FROM glamping_bookings b
      WHERE b.booking_code = $1`,
      [bookingCode]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = result.rows[0];
    const bookingId = booking.id;

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

    // Get payment timeout from env (default 15 minutes)
    const paymentTimeoutMinutes = parseInt(process.env.SEPAY_PAYMENT_TIMEOUT_MINUTES || '15', 10);

    // Calculate expiration based on env setting
    const now = Date.now(); // Use timestamp instead of Date object for consistency
    let createdAtTimestamp: number;
    let expiresAtTimestamp: number;
    let isExpired = false;

    // Handle case where created_at might be NULL or invalid
    if (booking.created_at) {
      // PostgreSQL returns timestamp, ensure proper parsing
      const createdAtDate = booking.created_at instanceof Date
        ? booking.created_at
        : new Date(booking.created_at);

      // Check if the date is valid
      if (isNaN(createdAtDate.getTime())) {
        console.error('[Payment Status] Invalid created_at date:', booking.created_at);
        createdAtTimestamp = now;
      } else {
        createdAtTimestamp = createdAtDate.getTime();
      }

      // Calculate expiration time from booking creation
      expiresAtTimestamp = createdAtTimestamp + (paymentTimeoutMinutes * 60 * 1000);

      // Check if payment has expired
      if (now >= expiresAtTimestamp) {
        isExpired = true;
      } else {
        isExpired = false;
      }

      // Override: if payment_status is already expired or booking is cancelled, mark as expired
      if (booking.payment_status === 'expired' || booking.status === 'cancelled') {
        isExpired = true;
      }
    } else {
      // If no created_at, default to timeout from now (don't expire immediately)
      console.warn('[Payment Status] No created_at found, using current time');
      createdAtTimestamp = now;
      expiresAtTimestamp = now + (paymentTimeoutMinutes * 60 * 1000);
      isExpired = false;
    }

    // Debug logging
    console.log('[Payment Status] ===== DEBUG START =====');
    console.log('[Payment Status] Booking Code:', bookingCode);
    console.log('[Payment Status] Booking ID:', bookingId);
    console.log('[Payment Status] Timeout (minutes):', paymentTimeoutMinutes);
    console.log('[Payment Status] created_at (raw):', booking.created_at);
    console.log('[Payment Status] created_at type:', typeof booking.created_at);
    console.log('[Payment Status] createdAt timestamp:', createdAtTimestamp);
    console.log('[Payment Status] createdAt ISO:', new Date(createdAtTimestamp).toISOString());
    console.log('[Payment Status] now timestamp:', now);
    console.log('[Payment Status] now ISO:', new Date(now).toISOString());
    console.log('[Payment Status] expiresAt timestamp:', expiresAtTimestamp);
    console.log('[Payment Status] expiresAt ISO:', new Date(expiresAtTimestamp).toISOString());
    console.log('[Payment Status] diff (ms):', expiresAtTimestamp - now);
    console.log('[Payment Status] diff (minutes):', (expiresAtTimestamp - now) / (60 * 1000));
    console.log('[Payment Status] isExpired:', isExpired, '| now >= expiresAt:', now >= expiresAtTimestamp, '| payment_status:', booking.payment_status);
    console.log('[Payment Status] ===== DEBUG END =====');

    const totalAmount = booking.total_amount ? parseFloat(booking.total_amount) : (booking.subtotal_amount ? parseFloat(booking.subtotal_amount) : 0);
    const depositDue = booking.deposit_due ? parseFloat(booking.deposit_due) : 0;
    const balanceDue = booking.balance_due ? parseFloat(booking.balance_due) : 0;

    return NextResponse.json({
      success: true,
      payment_status: booking.payment_status,
      status: booking.status,
      booking_code: booking.booking_code,
      is_expired: isExpired,
      expires_at: new Date(expiresAtTimestamp).toISOString(),
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
