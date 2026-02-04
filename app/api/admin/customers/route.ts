import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, isStaffSession, getAccessibleCampsiteIds } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin, sale, owner, and glamping_owner can view customers
    if (!['admin', 'sale', 'owner', 'glamping_owner'].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const zoneId = searchParams.get("zoneId") || "";

    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        c.email ILIKE $${params.length} OR
        c.first_name ILIKE $${params.length} OR
        c.last_name ILIKE $${params.length} OR
        c.phone ILIKE $${params.length}
      )`);
    }

    // Filter by zone if zoneId is provided
    if (zoneId) {
      params.push(zoneId);
      conditions.push(`EXISTS (
        SELECT 1 FROM glamping_bookings gb
        JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
        JOIN glamping_items gi ON gbi.item_id = gi.id
        WHERE gb.customer_id = c.id
        AND gi.zone_id = $${params.length}
      )`);
    } else {
      // For glamping-only app: only show customers who have glamping bookings
      conditions.push(`EXISTS (
        SELECT 1 FROM glamping_bookings gb
        WHERE gb.customer_id = c.id
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get customers with booking stats
    // For zone filtering, calculate only from bookings in that zone
    // For glamping-only app: always use glamping_bookings table
    let totalSpentSubquery: string;
    let lastBookingSubquery: string;
    let totalBookingsSubquery: string;

    if (zoneId) {
      const zoneParamIndex = params.indexOf(zoneId) + 1;
      totalSpentSubquery = `COALESCE((
        SELECT SUM(gb.total_amount)
        FROM glamping_bookings gb
        JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
        JOIN glamping_items gi ON gbi.item_id = gi.id
        WHERE gb.customer_id = c.id
          AND gi.zone_id = $${zoneParamIndex}
          AND gb.status != 'cancelled' AND gb.payment_status NOT IN ('expired', 'refunded', 'refund_pending', 'no_refund')
      ), 0)`;

      lastBookingSubquery = `(
        SELECT MAX(gb.created_at)
        FROM glamping_bookings gb
        JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
        JOIN glamping_items gi ON gbi.item_id = gi.id
        WHERE gb.customer_id = c.id AND gi.zone_id = $${zoneParamIndex}
      )`;

      totalBookingsSubquery = `COALESCE((
        SELECT COUNT(DISTINCT gb.id)
        FROM glamping_bookings gb
        JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
        JOIN glamping_items gi ON gbi.item_id = gi.id
        WHERE gb.customer_id = c.id AND gi.zone_id = $${zoneParamIndex}
      ), 0)`;
    } else {
      // No zone filter: calculate from all glamping bookings
      totalSpentSubquery = `COALESCE((
        SELECT SUM(total_amount)
        FROM glamping_bookings
        WHERE customer_id = c.id
          AND status != 'cancelled' AND payment_status NOT IN ('expired', 'refunded', 'refund_pending', 'no_refund')
      ), 0)`;

      lastBookingSubquery = `(
        SELECT MAX(created_at)
        FROM glamping_bookings
        WHERE customer_id = c.id
      )`;

      totalBookingsSubquery = `COALESCE((
        SELECT COUNT(*)
        FROM glamping_bookings
        WHERE customer_id = c.id
      ), 0)`;
    }

    const result = await query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
      country: string;
      total_bookings: number;
      total_spent: string;
      last_booking_date: string;
      created_at: string;
    }>(
      `
      SELECT
        c.id,
        c.email,
        c.first_name,
        c.last_name,
        c.phone,
        c.country,
        ${totalBookingsSubquery} as total_bookings,
        ${totalSpentSubquery} as total_spent,
        ${lastBookingSubquery} as last_booking_date,
        c.created_at
      FROM customers c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM customers c ${whereClause}`,
      params
    );

    const customers = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      country: row.country,
      total_bookings: parseInt(String(row.total_bookings || "0")),
      total_spent: parseFloat(String(row.total_spent || "0")),
      last_booking_date: row.last_booking_date,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: customers,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new customer
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaffSession(session) || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      phone,
      first_name,
      last_name,
      country = "Vietnam",
      address_line1,
      city,
      postal_code,
      marketing_consent = false,
    } = body;

    // Validate required fields
    if (!email || !first_name || !last_name) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const emailCheck = await query(
      `SELECT id FROM customers WHERE email = $1`,
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Create customer
    const customerId = randomUUID();
    const result = await query(
      `
      INSERT INTO customers (
        id,
        email,
        phone,
        first_name,
        last_name,
        country,
        address_line1,
        city,
        postal_code,
        marketing_consent,
        email_verified,
        is_registered,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, false, NOW(), NOW())
      RETURNING *
      `,
      [
        customerId,
        email,
        phone,
        first_name,
        last_name,
        country,
        address_line1,
        city,
        postal_code,
        marketing_consent,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
