import { PoolClient } from 'pg';
import pool from './db';

/**
 * Recalculate booking commission based on payment status
 * This is called after a payment is received to update commission amounts
 *
 * @param client - Database client (for transaction support)
 * @param bookingId - The booking ID to recalculate commission for
 */
export async function recalculateBookingCommission(
  client: PoolClient,
  bookingId: string
): Promise<void> {
  try {
    // Get booking details
    const bookingResult = await client.query(
      `SELECT
        id,
        payment_status,
        total_amount,
        deposit_amount,
        campsite_id
      FROM bookings
      WHERE id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      console.warn(`Booking ${bookingId} not found for commission recalculation`);
      return;
    }

    const booking = bookingResult.rows[0];
    const { payment_status, total_amount, deposit_amount } = booking;

    // Determine commission amount based on payment status
    let commissionAmount = 0;

    if (payment_status === 'fully_paid') {
      // Full payment received - commission on full amount
      commissionAmount = parseFloat(total_amount) * 0.1; // 10% commission
    } else if (payment_status === 'deposit_paid') {
      // Only deposit paid - commission on deposit only
      commissionAmount = parseFloat(deposit_amount) * 0.1; // 10% commission
    }

    // Update or insert commission record
    // Check if commission record exists
    const existingCommission = await client.query(
      `SELECT id FROM booking_commissions WHERE booking_id = $1`,
      [bookingId]
    );

    if (existingCommission.rows.length > 0) {
      // Update existing commission
      await client.query(
        `UPDATE booking_commissions
         SET commission_amount = $1,
             payment_status = $2,
             updated_at = NOW()
         WHERE booking_id = $3`,
        [commissionAmount, payment_status, bookingId]
      );
      console.log(`✅ Updated commission for booking ${bookingId}: ${commissionAmount}`);
    } else {
      // Insert new commission record
      await client.query(
        `INSERT INTO booking_commissions
         (booking_id, commission_amount, payment_status, status)
         VALUES ($1, $2, $3, 'pending')`,
        [bookingId, commissionAmount, payment_status]
      );
      console.log(`✅ Created commission for booking ${bookingId}: ${commissionAmount}`);
    }
  } catch (error) {
    console.error(`Error recalculating commission for booking ${bookingId}:`, error);
    // Don't throw - we don't want to fail the webhook if commission calc fails
  }
}

/**
 * Standalone version that creates its own transaction
 */
export async function recalculateBookingCommissionStandalone(
  bookingId: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await recalculateBookingCommission(client, bookingId);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
