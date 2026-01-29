import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);
    const searchParams = request.nextUrl.searchParams;

    const dateRange = searchParams.get("dateRange") || "this_year";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const zoneId = searchParams.get("zoneId");

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ data: [] });
      }
      if (zoneId && zoneId !== "all") {
        if (!accessibleZoneIds.includes(zoneId)) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        conditions.push(`z.id = $${paramIndex}`);
        values.push(zoneId);
        paramIndex++;
      } else {
        conditions.push(`z.id = ANY($${paramIndex}::uuid[])`);
        values.push(accessibleZoneIds);
        paramIndex++;
      }
    } else if (zoneId && zoneId !== "all") {
      conditions.push(`z.id = $${paramIndex}`);
      values.push(zoneId);
      paramIndex++;
    }

    // Date range filter on payment created_at
    const dateCol = "p.created_at";
    if (dateRange === "this_month") {
      conditions.push(`${dateCol} >= DATE_TRUNC('month', CURRENT_DATE) AND ${dateCol} < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`);
    } else if (dateRange === "last_month") {
      conditions.push(`${dateCol} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND ${dateCol} < DATE_TRUNC('month', CURRENT_DATE)`);
    } else if (dateRange === "last_30_days") {
      conditions.push(`${dateCol} >= CURRENT_DATE - INTERVAL '30 days'`);
    } else if (dateRange === "last_90_days") {
      conditions.push(`${dateCol} >= CURRENT_DATE - INTERVAL '90 days'`);
    } else if (dateRange === "this_year") {
      conditions.push(`${dateCol} >= DATE_TRUNC('year', CURRENT_DATE)`);
    } else if (dateRange === "last_year") {
      conditions.push(`${dateCol} >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND ${dateCol} < DATE_TRUNC('year', CURRENT_DATE)`);
    } else if (dateRange === "custom" && dateFrom && dateTo) {
      conditions.push(`DATE(${dateCol}) >= $${paramIndex} AND DATE(${dateCol}) <= $${paramIndex + 1}`);
      values.push(dateFrom, dateTo);
      paramIndex += 2;
    }
    // "all_time" = no date filter

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const fromClause = `
      FROM glamping_booking_payments p
      JOIN glamping_bookings b ON p.booking_id = b.id
      LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
    `;

    // Group by month, aggregate payments/refunds
    const dataQuery = `
      SELECT
        TO_CHAR(p.created_at, 'YYYY-MM') as month,
        TO_CHAR(p.created_at, 'Mon YYYY') as month_label,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as transactions,
        COALESCE(SUM(DISTINCT CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as payments,
        COALESCE(SUM(DISTINCT CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END), 0) as refunds,
        COALESCE(SUM(DISTINCT CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0)
          - COALESCE(SUM(DISTINCT CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END), 0) as total
      ${fromClause}
      ${whereClause}
      GROUP BY TO_CHAR(p.created_at, 'YYYY-MM'), TO_CHAR(p.created_at, 'Mon YYYY')
      ORDER BY month ASC
    `;

    const dataResult = await client.query(dataQuery, values);

    const data = dataResult.rows.map((row) => ({
      month: row.month,
      monthLabel: row.month_label,
      transactions: parseInt(row.transactions || "0"),
      payments: parseFloat(row.payments || "0"),
      refunds: parseFloat(row.refunds || "0"),
      total: parseFloat(row.total || "0"),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 });
  } finally {
    client.release();
  }
}
