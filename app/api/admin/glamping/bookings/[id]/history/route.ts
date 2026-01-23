import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/glamping/bookings/[id]/history
 * Get booking status history for a glamping booking
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

    // Check if booking exists
    const bookingResult = await client.query(
      `SELECT id, booking_code, created_at FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Fetch status history
    const historyResult = await client.query(
      `SELECT
        h.id,
        h.previous_status,
        h.new_status,
        h.previous_payment_status,
        h.new_payment_status,
        h.changed_by_user_id,
        h.created_at,
        s.first_name,
        s.last_name,
        s.email
      FROM glamping_booking_status_history h
      LEFT JOIN users s ON h.changed_by_user_id = s.id
      WHERE h.booking_id = $1
      ORDER BY h.created_at DESC`,
      [id]
    );

    // Build history records with descriptions
    const history = [];

    // Add created event
    history.push({
      id: 'created',
      action: 'created',
      description: 'Booking created',
      created_at: booking.created_at,
      actor_name: null,
      actor_type: 'system',
      payment_amount: null,
    });

    // Add status change events
    historyResult.rows.forEach(row => {
      const actorName = row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email || 'Admin';

      // Status change
      if (row.previous_status !== row.new_status) {
        const statusLabels: Record<string, { vi: string; en: string }> = {
          pending: { vi: 'Chờ xác nhận', en: 'Pending' },
          confirmed: { vi: 'Đã xác nhận', en: 'Confirmed' },
          checked_in: { vi: 'Đã check-in', en: 'Checked In' },
          checked_out: { vi: 'Đã check-out', en: 'Checked Out' },
          cancelled: { vi: 'Đã huỷ', en: 'Cancelled' },
        };

        const newStatusLabel = statusLabels[row.new_status]?.vi || row.new_status;
        history.push({
          id: `status-${row.id}`,
          action: 'status_changed',
          description: `Chuyển trạng thái sang "${newStatusLabel}"`,
          created_at: row.created_at,
          actor_name: actorName,
          actor_type: 'staff',
          payment_amount: null,
        });
      }

      // Payment status change
      if (row.previous_payment_status !== row.new_payment_status) {
        const paymentLabels: Record<string, { vi: string; en: string }> = {
          pending: { vi: 'Chờ thanh toán', en: 'Pending' },
          deposit_paid: { vi: 'Đã đặt cọc', en: 'Deposit Paid' },
          fully_paid: { vi: 'Đã thanh toán đủ', en: 'Fully Paid' },
          refund_pending: { vi: 'Chờ hoàn tiền', en: 'Refund Pending' },
          refunded: { vi: 'Đã hoàn tiền', en: 'Refunded' },
          no_refund: { vi: 'Không hoàn tiền', en: 'No Refund' },
          expired: { vi: 'Hết hạn thanh toán', en: 'Expired' },
        };

        const newPaymentLabel = paymentLabels[row.new_payment_status]?.vi || row.new_payment_status;
        history.push({
          id: `payment-status-${row.id}`,
          action: 'payment_status_changed',
          description: `Cập nhật thanh toán: "${newPaymentLabel}"`,
          created_at: row.created_at,
          actor_name: actorName,
          actor_type: 'staff',
          payment_amount: null,
        });
      }
    });

    // Add payment records
    const paymentsResult = await client.query(
      `SELECT
        p.id,
        p.amount,
        p.payment_method,
        p.status,
        p.paid_at,
        p.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM glamping_booking_payments p
      LEFT JOIN users u ON p.created_by_user_id = u.id
      WHERE p.booking_id = $1 AND p.status IN ('paid', 'successful', 'completed')
      ORDER BY p.created_at DESC`,
      [id]
    );

    paymentsResult.rows.forEach(row => {
      const actorName = row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email || 'System';

      const methodLabels: Record<string, string> = {
        cash: 'Tiền mặt',
        bank_transfer: 'Chuyển khoản',
        card: 'Thẻ',
        online: 'Online',
      };

      history.push({
        id: `payment-${row.id}`,
        action: 'payment_received',
        description: `Nhận thanh toán (${methodLabels[row.payment_method] || row.payment_method})`,
        created_at: row.paid_at || row.created_at,
        actor_name: actorName,
        actor_type: 'staff',
        payment_amount: parseFloat(row.amount),
      });
    });

    // Sort by date descending
    history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching glamping booking history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
