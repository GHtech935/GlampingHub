import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

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

    // Check if booking exists
    const bookingResult = await client.query(
      `SELECT id FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

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
          template_slug,
          created_at
        FROM email_logs
        WHERE glamping_booking_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
        [id]
      );

      emailsResult.rows.forEach(row => {
        emails.push({
          id: row.id,
          recipient_email: row.recipient_email,
          recipient_name: row.recipient_name,
          subject: row.subject,
          status: row.status,
          sent_at: row.sent_at,
          failed_at: row.failed_at,
          failure_reason: row.failure_reason,
          template_slug: row.template_slug,
          template_name: row.template_slug || 'Unknown',
          created_at: row.created_at,
        });
      });
    } catch (err) {
      // Table or column might not exist yet
      console.log('Email logs not available for glamping bookings');
    }

    // Available email templates for glamping
    const available_templates = [
      { slug: 'glamping_booking_confirmation', name: 'Xác nhận đặt phòng' },
      { slug: 'glamping_payment_reminder', name: 'Nhắc thanh toán' },
      { slug: 'glamping_checkin_instructions', name: 'Hướng dẫn check-in' },
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

    // Get booking and customer info
    const bookingResult = await client.query(
      `SELECT
        b.id,
        b.booking_code,
        b.check_in_date,
        b.check_out_date,
        b.total_amount,
        c.email,
        c.first_name,
        c.last_name
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

    const booking = bookingResult.rows[0];

    if (!booking.email) {
      return NextResponse.json(
        { error: "Customer email not found" },
        { status: 400 }
      );
    }

    // TODO: Implement actual email sending logic
    // For now, just log the email request
    console.log(`Email requested for glamping booking ${booking.booking_code}: ${template_slug}`);

    return NextResponse.json({
      success: true,
      message: "Email feature coming soon for glamping bookings",
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
