import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/glamping/bookings/stats
// Returns aggregate booking statistics (counts + revenue)
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const zoneId = searchParams.get("zoneId");
    const dateRange = searchParams.get("dateRange");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    // Build WHERE clause (same logic as main bookings endpoint)
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status && status !== "all") {
      conditions.push(`b.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (paymentStatus && paymentStatus !== "all") {
      conditions.push(`b.payment_status = $${paramIndex}`);
      values.push(paymentStatus);
      paramIndex++;
    }

    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({
          stats: {
            totalBookings: 0,
            confirmedBookings: 0,
            pendingBookings: 0,
            totalRevenue: 0,
          },
        });
      }

      if (zoneId && zoneId !== "all") {
        if (!accessibleZoneIds.includes(zoneId)) {
          return NextResponse.json(
            { error: "You do not have access to this zone" },
            { status: 403 }
          );
        }
        conditions.push(`z.id = $${paramIndex}`);
        values.push(zoneId);
        paramIndex++;
      } else {
        conditions.push(`z.id = ANY($${paramIndex}::uuid[])`);
        values.push(accessibleZoneIds);
        paramIndex++;
      }
    } else {
      if (zoneId && zoneId !== "all") {
        conditions.push(`z.id = $${paramIndex}`);
        values.push(zoneId);
        paramIndex++;
      }
    }

    if (dateRange === "today") {
      conditions.push(`DATE(b.check_in_date) = CURRENT_DATE`);
    } else if (dateRange === "this_week") {
      conditions.push(
        `b.check_in_date >= DATE_TRUNC('week', CURRENT_DATE) AND b.check_in_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'`
      );
    } else if (dateRange === "this_month") {
      conditions.push(
        `b.check_in_date >= DATE_TRUNC('month', CURRENT_DATE) AND b.check_in_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`
      );
    } else if (dateRange === "custom" && dateFrom && dateTo) {
      conditions.push(
        `b.check_in_date >= $${paramIndex} AND b.check_in_date <= $${paramIndex + 1}`
      );
      values.push(dateFrom, dateTo);
      paramIndex += 2;
    }

    if (search && search.trim() !== "") {
      conditions.push(`(
        b.booking_code ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramIndex}
      )`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const statsQuery = `
      SELECT
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'confirmed') as confirmed_bookings,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'pending') as pending_bookings,
        COALESCE(SUM(DISTINCT b.total_amount), 0) as total_revenue
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_items bi ON bi.booking_id = b.id
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      ${whereClause}
    `;

    const result = await client.query(statsQuery, values);
    const row = result.rows[0];

    return NextResponse.json({
      stats: {
        totalBookings: parseInt(row.total_bookings),
        confirmedBookings: parseInt(row.confirmed_bookings),
        pendingBookings: parseInt(row.pending_bookings),
        totalRevenue: parseFloat(row.total_revenue),
      },
    });
  } catch (error) {
    console.error("Error fetching booking stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking stats" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
