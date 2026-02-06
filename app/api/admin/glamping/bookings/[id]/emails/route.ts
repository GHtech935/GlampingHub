import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import { GLAMPING_EMAIL_TEMPLATES, generateDinnerSectionHTML } from "@/lib/glamping-email-templates-html";
import { sendGlampingTemplateEmail, formatCurrency, generateTentsSectionHTML } from "@/lib/email";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/glamping/bookings/[id]/emails
 * Get email history for a glamping booking
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

    // Check if booking exists and get customer email
    const bookingResult = await client.query(
      `SELECT b.id, c.email as customer_email
       FROM glamping_bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const customerEmail = bookingResult.rows[0].customer_email;

    // Fetch email logs - check if email_logs table exists for glamping
    // For now, return empty since glamping may not have email integration yet
    const emails: any[] = [];

    // Check if email_logs table exists and has glamping_booking_id column
    try {
      const emailsResult = await client.query(
        `SELECT
          id,
          recipient_email,
          recipient_name,
          subject,
          status,
          sent_at,
          failed_at,
          failure_reason,
          metadata->>'template_slug' as template_slug,
          created_at
        FROM email_logs
        WHERE glamping_booking_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
        [id]
      );

      emailsResult.rows.forEach(row => {
        // Map template_slug to display name using GLAMPING_EMAIL_TEMPLATES
        const templateSlug = row.template_slug;
        const templateDef = templateSlug ? GLAMPING_EMAIL_TEMPLATES[templateSlug] : null;
        const templateName = templateDef?.name || templateSlug || 'Unknown';

        // Determine if email was sent to customer or staff
        // Customer emails: recipient matches customer email OR template doesn't start with 'glamping-admin-'
        const isCustomerEmail = customerEmail
          ? row.recipient_email?.toLowerCase() === customerEmail.toLowerCase()
          : !templateSlug?.startsWith('glamping-admin-');

        emails.push({
          id: row.id,
          recipient_email: row.recipient_email,
          recipient_name: row.recipient_name,
          subject: row.subject,
          status: row.status,
          sent_at: row.sent_at,
          failed_at: row.failed_at,
          failure_reason: row.failure_reason,
          template_slug: templateSlug,
          template_name: templateName,
          created_at: row.created_at,
          is_customer_email: isCustomerEmail,
        });
      });
    } catch (err) {
      // Table or column might not exist yet
      console.log('Email logs not available for glamping bookings');
    }

    // Available email templates for glamping (only customer-facing templates)
    const available_templates = [
      { slug: 'glamping-booking-confirmation', name: 'Xác nhận đặt chỗ' },
      { slug: 'glamping-booking-confirmed', name: 'Đặt chỗ đã được xác nhận' },
      { slug: 'glamping-payment-reminder', name: 'Nhắc nhở thanh toán' },
      { slug: 'glamping-payment-confirmation', name: 'Xác nhận thanh toán' },
      { slug: 'glamping-pre-arrival-reminder', name: 'Nhắc nhở trước khi nhận phòng' },
      { slug: 'glamping-menu-selection-reminder', name: 'Nhắc nhở chọn món ăn' },
      { slug: 'glamping-post-stay-thank-you', name: 'Cảm ơn sau chuyến đi' },
    ];

    return NextResponse.json({
      emails,
      available_templates,
    });
  } catch (error) {
    console.error("Error fetching glamping email history:", error);
    return NextResponse.json(
      { error: "Failed to fetch email history" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * Helper function to notify admin when email sending fails
 * Creates notification in database and sends email to admin users
 */
async function notifyAdminAboutFailedEmail(
  client: any,
  bookingId: string,
  bookingCode: string,
  templateSlug: string,
  templateName: string,
  recipientEmail: string,
  errorMessage: string
) {
  try {
    // Get admin and operations users to notify
    const adminResult = await client.query(
      `SELECT id, email, first_name, last_name
       FROM users
       WHERE role IN ('admin', 'operations')
         AND is_active = true
         AND email IS NOT NULL`
    );

    if (adminResult.rows.length === 0) {
      console.log('No admin users found to notify about failed email');
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';
    const notificationLink = `${appUrl}/admin/zones/all/bookings`;

    // Create notification in database for each admin user
    for (const admin of adminResult.rows) {
      try {
        await client.query(
          `INSERT INTO glamping_notifications
           (user_id, type, title, message, data, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            admin.id,
            'email_failed',
            `Email thất bại: ${templateName}`,
            `Không thể gửi email "${templateName}" cho booking #${bookingCode} đến ${recipientEmail}. Lỗi: ${errorMessage}`,
            JSON.stringify({
              booking_id: bookingId,
              booking_code: bookingCode,
              template_slug: templateSlug,
              template_name: templateName,
              recipient_email: recipientEmail,
              error_message: errorMessage,
            }),
          ]
        );
      } catch (notifErr) {
        console.error(`Failed to create notification for admin ${admin.id}:`, notifErr);
      }
    }

    // Send email notification to admin users
    for (const admin of adminResult.rows) {
      try {
        await sendGlampingTemplateEmail({
          templateSlug: 'glamping-admin-email-failed',
          to: [{ email: admin.email, name: `${admin.first_name} ${admin.last_name}`.trim() || 'Admin' }],
          variables: {
            admin_name: `${admin.first_name} ${admin.last_name}`.trim() || 'Admin',
            booking_reference: bookingCode,
            template_name: templateName,
            recipient_email: recipientEmail,
            error_message: errorMessage,
            notification_link: notificationLink,
          },
        });
        console.log(`✅ Failed email notification sent to admin ${admin.email}`);
      } catch (emailErr) {
        console.error(`Failed to send notification email to admin ${admin.email}:`, emailErr);
      }
    }

    console.log(`Notified ${adminResult.rows.length} admin(s) about failed email for booking ${bookingCode}`);
  } catch (error) {
    console.error('Error notifying admin about failed email:', error);
  }
}

/**
 * Format date to Vietnamese format (DD/MM/YYYY)
 */
function formatDateVN(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * POST /api/admin/glamping/bookings/[id]/emails
 * Send an email for a glamping booking
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
    const { template_slug } = body;

    if (!template_slug) {
      return NextResponse.json(
        { error: "Template slug is required" },
        { status: 400 }
      );
    }

    // Validate template exists and is active
    const templateDef = GLAMPING_EMAIL_TEMPLATES[template_slug];
    if (!templateDef) {
      return NextResponse.json(
        { error: `Template not found: ${template_slug}` },
        { status: 400 }
      );
    }
    if (!templateDef.isActive) {
      return NextResponse.json(
        { error: `Template is inactive: ${template_slug}` },
        { status: 400 }
      );
    }

    // Get booking and customer info with expanded fields
    // Note: glamping_bookings doesn't have zone_id directly, need to get it via booking_tents -> items -> zones
    const bookingResult = await client.query(
      `SELECT
        b.id,
        b.booking_code,
        b.check_in_date,
        b.check_out_date,
        b.total_amount,
        b.subtotal_amount,
        b.deposit_due,
        b.balance_due,
        b.total_guests,
        z.id as zone_id,
        z.name->>'vi' as zone_name,
        b.check_in_time,
        z.address as zone_address,
        c.email,
        c.first_name,
        c.last_name,
        c.phone
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_tents bt ON b.id = bt.booking_id
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE b.id = $1
      LIMIT 1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    if (!booking.email) {
      return NextResponse.json(
        { error: "Customer email not found" },
        { status: 400 }
      );
    }

    const customerName = `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'Quý khách';
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';
    const confirmationUrl = `${appUrl}/glamping/booking/confirmation/${id}`;
    const paymentUrl = `${appUrl}/glamping/booking/confirmation/${id}`;

    // Build variables object based on template requirements
    const variables: Record<string, string | number> = {
      customer_name: customerName,
      booking_reference: booking.booking_code,
      booking_code: booking.booking_code,
      zone_name: booking.zone_name || '',
      check_in_date: formatDateVN(booking.check_in_date),
      check_out_date: formatDateVN(booking.check_out_date),
      checkin_date: formatDateVN(booking.check_in_date),
      checkout_date: formatDateVN(booking.check_out_date),
      check_in_time: booking.check_in_time || '14:00',
      total_amount: formatCurrency(Number(booking.total_amount) || 0),
      amount_due: formatCurrency(Number(booking.balance_due) || Number(booking.total_amount) || 0),
      number_of_guests: Number(booking.total_guests) || 1,
      confirmation_url: confirmationUrl,
      payment_url: paymentUrl,
      notification_link: confirmationUrl,
      management_url: confirmationUrl,
      review_url: confirmationUrl,
      property_name: booking.zone_name || '',
      zone_address: booking.zone_address || '',
      due_date: formatDateVN(booking.check_in_date), // Default due date to check-in date
      // For menu update emails (if needed)
      amount: formatCurrency(Number(booking.total_amount) || 0),
    };

    // For booking confirmation template, generate dynamic HTML sections
    if (template_slug === 'glamping-booking-confirmation') {
      // Fetch tent items
      const tentsResult = await client.query(
        `SELECT
          bt.id as tent_id,
          i.name as item_name,
          bt.check_in_date,
          bt.check_out_date
        FROM glamping_booking_tents bt
        JOIN glamping_items i ON bt.item_id = i.id
        WHERE bt.booking_id = $1
        ORDER BY bt.created_at ASC`,
        [id]
      );

      // Get per-tent guest counts from booking_parameters
      const tentIds = tentsResult.rows.map((r: any) => r.tent_id);
      let guestCountMap: Record<string, number> = {};
      if (tentIds.length > 0) {
        const guestResult = await client.query(
          `SELECT booking_tent_id, SUM(booked_quantity) as total_guests
           FROM glamping_booking_parameters
           WHERE booking_id = $1 AND booking_tent_id = ANY($2)
           GROUP BY booking_tent_id`,
          [id, tentIds]
        );
        for (const row of guestResult.rows) {
          guestCountMap[row.booking_tent_id] = parseInt(row.total_guests || '0');
        }
      }

      const emailItems = tentsResult.rows.map((row: any) => ({
        name: row.item_name || 'Lều',
        checkInDate: new Date(row.check_in_date).toLocaleDateString('vi-VN'),
        checkOutDate: new Date(row.check_out_date).toLocaleDateString('vi-VN'),
        guests: guestCountMap[row.tent_id] || 0,
      }));

      variables.tents_section = generateTentsSectionHTML(emailItems);

      // Check zone dinner setting
      if (booking.zone_id) {
        const zoneResult = await client.query(
          `SELECT COALESCE(enable_dinner_reminder_email, true) as enable_dinner
           FROM glamping_zones WHERE id = $1`,
          [booking.zone_id]
        );
        const enableDinner = zoneResult.rows[0]?.enable_dinner !== false;
        variables.dinner_section = generateDinnerSectionHTML(enableDinner, confirmationUrl);
      } else {
        variables.dinner_section = '';
      }
    }

    // Send email
    const result = await sendGlampingTemplateEmail({
      templateSlug: template_slug,
      to: [{ email: booking.email, name: customerName }],
      variables,
      glampingBookingId: id,
    });

    if (!result.success) {
      // Notify admin about failed email
      await notifyAdminAboutFailedEmail(
        client,
        id,
        booking.booking_code,
        template_slug,
        templateDef.name,
        booking.email,
        result.error || 'Unknown error'
      );

      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    console.log(`✅ Email sent successfully for glamping booking ${booking.booking_code}: ${template_slug}`);

    return NextResponse.json({
      success: true,
      message: `Email "${templateDef.name}" đã được gửi thành công đến ${booking.email}`,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending glamping email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
