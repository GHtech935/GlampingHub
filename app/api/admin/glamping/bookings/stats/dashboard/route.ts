import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/glamping/bookings/stats/dashboard?zoneId=xxx
// Returns comprehensive dashboard data for a zone
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zoneId");

    if (!zoneId) {
      return NextResponse.json({ error: "zoneId is required" }, { status: 400 });
    }

    // Check zone access
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0 || !accessibleZoneIds.includes(zoneId)) {
        return NextResponse.json(
          { error: "You do not have access to this zone" },
          { status: 403 }
        );
      }
    }

    // 1. Summary stats
    const summaryQuery = `
      SELECT
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        COUNT(b.id) as total_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as confirmed_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'pending') as pending_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
        CASE WHEN COUNT(b.id) > 0
          THEN COALESCE(SUM(b.total_amount), 0) / COUNT(b.id)
          ELSE 0
        END as avg_booking_value,
        COALESCE(SUM(b.total_guests), 0) as total_guests
      FROM glamping_bookings b
      JOIN glamping_booking_items bi ON bi.booking_id = b.id
      JOIN glamping_items i ON bi.item_id = i.id
      WHERE i.zone_id = $1
    `;
    const summaryResult = await client.query(summaryQuery, [zoneId]);
    const summary = summaryResult.rows[0];

    // 2. Daily revenue (last 30 days)
    const dailyRevenueQuery = `
      SELECT
        d.date::text as date,
        COALESCE(SUM(b.total_amount), 0) as revenue,
        COUNT(b.id) as bookings
      FROM generate_series(
        CURRENT_DATE - INTERVAL '29 days',
        CURRENT_DATE,
        '1 day'
      ) d(date)
      LEFT JOIN glamping_bookings b ON DATE(b.created_at) = d.date
        AND b.id IN (
          SELECT bi.booking_id FROM glamping_booking_items bi
          JOIN glamping_items i ON bi.item_id = i.id
          WHERE i.zone_id = $1
        )
      GROUP BY d.date
      ORDER BY d.date
    `;
    const dailyResult = await client.query(dailyRevenueQuery, [zoneId]);

    // 3. Monthly revenue (last 12 months)
    const monthlyRevenueQuery = `
      SELECT
        TO_CHAR(m.month, 'YYYY-MM') as month,
        TO_CHAR(m.month, 'Mon') as month_name,
        COALESCE(SUM(b.total_amount), 0) as revenue,
        COUNT(b.id) as bookings
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'
      ) m(month)
      LEFT JOIN glamping_bookings b ON DATE_TRUNC('month', b.created_at) = m.month
        AND b.id IN (
          SELECT bi.booking_id FROM glamping_booking_items bi
          JOIN glamping_items i ON bi.item_id = i.id
          WHERE i.zone_id = $1
        )
      GROUP BY m.month
      ORDER BY m.month
    `;
    const monthlyResult = await client.query(monthlyRevenueQuery, [zoneId]);

    // 4. Status distribution
    const statusQuery = `
      SELECT
        b.status,
        COUNT(b.id) as count
      FROM glamping_bookings b
      JOIN glamping_booking_items bi ON bi.booking_id = b.id
      JOIN glamping_items i ON bi.item_id = i.id
      WHERE i.zone_id = $1
      GROUP BY b.status
      ORDER BY count DESC
    `;
    const statusResult = await client.query(statusQuery, [zoneId]);

    // 5. Recent bookings (last 10)
    const recentQuery = `
      SELECT DISTINCT ON (b.id)
        b.id,
        b.booking_code,
        b.status,
        b.total_amount,
        b.check_in_date,
        b.check_out_date,
        b.created_at,
        c.first_name,
        c.last_name,
        c.email
      FROM glamping_bookings b
      JOIN glamping_booking_items bi ON bi.booking_id = b.id
      JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE i.zone_id = $1
      ORDER BY b.id, b.created_at DESC
      LIMIT 10
    `;
    const recentResult = await client.query(recentQuery, [zoneId]);

    // Re-sort recent bookings by created_at desc after DISTINCT ON
    const recentBookings = recentResult.rows
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((row) => ({
        id: row.id,
        bookingCode: row.booking_code,
        status: row.status,
        totalAmount: parseFloat(row.total_amount),
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        createdAt: row.created_at,
        customerName: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "N/A",
      }));

    return NextResponse.json({
      summary: {
        totalRevenue: parseFloat(summary.total_revenue),
        totalBookings: parseInt(summary.total_bookings),
        confirmedBookings: parseInt(summary.confirmed_bookings),
        pendingBookings: parseInt(summary.pending_bookings),
        cancelledBookings: parseInt(summary.cancelled_bookings),
        avgBookingValue: parseFloat(summary.avg_booking_value),
        totalGuests: parseInt(summary.total_guests),
      },
      dailyRevenue: dailyResult.rows.map((row) => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        bookings: parseInt(row.bookings),
      })),
      monthlyRevenue: monthlyResult.rows.map((row) => ({
        month: row.month,
        month_name: row.month_name,
        revenue: parseFloat(row.revenue),
        bookings: parseInt(row.bookings),
      })),
      statusDistribution: statusResult.rows.map((row) => ({
        status: row.status,
        count: parseInt(row.count),
      })),
      recentBookings,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
