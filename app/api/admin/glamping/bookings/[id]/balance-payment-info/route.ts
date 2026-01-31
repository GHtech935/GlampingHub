import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import { getBankAccountForGlampingZone } from "@/lib/bank-accounts";
import { getBalancePaymentInfo } from "@/lib/vietqr";

// Disable caching - admin needs real-time data
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/glamping/bookings/[id]/balance-payment-info
 *
 * Get QR code and bank info for balance payment (remaining amount after deposit)
 * Only available when:
 * - payment_status = 'deposit_paid'
 * - balance_due > 0
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch booking with zone info
    const bookingQuery = `
      SELECT
        gb.id,
        gb.booking_code,
        gb.status,
        gb.payment_status,
        gb.total_amount,
        gb.balance_due,
        gi.zone_id
      FROM glamping_bookings gb
      LEFT JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
      LEFT JOIN glamping_items gi ON gbi.item_id = gi.id
      WHERE gb.id = $1
      LIMIT 1
    `;

    const bookingResult = await pool.query(bookingQuery, [id]);

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingResult.rows[0];

    // Calculate actual balance (total_amount - total_paid including additional costs)
    const paymentsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM glamping_booking_payments
      WHERE booking_id = $1 AND status IN ('successful', 'completed', 'paid')
    `;
    const paymentsResult = await pool.query(paymentsQuery, [id]);
    const totalPaid = parseFloat(paymentsResult.rows[0].total_paid || 0);

    // Get additional costs
    const additionalCostsQuery = `
      SELECT COALESCE(SUM(total_price + tax_amount), 0) as additional_total
      FROM glamping_booking_additional_costs
      WHERE booking_id = $1
    `;
    const additionalCostsResult = await pool.query(additionalCostsQuery, [id]);
    const additionalCostsTotal = parseFloat(additionalCostsResult.rows[0].additional_total || 0);

    const totalAmount = parseFloat(booking.total_amount || 0) + additionalCostsTotal;
    const actualBalance = Math.max(0, totalAmount - totalPaid);

    // Validate payment status
    if (booking.payment_status !== 'deposit_paid') {
      return NextResponse.json({
        error: "Balance payment QR only available for deposit_paid bookings",
        currentStatus: booking.payment_status,
      }, { status: 400 });
    }

    // Validate balance
    if (actualBalance <= 0) {
      return NextResponse.json({
        error: "No balance due for this booking",
        balance: actualBalance,
      }, { status: 400 });
    }

    // Get bank account for the zone
    let bankAccount;
    try {
      if (booking.zone_id) {
        bankAccount = await getBankAccountForGlampingZone(booking.zone_id);
      }
    } catch (error) {
      console.warn('Could not get bank account for zone, using default:', error);
    }

    // Generate payment info with balance QR
    const paymentInfo = getBalancePaymentInfo(
      booking.booking_code,
      actualBalance,
      bankAccount
    );

    return NextResponse.json({
      success: true,
      paymentInfo: {
        bankName: paymentInfo.bankName,
        bankId: paymentInfo.bankId,
        accountNumber: paymentInfo.accountNumber,
        accountName: paymentInfo.accountName,
        amount: paymentInfo.amount,
        description: paymentInfo.description,
        qrCodeUrl: paymentInfo.qrCodeUrl,
      },
      booking: {
        bookingCode: booking.booking_code,
        totalAmount: totalAmount,
        totalPaid: totalPaid,
        balanceDue: actualBalance,
      },
    });
  } catch (error) {
    console.error("Error fetching balance payment info:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance payment info" },
      { status: 500 }
    );
  }
}
