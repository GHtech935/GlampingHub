import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getBankAccountForGlampingZone } from '@/lib/bank-accounts';
import { getBookingPaymentInfo } from '@/lib/vietqr';

// Disable caching - payment info needs real-time data
export const dynamic = 'force-dynamic';

/**
 * GET /api/glamping/bookings/[id]/payment-info
 *
 * Returns payment information for displaying QR code and bank transfer details.
 * Gets bank account from the glamping zone linked to the booking item.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = id;

    // Fetch booking with zone_id to get deposit amount, total amount
    // Data flow: booking -> booking_items -> items -> zone
    const { rows } = await pool.query(
      `SELECT
        b.booking_code,
        b.deposit_due,
        b.total_amount,
        z.id as zone_id
       FROM glamping_bookings b
       JOIN glamping_booking_items bi ON bi.booking_id = b.id
       JOIN glamping_items i ON bi.item_id = i.id
       JOIN glamping_zones z ON i.zone_id = z.id
       WHERE b.id = $1
       LIMIT 1`,
      [bookingId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = rows[0];

    // Get bank account for this glamping zone (zone-specific or default)
    let bankAccount;
    try {
      bankAccount = await getBankAccountForGlampingZone(booking.zone_id);
    } catch (error) {
      console.error('Error getting bank account:', error);
      // Fallback to ENV variables if database fails
      bankAccount = undefined;
    }

    // Determine amount based on deposit_due
    // If deposit_due > 0, it's a deposit payment; otherwise full payment
    const depositDue = booking.deposit_due ? parseFloat(booking.deposit_due) : 0;
    const totalAmount = parseFloat(booking.total_amount);

    // Pay deposit if deposit_due > 0, otherwise pay full amount
    const amount = depositDue > 0 ? depositDue : totalAmount;
    const isDeposit = depositDue > 0;

    // Generate payment info with bank account
    const paymentInfo = getBookingPaymentInfo(
      booking.booking_code,
      amount,
      isDeposit,
      bankAccount
    );

    return NextResponse.json(paymentInfo);

  } catch (error) {
    console.error('Error fetching glamping payment info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment info' },
      { status: 500 }
    );
  }
}
