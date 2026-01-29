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

    const dateRange = searchParams.get("dateRange") || "last_30_days";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const search = searchParams.get("search");
    const zoneId = searchParams.get("zoneId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = (searchParams.get("sortOrder") || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { currentPage: 1, totalPages: 0, total: 0, limit },
          filterOptions: {},
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

    // Date range filter on payment created_at
    const dateCol = "p.created_at";
    if (dateRange === "today") {
      conditions.push(`DATE(${dateCol}) = CURRENT_DATE`);
    } else if (dateRange === "yesterday") {
      conditions.push(`DATE(${dateCol}) = CURRENT_DATE - INTERVAL '1 day'`);
    } else if (dateRange === "this_week") {
      conditions.push(`${dateCol} >= DATE_TRUNC('week', CURRENT_DATE) AND ${dateCol} < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'`);
    } else if (dateRange === "this_month") {
      conditions.push(`${dateCol} >= DATE_TRUNC('month', CURRENT_DATE) AND ${dateCol} < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`);
    } else if (dateRange === "last_month") {
      conditions.push(`${dateCol} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND ${dateCol} < DATE_TRUNC('month', CURRENT_DATE)`);
    } else if (dateRange === "last_30_days") {
      conditions.push(`${dateCol} >= CURRENT_DATE - INTERVAL '30 days'`);
    } else if (dateRange === "last_90_days") {
      conditions.push(`${dateCol} >= CURRENT_DATE - INTERVAL '90 days'`);
    } else if (dateRange === "this_year") {
      conditions.push(`${dateCol} >= DATE_TRUNC('year', CURRENT_DATE)`);
    } else if (dateRange === "custom" && dateFrom && dateTo) {
      conditions.push(`DATE(${dateCol}) >= $${paramIndex} AND DATE(${dateCol}) <= $${paramIndex + 1}`);
      values.push(dateFrom, dateTo);
      paramIndex += 2;
    }

    // Status filter
    if (status) {
      conditions.push(`p.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Payment method filter
    if (paymentMethod) {
      conditions.push(`p.payment_method = $${paramIndex}`);
      values.push(paymentMethod);
      paramIndex++;
    }

    // Search filter
    if (search) {
      conditions.push(`(
        b.booking_code ILIKE $${paramIndex}
        OR CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramIndex}
      )`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const fromClause = `
      FROM glamping_booking_payments p
      JOIN glamping_bookings b ON p.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      LEFT JOIN users u ON p.created_by_user_id = u.id
      LEFT JOIN sepay_transactions st ON st.glamping_booking_id = b.id
        AND st.transaction_code = p.transaction_reference
    `;

    // Sortable columns map
    const sortColumnMap: Record<string, string> = {
      created_at: "p.created_at",
      amount: "p.amount",
    };
    const sortCol = sortColumnMap[sortBy] || "p.created_at";

    const dataQuery = `
      SELECT DISTINCT ON (p.id)
        p.id,
        p.amount,
        p.status,
        p.payment_method as payment_method,
        p.created_at,
        p.paid_at,
        b.id as booking_id,
        b.booking_code,
        b.check_in_date,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        CONCAT(u.first_name, ' ', u.last_name) as created_by,
        p.transaction_reference,
        st.sepay_transaction_id as sepay_reference,
        st.account_number as sepay_account,
        st.description as sepay_content
      ${fromClause}
      ${whereClause}
      ORDER BY p.id, p.created_at DESC
    `;

    const paginatedQuery = `SELECT * FROM (${dataQuery}) sub ORDER BY ${sortBy === "amount" ? "amount" : "created_at"} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const countQuery = `SELECT COUNT(DISTINCT p.id) as total ${fromClause} ${whereClause}`;

    values.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      client.query(paginatedQuery, values),
      client.query(countQuery, values.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0]?.total || "0");
    const totalPages = Math.ceil(total / limit);

    // Convert to camelCase for frontend
    const data = dataResult.rows.map((row) => ({
      id: row.id,
      amount: parseFloat(row.amount || "0"),
      status: row.status,
      paymentMethod: row.payment_method,
      transactionReference: row.transaction_reference,
      note: null,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      bookingId: row.booking_id,
      bookingCode: row.booking_code,
      checkInDate: row.check_in_date,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      createdBy: row.created_by,
      sepayRef: row.sepay_reference,
      sepayAccount: row.sepay_account,
      sepayContent: row.sepay_content,
    }));

    // Fetch filter options
    const zoneFilter = zoneId && zoneId !== "all"
      ? `AND z.id = '${zoneId}'`
      : accessibleZoneIds
        ? `AND z.id = ANY(ARRAY[${accessibleZoneIds.map(id => `'${id}'`).join(",")}]::uuid[])`
        : "";

    const [statusesRes, methodsRes] = await Promise.all([
      client.query(`
        SELECT DISTINCT p.status as value, p.status as label
        FROM glamping_booking_payments p
        JOIN glamping_bookings b ON p.booking_id = b.id
        LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
        LEFT JOIN glamping_items i ON bt.item_id = i.id
        LEFT JOIN glamping_zones z ON i.zone_id = z.id
        WHERE p.status IS NOT NULL ${zoneFilter}
        ORDER BY p.status
      `),
      client.query(`
        SELECT DISTINCT p.payment_method as value, p.payment_method as label
        FROM glamping_booking_payments p
        JOIN glamping_bookings b ON p.booking_id = b.id
        LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
        LEFT JOIN glamping_items i ON bt.item_id = i.id
        LEFT JOIN glamping_zones z ON i.zone_id = z.id
        WHERE p.payment_method IS NOT NULL ${zoneFilter}
        ORDER BY p.payment_method
      `),
    ]);

    const filterOptions = {
      statuses: statusesRes.rows.map(r => ({ value: r.value, label: r.label })),
      paymentMethods: methodsRes.rows.map(r => ({ value: r.value, label: r.label?.replace(/_/g, " ") })),
    };

    return NextResponse.json({
      data,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filterOptions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  } finally {
    client.release();
  }
}
