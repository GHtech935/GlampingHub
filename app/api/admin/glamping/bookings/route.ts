import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIdsFromDB } from "@/lib/auth";

// Disable caching - admin needs real-time data
export const dynamic = 'force-dynamic';

// GET /api/admin/glamping/bookings
// Fetch glamping bookings with filtering, search, and pagination
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    // Check authentication - allow admin, sale, operations, owner, glamping_owner
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get accessible zone IDs (null = all, [] = none)
    const accessibleZoneIds = await getAccessibleGlampingZoneIdsFromDB(session);

    const searchParams = request.nextUrl.searchParams;

    // Filters
    const status = searchParams.get("status"); // pending, confirmed, checked_in, checked_out, cancelled
    const paymentStatus = searchParams.get("paymentStatus"); // pending, deposit_paid, fully_paid, refund_pending, refunded, no_refund, expired
    const zoneId = searchParams.get("zoneId");
    const dateRange = searchParams.get("dateRange"); // today, this_week, this_month, custom
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search"); // search by name, email, phone, booking code

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Sorting
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "DESC";

    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (status && status !== "all") {
      conditions.push(`b.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== "all") {
      conditions.push(`b.payment_status = $${paramIndex}`);
      values.push(paymentStatus);
      paramIndex++;
    }

    // Zone filter - integrate with accessible zones
    if (accessibleZoneIds !== null) {
      // glamping_owner: filter by accessible zones
      if (accessibleZoneIds.length === 0) {
        // No zones assigned - return empty
        return NextResponse.json({ bookings: [], pagination: { currentPage: 1, totalPages: 0, totalBookings: 0, limit, hasNextPage: false, hasPreviousPage: false } });
      }

      if (zoneId && zoneId !== "all") {
        // Validate zone access
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
        // Filter by all accessible zones
        conditions.push(`z.id = ANY($${paramIndex}::uuid[])`);
        values.push(accessibleZoneIds);
        paramIndex++;
      }
    } else {
      // admin/sale: can filter by specific zone if provided
      if (zoneId && zoneId !== "all") {
        conditions.push(`z.id = $${paramIndex}`);
        values.push(zoneId);
        paramIndex++;
      }
    }

    // Date range filter
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

    // Search filter (name, email, phone, booking code)
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

    // Count total bookings (for pagination)
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_items bi ON bi.booking_id = b.id
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      ${whereClause}
    `;

    const countResult = await client.query(countQuery, values);
    const totalBookings = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalBookings / limit);

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['created_at', 'check_in_date', 'check_out_date', 'total_amount', 'booking_code'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Main query to fetch bookings with related data
    const query = `
      SELECT DISTINCT ON (b.id, b.${safeSortBy})
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
        b.created_at,
        b.confirmed_at,
        b.cancelled_at,
        b.guest_name,

        -- Customer info
        c.id as customer_id,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.email as customer_email,
        c.phone as customer_phone,

        -- Item info (first item for display)
        i.id as item_id,
        i.name as item_name,

        -- Zone info
        z.id as zone_id,
        z.name as zone_name,

        -- Actual paid amount
        COALESCE((
          SELECT SUM(p.amount)
          FROM glamping_booking_payments p
          WHERE p.booking_id = b.id AND p.status = 'paid'
        ), 0) as total_paid

      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_items bi ON bi.booking_id = b.id
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      ${whereClause}
      ORDER BY b.id, b.${safeSortBy}, b.${safeSortBy} ${safeSortOrder}
    `;

    // Wrap in subquery for proper ordering and pagination
    const paginatedQuery = `
      SELECT * FROM (${query}) AS subq
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const result = await client.query(paginatedQuery, values);

    // Format bookings data
    const bookings = result.rows.map((row) => ({
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
        paidAmount: parseFloat(row.total_paid || 0),
        currency: row.currency,
      },
      customer: {
        id: row.customer_id,
        firstName: row.customer_first_name,
        lastName: row.customer_last_name,
        fullName: row.guest_name || `${row.customer_first_name || ''} ${row.customer_last_name || ''}`.trim(),
        email: row.customer_email,
        phone: row.customer_phone,
      },
      item: {
        id: row.item_id,
        name: row.item_name,
      },
      zone: {
        id: row.zone_id,
        name: row.zone_name,
      },
      notes: {
        customer: row.customer_notes,
        internal: row.internal_notes,
      },
      createdAt: row.created_at,
      confirmedAt: row.confirmed_at,
      cancelledAt: row.cancelled_at,
    }));

    return NextResponse.json({
      bookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalBookings,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching glamping bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
