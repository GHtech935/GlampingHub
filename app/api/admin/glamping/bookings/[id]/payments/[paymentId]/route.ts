import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/glamping/bookings/[id]/payments/[paymentId]
 * Update a payment record
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, paymentId } = await params;
    const body = await request.json();
    const { amount, paymentMethod, notes } = body;

    // Check if booking exists
    const bookingResult = await client.query(
      `SELECT id, status FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if payment exists
    const paymentResult = await client.query(
      `SELECT id, status FROM glamping_booking_payments WHERE id = $1 AND booking_id = $2`,
      [paymentId, id]
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }

    if (paymentMethod !== undefined) {
      updates.push(`payment_method = $${paramIndex}`);
      values.push(paymentMethod);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(paymentId);

    await client.query(
      `UPDATE glamping_booking_payments
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );

    // Send in-app notifications for payment update
    try {
      const {
        broadcastToRole,
        notifyGlampingOwnersOfBooking,
      } = await import('@/lib/notifications');

      // Get booking details for notifications
      const bookingDetailsResult = await client.query(
        `SELECT
          gb.id,
          gb.booking_code,
          gb.total_amount,
          c.first_name,
          c.last_name
        FROM glamping_bookings gb
        JOIN customers c ON gb.customer_id = c.id
        WHERE gb.id = $1`,
        [id]
      );

      if (bookingDetailsResult.rows.length > 0) {
        const bookingDetails = bookingDetailsResult.rows[0];
        const customerName = `${bookingDetails.first_name} ${bookingDetails.last_name}`.trim();

        const notificationData = {
          booking_reference: bookingDetails.booking_code,
          booking_code: bookingDetails.booking_code,
          booking_id: id,
          payment_status: 'Đã cập nhật',
          amount: amount !== undefined
            ? new Intl.NumberFormat('vi-VN').format(amount) + ' ₫'
            : new Intl.NumberFormat('vi-VN').format(bookingDetails.total_amount) + ' ₫',
          customer_name: customerName,
        };

        // Notify staff
        await Promise.all([
          broadcastToRole('admin', 'payment_status_updated', notificationData, 'glamping'),
          broadcastToRole('operations', 'payment_status_updated', notificationData, 'glamping'),
        ]);

        // Notify zone owners
        await notifyGlampingOwnersOfBooking(id, 'payment_status_updated', notificationData);

        console.log('✅ In-app notifications sent for payment update');
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to send in-app notifications:', notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating glamping payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/admin/glamping/bookings/[id]/payments/[paymentId]
 * Soft delete a payment record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, paymentId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body as { reason?: string };

    // Check if booking exists
    const bookingResult = await client.query(
      `SELECT id, status FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if payment exists
    const paymentResult = await client.query(
      `SELECT id FROM glamping_booking_payments WHERE id = $1 AND booking_id = $2`,
      [paymentId, id]
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Get payment amount before deleting
    const paymentAmountResult = await client.query(
      `SELECT amount FROM glamping_booking_payments WHERE id = $1`,
      [paymentId]
    );
    const deletedAmount = paymentAmountResult.rows[0]?.amount || 0;

    // Soft delete by updating status
    await client.query(
      `UPDATE glamping_booking_payments
       SET status = 'deleted', notes = CONCAT(COALESCE(notes, ''), ' [Deleted: ', $1::TEXT, ']')
       WHERE id = $2`,
      [reason || 'No reason provided', paymentId]
    );

    // Send in-app notifications for payment deletion
    try {
      const {
        broadcastToRole,
        notifyGlampingOwnersOfBooking,
      } = await import('@/lib/notifications');

      // Get booking details for notifications
      const bookingDetailsResult = await client.query(
        `SELECT
          gb.id,
          gb.booking_code,
          gb.total_amount,
          c.first_name,
          c.last_name
        FROM glamping_bookings gb
        JOIN customers c ON gb.customer_id = c.id
        WHERE gb.id = $1`,
        [id]
      );

      if (bookingDetailsResult.rows.length > 0) {
        const bookingDetails = bookingDetailsResult.rows[0];
        const customerName = `${bookingDetails.first_name} ${bookingDetails.last_name}`.trim();

        const notificationData = {
          booking_reference: bookingDetails.booking_code,
          booking_code: bookingDetails.booking_code,
          booking_id: id,
          payment_status: 'Đã xóa thanh toán',
          amount: new Intl.NumberFormat('vi-VN').format(deletedAmount) + ' ₫',
          customer_name: customerName,
        };

        // Notify staff
        await Promise.all([
          broadcastToRole('admin', 'payment_status_updated', notificationData, 'glamping'),
          broadcastToRole('operations', 'payment_status_updated', notificationData, 'glamping'),
        ]);

        // Notify zone owners
        await notifyGlampingOwnersOfBooking(id, 'payment_status_updated', notificationData);

        console.log('✅ In-app notifications sent for payment deletion');
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to send in-app notifications:', notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting glamping payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
