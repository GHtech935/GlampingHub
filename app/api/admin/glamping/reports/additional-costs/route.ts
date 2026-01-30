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

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const bookingCode = searchParams.get("bookingCode");
    const zoneId = searchParams.get("zoneId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({
          data: [],
          summary: { totalCount: 0, totalAmount: 0 },
          pagination: { page: 1, limit, total: 0, totalPages: 0 },
        });
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

    // Date range filter on additional cost created_at
    if (dateFrom) {
      conditions.push(`DATE(ac.created_at) >= $${paramIndex}`);
      values.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      conditions.push(`DATE(ac.created_at) <= $${paramIndex}`);
      values.push(dateTo);
      paramIndex++;
    }

    // Booking code filter
    if (bookingCode) {
      conditions.push(`b.booking_code ILIKE $${paramIndex}`);
      values.push(`%${bookingCode}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const fromClause = `
      FROM glamping_booking_additional_costs ac
      JOIN glamping_bookings b ON ac.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
    `;

    // Get data with pagination
    const dataQuery = `
      SELECT DISTINCT ON (ac.id)
        ac.id,
        ac.name,
        ac.quantity,
        ac.unit_price,
        ac.total_price,
        ac.tax_amount,
        ac.notes,
        ac.created_at,
        b.id as booking_id,
        b.booking_code,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.phone as customer_phone
      ${fromClause}
      ${whereClause}
      ORDER BY ac.id, ac.created_at DESC
    `;

    const paginatedQuery = `
      SELECT * FROM (${dataQuery}) sub
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT ac.id) as total
      ${fromClause}
      ${whereClause}
    `;

    // Summary query - use subquery to avoid duplicate sums from JOINs
    const summaryQuery = `
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(total_price + tax_amount), 0) as total_amount
      FROM (
        SELECT DISTINCT ON (ac.id) ac.id, ac.total_price, ac.tax_amount
        ${fromClause}
        ${whereClause}
        ORDER BY ac.id
      ) distinct_costs
    `;

    values.push(limit, offset);

    const [dataResult, countResult, summaryResult] = await Promise.all([
      client.query(paginatedQuery, values),
      client.query(countQuery, values.slice(0, -2)),
      client.query(summaryQuery, values.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0]?.total || "0");
    const totalPages = Math.ceil(total / limit);

    // Convert to camelCase for frontend
    const data = dataResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      unitPrice: parseFloat(row.unit_price || "0"),
      totalPrice: parseFloat(row.total_price || "0"),
      taxAmount: parseFloat(row.tax_amount || "0"),
      notes: row.notes,
      createdAt: row.created_at,
      booking: {
        id: row.booking_id,
        bookingCode: row.booking_code,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
      },
    }));

    const summary = {
      totalCount: parseInt(summaryResult.rows[0]?.total_count || "0"),
      totalAmount: parseFloat(summaryResult.rows[0]?.total_amount || "0"),
    };

    return NextResponse.json({
      data,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching additional costs report:", error);
    return NextResponse.json({ error: "Failed to fetch additional costs report" }, { status: 500 });
  } finally {
    client.release();
  }
}
