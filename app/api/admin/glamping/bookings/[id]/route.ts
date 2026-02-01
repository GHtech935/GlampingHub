import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import { sendTemplateEmail } from "@/lib/email";

// Disable caching - admin needs real-time data
export const dynamic = 'force-dynamic';

// Helper to extract localized string from JSONB
function getLocalizedString(value: any, fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.vi || value.en || fallback;
  }
  return fallback;
}

// GET /api/admin/glamping/bookings/[id]
// Fetch single glamping booking details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Main query to fetch booking with all related data
    const bookingQuery = `
      SELECT
        b.id,
        b.booking_code,
        b.status,
        b.payment_status,
        b.check_in_date,
        b.check_out_date,
        b.check_in_time,
        b.check_out_time,
        b.nights,
        b.guests,
        b.total_guests,
        b.subtotal_amount,
        b.tax_amount,
        b.discount_amount,
        b.total_amount,
        b.deposit_due,
        b.balance_due,
        b.currency,
        b.customer_notes,
        b.internal_notes,
        b.invoice_notes,
        b.special_requirements,
        b.tax_invoice_required,
        b.tax_rate,
        b.created_at,
        b.updated_at,
        b.confirmed_at,
        b.cancelled_at,

        -- Customer info
        c.id as customer_id,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.country as customer_country,
        c.address_line1 as customer_address

      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1
    `;

    const bookingResult = await client.query(bookingQuery, [id]);

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const row = bookingResult.rows[0];

    // Fetch booking tents (including per-tent discount fields)
    const tentsQuery = `
      SELECT
        bt.id,
        bt.item_id,
        bt.check_in_date,
        bt.check_out_date,
        bt.nights,
        bt.subtotal,
        bt.special_requests,
        bt.display_order,
        bt.voucher_code,
        bt.voucher_id,
        bt.discount_type,
        bt.discount_value,
        bt.discount_amount,
        i.name as item_name,
        i.sku as item_sku
      FROM glamping_booking_tents bt
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      WHERE bt.booking_id = $1
      ORDER BY bt.display_order
    `;

    const tentsResult = await client.query(tentsQuery, [id]);

    // Fetch parameters for each tent
    const tentParamsQuery = `
      SELECT
        bp.booking_tent_id,
        bp.parameter_id,
        bp.label,
        bp.booked_quantity
      FROM glamping_booking_parameters bp
      WHERE bp.booking_id = $1
    `;
    const tentParamsResult = await client.query(tentParamsQuery, [id]);

    const paramsByTentId = new Map<string, Array<{ parameterId: string; label: string; bookedQuantity: number }>>();
    for (const row of tentParamsResult.rows) {
      if (!paramsByTentId.has(row.booking_tent_id)) {
        paramsByTentId.set(row.booking_tent_id, []);
      }
      paramsByTentId.get(row.booking_tent_id)!.push({
        parameterId: row.parameter_id,
        label: row.label,
        bookedQuantity: row.booked_quantity,
      });
    }

    // Fetch booking items
    const itemsQuery = `
      SELECT
        bi.id,
        bi.item_id,
        bi.booking_tent_id,
        bi.parameter_id,
        bi.quantity,
        bi.unit_price,
        bi.total_price,
        bi.metadata,
        i.name as item_name,
        i.sku as item_sku,
        p.name as parameter_name,
        z.id as zone_id,
        z.name as zone_name
      FROM glamping_booking_items bi
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_parameters p ON bi.parameter_id = p.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE bi.booking_id = $1
      ORDER BY bi.created_at
    `;

    const itemsResult = await client.query(itemsQuery, [id]);

    // Fetch booking payments
    const paymentsQuery = `
      SELECT
        bp.id,
        bp.payment_method,
        bp.amount,
        bp.status,
        bp.transaction_reference,
        bp.paid_at,
        bp.created_at
      FROM glamping_booking_payments bp
      WHERE bp.booking_id = $1
      ORDER BY bp.created_at DESC
    `;

    const paymentsResult = await client.query(paymentsQuery, [id]);

    // Fetch booking parameters
    const paramsQuery = `
      SELECT
        bp.id,
        bp.parameter_id,
        bp.label,
        bp.booked_quantity,
        bp.controls_inventory
      FROM glamping_booking_parameters bp
      WHERE bp.booking_id = $1
    `;

    const paramsResult = await client.query(paramsQuery, [id]);

    // Get zone info from items
    const zoneInfo = itemsResult.rows.length > 0 ? {
      id: itemsResult.rows[0].zone_id,
      name: getLocalizedString(itemsResult.rows[0].zone_name),
    } : null;

    // Format response
    const booking = {
      id: row.id,
      bookingCode: row.booking_code,
      status: row.status,
      paymentStatus: row.payment_status,
      dates: {
        checkIn: row.check_in_date,
        checkOut: row.check_out_date,
        checkInTime: row.check_in_time,
        checkOutTime: row.check_out_time,
        nights: row.nights,
      },
      guests: row.guests || {},
      totalGuests: row.total_guests,
      pricing: {
        subtotalAmount: parseFloat(row.subtotal_amount || 0),
        taxAmount: parseFloat(row.tax_amount || 0),
        discountAmount: parseFloat(row.discount_amount || 0),
        totalAmount: parseFloat(row.total_amount || 0),
        depositDue: parseFloat(row.deposit_due || 0),
        balanceDue: parseFloat(row.balance_due || 0),
        currency: row.currency,
      },
      customer: {
        id: row.customer_id,
        firstName: row.customer_first_name,
        lastName: row.customer_last_name,
        fullName: `${row.customer_first_name || ''} ${row.customer_last_name || ''}`.trim(),
        email: row.customer_email,
        phone: row.customer_phone,
        country: row.customer_country,
        address: row.customer_address,
      },
      zone: zoneInfo,
      tents: tentsResult.rows.map((tent) => ({
        id: tent.id,
        itemId: tent.item_id,
        itemName: getLocalizedString(tent.item_name),
        itemSku: tent.item_sku,
        checkInDate: tent.check_in_date,
        checkOutDate: tent.check_out_date,
        nights: tent.nights,
        subtotal: parseFloat(tent.subtotal || 0),
        specialRequests: tent.special_requests,
        displayOrder: tent.display_order,
        voucherCode: tent.voucher_code || null,
        discountType: tent.discount_type || null,
        discountValue: parseFloat(tent.discount_value || 0),
        discountAmount: parseFloat(tent.discount_amount || 0),
        parameters: paramsByTentId.get(tent.id) || [],
      })),
      items: itemsResult.rows.map((item) => ({
        id: item.id,
        itemId: item.item_id,
        itemName: getLocalizedString(item.item_name),
        itemSku: item.item_sku,
        parameterId: item.parameter_id,
        parameterName: getLocalizedString(item.parameter_name),
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price || 0),
        totalPrice: parseFloat(item.total_price || 0),
        bookingTentId: item.booking_tent_id,
        metadata: item.metadata,
      })),
      payments: paymentsResult.rows.map((payment) => ({
        id: payment.id,
        paymentMethod: payment.payment_method,
        amount: parseFloat(payment.amount || 0),
        status: payment.status,
        transactionReference: payment.transaction_reference,
        paidAt: payment.paid_at,
        createdAt: payment.created_at,
      })),
      parameters: paramsResult.rows.map((param) => ({
        id: param.id,
        parameterId: param.parameter_id,
        label: param.label,
        bookedQuantity: param.booked_quantity,
        controlsInventory: param.controls_inventory,
      })),
      notes: {
        customer: row.customer_notes,
        internal: row.internal_notes,
      },
      invoiceNotes: row.invoice_notes,
      specialRequirements: row.special_requirements,
      taxInvoiceRequired: row.tax_invoice_required || false,
      taxRate: row.tax_rate || 10,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      confirmedAt: row.confirmed_at,
      cancelledAt: row.cancelled_at,
    };

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error fetching glamping booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// PUT /api/admin/glamping/bookings/[id]
// Update glamping booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, paymentStatus, internalNotes } = body;

    // Start transaction
    await client.query('BEGIN');

    // Get current booking state
    const currentQuery = `
      SELECT status, payment_status, internal_notes
      FROM glamping_bookings
      WHERE id = $1
    `;
    const currentResult = await client.query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const current = currentResult.rows[0];

    // Update booking
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;

      // Set confirmed_at or cancelled_at if applicable
      if (status === 'confirmed' && current.status !== 'confirmed') {
        updateFields.push(`confirmed_at = NOW()`);
      } else if (status === 'cancelled' && current.status !== 'cancelled') {
        updateFields.push(`cancelled_at = NOW()`);
      }
    }

    if (paymentStatus !== undefined) {
      updateFields.push(`payment_status = $${paramIndex}`);
      updateValues.push(paymentStatus);
      paramIndex++;
    }

    if (internalNotes !== undefined) {
      updateFields.push(`internal_notes = $${paramIndex}`);
      updateValues.push(internalNotes);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length > 1) {
      const updateQuery = `
        UPDATE glamping_bookings
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      updateValues.push(id);

      await client.query(updateQuery, updateValues);
    }

    // Record status change in history
    if (status !== current.status || paymentStatus !== current.payment_status) {
      // Check if user exists in users table before inserting
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [session.id]
      );
      const validUserId = userCheck.rows.length > 0 ? session.id : null;

      const historyQuery = `
        INSERT INTO glamping_booking_status_history
        (booking_id, previous_status, new_status, previous_payment_status, new_payment_status, changed_by_user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(historyQuery, [
        id,
        current.status,
        status || current.status,
        current.payment_status,
        paymentStatus || current.payment_status,
        validUserId,
      ]);
    }

    await client.query('COMMIT');

    // Send email notifications if status or payment_status changed
    if (status !== current.status || paymentStatus !== current.payment_status) {
      try {
        // Fetch booking details for email
        const bookingDetailsResult = await pool.query(
          `SELECT
            gb.id,
            gb.booking_code,
            gb.customer_id,
            gb.check_in_date,
            gb.check_out_date,
            gb.total_amount,
            gb.deposit_due,
            gb.balance_due,
            gb.guests,
            c.email as customer_email,
            c.first_name as customer_first_name,
            c.last_name as customer_last_name,
            c.phone as customer_phone,
            gi.name as item_name,
            gi.zone_id,
            gz.name as zone_name
          FROM glamping_bookings gb
          JOIN customers c ON gb.customer_id = c.id
          JOIN glamping_booking_items gbi ON gbi.booking_id = gb.id
          JOIN glamping_items gi ON gbi.item_id = gi.id
          JOIN glamping_zones gz ON gi.zone_id = gz.id
          WHERE gb.id = $1
          LIMIT 1`,
          [id]
        );

        if (bookingDetailsResult.rows.length > 0) {
          const booking = bookingDetailsResult.rows[0];
          const itemName = typeof booking.item_name === 'object'
            ? (booking.item_name.vi || booking.item_name.en)
            : booking.item_name;
          const zoneName = typeof booking.zone_name === 'object'
            ? (booking.zone_name.vi || booking.zone_name.en)
            : booking.zone_name;

          const finalStatus = status || current.status;
          const finalPaymentStatus = paymentStatus || current.payment_status;

          // 1. Send email to customer if status changed to confirmed
          if (finalStatus === 'confirmed' && current.status !== 'confirmed') {
            const confirmationLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000'}/glamping/booking/confirmation/${booking.id}`;

            await sendTemplateEmail({
              templateSlug: 'glamping-booking-confirmed',
              to: [{
                email: booking.customer_email,
                name: `${booking.customer_first_name} ${booking.customer_last_name}`.trim()
              }],
              variables: {
                customer_name: booking.customer_first_name,
                booking_reference: booking.booking_code,
                zone_name: zoneName,
                checkin_date: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
                checkout_date: new Date(booking.check_out_date).toLocaleDateString('vi-VN'),
                notification_link: confirmationLink,
              },
              bookingId: id,
            });

            console.log('✅ Confirmation email sent to customer (manual status change):', booking.customer_email);
          }

          // 2. Send notification to staff (admin/sale/operations/glamping_owner)
          // Get staff: admin, sale, operations, and glamping_owner (only for this zone)
          const staffResult = await pool.query(
            `SELECT DISTINCT u.email, COALESCE(u.first_name, 'Admin') as name
             FROM users u
             LEFT JOIN user_glamping_zones ugz ON u.id = ugz.user_id AND ugz.zone_id = $1
             WHERE u.is_active = true
             AND (
               u.role IN ('admin', 'sale', 'operations')
               OR (u.role = 'glamping_owner' AND ugz.zone_id IS NOT NULL)
             )`,
            [booking.zone_id]
          );

          const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';
          const bookingLink = `${appUrl}/admin/zones/all/bookings?booking_code=${booking.booking_code}`;

          // Determine template based on status change
          let templateSlug = 'glamping-admin-new-booking-pending';
          let emailSubjectContext = '';

          if (finalStatus === 'confirmed' && current.status !== 'confirmed') {
            templateSlug = 'glamping-admin-new-booking-pending';
            emailSubjectContext = 'Admin đã xác nhận đơn đặt chỗ';
          } else if (finalStatus === 'cancelled' && current.status !== 'cancelled') {
            // For cancelled status, we might want a different template
            // But for now, use the same template
            emailSubjectContext = 'Đơn đặt chỗ đã bị hủy';
          } else if (paymentStatus !== current.payment_status) {
            emailSubjectContext = 'Trạng thái thanh toán đã thay đổi';
          }

          for (const staff of staffResult.rows) {
            await sendTemplateEmail({
              templateSlug: templateSlug,
              to: [{ email: staff.email, name: staff.name }],
              variables: {
                admin_name: staff.name,
                booking_reference: booking.booking_code,
                amount: new Intl.NumberFormat('vi-VN').format(booking.total_amount) + ' ₫',
                guest_name: `${booking.customer_first_name} ${booking.customer_last_name}`.trim(),
                guest_email: booking.customer_email,
                zone_name: zoneName,
                item_name: itemName,
                check_in_date: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
                check_out_date: new Date(booking.check_out_date).toLocaleDateString('vi-VN'),
                notification_link: bookingLink,
              },
              bookingId: id,
            });
          }

          console.log(`✅ Status change notification emails sent to ${staffResult.rows.length} staff member(s)`);
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send status change emails:', emailError);
        // Don't fail the request if email sending fails
      }

      // Send in-app (bell) notifications
      try {
        const {
          sendNotificationToCustomer,
          broadcastToRole,
          notifyGlampingOwnersOfBooking,
        } = await import('@/lib/notifications');

        // Fetch booking details for notifications
        const notificationBookingResult = await pool.query(
          `SELECT
            gb.id,
            gb.booking_code,
            gb.customer_id,
            gb.check_in_date,
            gb.check_out_date,
            gb.total_amount,
            c.first_name as customer_first_name,
            c.last_name as customer_last_name,
            gz.name as zone_name
          FROM glamping_bookings gb
          JOIN customers c ON gb.customer_id = c.id
          LEFT JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
          LEFT JOIN glamping_items gi ON gbi.item_id = gi.id
          LEFT JOIN glamping_zones gz ON gi.zone_id = gz.id
          WHERE gb.id = $1
          LIMIT 1`,
          [id]
        );
        const bookingData = notificationBookingResult.rows[0];

        if (bookingData) {
          const customerName = `${bookingData.customer_first_name} ${bookingData.customer_last_name}`.trim();
          const zoneName = typeof bookingData.zone_name === 'object'
            ? (bookingData.zone_name.vi || bookingData.zone_name.en)
            : bookingData.zone_name;

          const finalStatus = status || current.status;
          const finalPaymentStatus = paymentStatus || current.payment_status;

          // Prepare notification data
          const notificationData = {
            booking_reference: bookingData.booking_code,
            booking_code: bookingData.booking_code,
            booking_id: id,
            customer_name: customerName,
            campsite_name: zoneName,
            checkin_date: new Date(bookingData.check_in_date).toLocaleDateString('vi-VN'),
            checkout_date: new Date(bookingData.check_out_date).toLocaleDateString('vi-VN'),
            refund_message: '',
          };

          // 1. Status changed to 'confirmed'
          if (finalStatus === 'confirmed' && current.status !== 'confirmed') {
            // Notify customer
            await sendNotificationToCustomer(
              bookingData.customer_id,
              'booking_confirmed',
              notificationData,
              'glamping'
            );

            // Notify staff
            await Promise.all([
              broadcastToRole('admin', 'owner_booking_confirmed', notificationData, 'glamping'),
              broadcastToRole('operations', 'owner_booking_confirmed', notificationData, 'glamping'),
            ]);

            // Notify zone owners
            await notifyGlampingOwnersOfBooking(id, 'owner_booking_confirmed', notificationData);
          }

          // 2. Status changed to 'cancelled'
          if (finalStatus === 'cancelled' && current.status !== 'cancelled') {
            // Notify customer
            await sendNotificationToCustomer(
              bookingData.customer_id,
              'booking_cancelled',
              notificationData,
              'glamping'
            );

            // Notify staff
            await Promise.all([
              broadcastToRole('admin', 'owner_booking_cancelled', notificationData, 'glamping'),
              broadcastToRole('operations', 'owner_booking_cancelled', notificationData, 'glamping'),
            ]);

            // Notify zone owners
            await notifyGlampingOwnersOfBooking(id, 'owner_booking_cancelled', notificationData);
          }

          // 3. Payment status changed
          if (paymentStatus && paymentStatus !== current.payment_status) {
            const paymentStatusMap: Record<string, string> = {
              'fully_paid': 'Đã thanh toán đủ',
              'deposit_paid': 'Đã đặt cọc',
              'pending': 'Chờ thanh toán',
              'refunded': 'Đã hoàn tiền',
            };
            const paymentStatusDisplay = paymentStatusMap[finalPaymentStatus] || finalPaymentStatus;

            const paymentNotificationData = {
              ...notificationData,
              payment_status: paymentStatusDisplay,
              amount: new Intl.NumberFormat('vi-VN').format(bookingData.total_amount) + ' ₫',
            };

            // Notify staff
            await Promise.all([
              broadcastToRole('admin', 'payment_status_updated', paymentNotificationData, 'glamping'),
              broadcastToRole('operations', 'payment_status_updated', paymentNotificationData, 'glamping'),
            ]);

            // Notify zone owners
            await notifyGlampingOwnersOfBooking(id, 'payment_status_updated', paymentNotificationData);
          }

          console.log('✅ In-app notifications sent for booking status change');
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to send in-app notifications:', notificationError);
        // Don't fail the request if notification sending fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating glamping booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
