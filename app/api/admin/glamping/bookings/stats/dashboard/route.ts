import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/glamping/bookings/stats/dashboard?zoneId=xxx
// Returns comprehensive dashboard data for a zone
export async function GET(request: NextRequest) {
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

    // Step 1: Pre-fetch zone booking IDs (runs ONCE instead of per-row in each query)
    const prefetchResult = await pool.query(
      `SELECT DISTINCT bi.booking_id
       FROM glamping_booking_items bi
       JOIN glamping_items i ON bi.item_id = i.id
       WHERE i.zone_id = $1`,
      [zoneId]
    );
    const bookingIds = prefetchResult.rows.map((r) => r.booking_id);

    // Early return if no bookings - generate empty date series in JS
    if (bookingIds.length === 0) {
      return NextResponse.json({
        summary: {
          totalRevenue: 0,
          totalBookings: 0,
          confirmedBookings: 0,
          pendingBookings: 0,
          cancelledBookings: 0,
          avgBookingValue: 0,
          totalGuests: 0,
        },
        dailyRevenue: generateEmptyDailySeries(),
        monthlyRevenue: generateEmptyMonthlySeries(),
        statusDistribution: [],
        recentBookings: [],
      });
    }

    // Step 2: Run all 5 queries in PARALLEL using pool.query (not client.query)
    // Each query filters by pre-fetched booking IDs using ANY($1::uuid[])
    const [summaryResult, dailyResult, monthlyResult, statusResult, recentResult] =
      await Promise.all([
        // 1. Summary stats
        pool.query(
          `SELECT
            COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'pending')), 0) as total_revenue,
            COUNT(id) as total_bookings,
            COUNT(id) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
            COUNT(id) FILTER (WHERE status = 'pending') as pending_bookings,
            COUNT(id) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
            CASE WHEN COUNT(id) FILTER (WHERE status NOT IN ('cancelled', 'pending')) > 0
              THEN COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'pending')), 0) / COUNT(id) FILTER (WHERE status NOT IN ('cancelled', 'pending'))
              ELSE 0
            END as avg_booking_value,
            COALESCE(SUM(total_guests), 0) as total_guests
          FROM glamping_bookings
          WHERE id = ANY($1::uuid[])`,
          [bookingIds]
        ),

        // 2. Daily revenue (last 30 days)
        pool.query(
          `SELECT
            d.date::text as date,
            COALESCE(SUM(b.total_amount), 0) as revenue,
            COUNT(b.id) as bookings
          FROM generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'
          ) d(date)
          LEFT JOIN glamping_bookings b ON DATE(b.created_at) = d.date
            AND b.status NOT IN ('cancelled', 'pending')
            AND b.id = ANY($1::uuid[])
          GROUP BY d.date
          ORDER BY d.date`,
          [bookingIds]
        ),

        // 3. Monthly revenue (last 12 months)
        pool.query(
          `SELECT
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
            AND b.status NOT IN ('cancelled', 'pending')
            AND b.id = ANY($1::uuid[])
          GROUP BY m.month
          ORDER BY m.month`,
          [bookingIds]
        ),

        // 4. Status distribution
        pool.query(
          `SELECT
            status,
            COUNT(id) as count
          FROM glamping_bookings
          WHERE id = ANY($1::uuid[])
          GROUP BY status
          ORDER BY count DESC`,
          [bookingIds]
        ),

        // 5. Recent bookings (last 10)
        pool.query(
          `SELECT
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
          LEFT JOIN customers c ON b.customer_id = c.id
          WHERE b.id = ANY($1::uuid[])
          ORDER BY b.created_at DESC
          LIMIT 10`,
          [bookingIds]
        ),
      ]);

    const summary = summaryResult.rows[0];

    const recentBookings = recentResult.rows.map((row) => ({
      id: row.id,
      bookingCode: row.booking_code,
      status: row.status,
      totalAmount: parseFloat(row.total_amount),
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      createdAt: row.created_at,
      customerName:
        [row.first_name, row.last_name].filter(Boolean).join(" ") ||
        row.email ||
        "N/A",
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
  }
}

// Generate empty daily series for last 30 days (used when no bookings exist)
function generateEmptyDailySeries() {
  const series = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    series.push({
      date: date.toISOString().split("T")[0],
      revenue: 0,
      bookings: 0,
    });
  }
  return series;
}

// Generate empty monthly series for last 12 months (used when no bookings exist)
function generateEmptyMonthlySeries() {
  const series = [];
  const today = new Date();
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    series.push({
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      month_name: monthNames[date.getMonth()],
      revenue: 0,
      bookings: 0,
    });
  }
  return series;
}
