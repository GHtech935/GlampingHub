import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { recalculateGlampingBookingTotals } from '@/lib/booking-recalculate';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await pool.connect();
  try {
    // Recalculate booking totals
    await recalculateGlampingBookingTotals(client, id);

    // Get updated booking data
    const result = await client.query(
      `SELECT total_amount, deposit_due, balance_due
       FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Recalculation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
