import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);

    const searchParams = request.nextUrl.searchParams;

    // Filters
    const dateSource = searchParams.get("dateSource") || "created";
    const dateRange = searchParams.get("dateRange") || "all_time";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const categoryId = searchParams.get("categoryId");
    const tagId = searchParams.get("tagId");
    const itemId = searchParams.get("itemId");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const zoneId = searchParams.get("zoneId");

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Sorting
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "DESC";

    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ data: [], pagination: { currentPage: 1, totalPages: 0, total: 0, limit }, filterOptions: {} });
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

    // Date column based on date source
    const dateCol =
      dateSource === "check_in" ? "b.check_in_date" :
      dateSource === "check_out" ? "b.check_out_date" :
      "b.created_at";

    // Date range filter
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

    // Category filter
    if (categoryId) {
      conditions.push(`cat.id = $${paramIndex}`);
      values.push(categoryId);
      paramIndex++;
    }

    // Tag filter
    if (tagId) {
      conditions.push(`EXISTS (SELECT 1 FROM glamping_item_tags git WHERE git.item_id = i.id AND git.tag_id = $${paramIndex})`);
      values.push(tagId);
      paramIndex++;
    }

    // Item filter
    if (itemId) {
      conditions.push(`i.id = $${paramIndex}`);
      values.push(itemId);
      paramIndex++;
    }

    // Status filter
    if (status) {
      conditions.push(`b.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Source filter
    if (source) {
      conditions.push(`b.referral_source = $${paramIndex}`);
      values.push(source);
      paramIndex++;
    }

    // Search filter
    if (search && search.trim()) {
      conditions.push(`(
        b.booking_code ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramIndex}
      )`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_categories cat ON i.category_id = cat.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Sort validation
    const allowedSortFields: Record<string, string> = {
      created_at: "b.created_at",
      check_in_date: "b.check_in_date",
      check_out_date: "b.check_out_date",
      total_amount: "b.total_amount",
      booking_code: "b.booking_code",
      customer_name: "c.first_name",
      status: "b.status",
    };
    const safeSortCol = allowedSortFields[sortBy] || "b.created_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Main query
    const query = `
      SELECT DISTINCT ON (b.id)
        b.id,
        b.booking_code,
        b.status,
        b.payment_status,
        b.check_in_date,
        b.check_out_date,
        b.nights,
        b.total_guests,
        b.subtotal_amount,
        b.tax_amount,
        b.discount_amount,
        b.total_amount,
        b.deposit_due,
        b.balance_due,
        b.currency,
        b.referral_source,
        b.created_at,
        b.created_by_user_id,

        c.id as customer_id,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.email as customer_email,
        c.phone as customer_phone,

        i.id as item_id,
        i.name as item_name,

        cat.id as category_id,
        cat.name as category_name,

        z.id as zone_id,
        z.name as zone_name,

        u.first_name as staff_first_name,
        u.last_name as staff_last_name

      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_categories cat ON i.category_id = cat.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      LEFT JOIN users u ON b.created_by_user_id = u.id
      ${whereClause}
      ORDER BY b.id
    `;

    // Map sort columns to the subquery output column names
    const subqSortMap: Record<string, string> = {
      "b.created_at": "created_at",
      "b.check_in_date": "check_in_date",
      "b.check_out_date": "check_out_date",
      "b.total_amount": "total_amount",
      "b.booking_code": "booking_code",
      "c.first_name": "customer_first_name",
      "b.status": "status",
    };
    const subqSortCol = subqSortMap[safeSortCol] || "created_at";

    const paginatedQuery = `
      SELECT * FROM (${query}) AS subq
      ORDER BY subq.${subqSortCol} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const result = await client.query(paginatedQuery, values);

    const data = result.rows.map(row => ({
      id: row.id,
      bookingCode: row.booking_code,
      status: row.status,
      paymentStatus: row.payment_status,
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      nights: row.nights,
      totalGuests: row.total_guests,
      subtotalAmount: parseFloat(row.subtotal_amount || 0),
      taxAmount: parseFloat(row.tax_amount || 0),
      discountAmount: parseFloat(row.discount_amount || 0),
      totalAmount: parseFloat(row.total_amount || 0),
      depositDue: parseFloat(row.deposit_due || 0),
      balanceDue: parseFloat(row.balance_due || 0),
      currency: row.currency,
      referralSource: row.referral_source,
      createdAt: row.created_at,
      customer: {
        id: row.customer_id,
        firstName: row.customer_first_name,
        lastName: row.customer_last_name,
        fullName: `${row.customer_first_name || ""} ${row.customer_last_name || ""}`.trim(),
        email: row.customer_email,
        phone: row.customer_phone,
      },
      item: {
        id: row.item_id,
        name: row.item_name,
      },
      category: {
        id: row.category_id,
        name: row.category_name,
      },
      zone: {
        id: row.zone_id,
        name: row.zone_name,
      },
      staff: row.staff_first_name
        ? `${row.staff_first_name || ""} ${row.staff_last_name || ""}`.trim()
        : null,
    }));

    // Fetch filter options
    const zoneCondition = zoneId && zoneId !== "all"
      ? `WHERE z.id = '${zoneId}'`
      : accessibleZoneIds
        ? `WHERE z.id = ANY(ARRAY[${accessibleZoneIds.map(id => `'${id}'`).join(",")}]::uuid[])`
        : "";

    const [categoriesRes, tagsRes, itemsRes, sourcesRes, staffRes] = await Promise.all([
      client.query(`
        SELECT DISTINCT cat.id, cat.name
        FROM glamping_categories cat
        JOIN glamping_items i ON i.category_id = cat.id
        JOIN glamping_zones z ON i.zone_id = z.id
        ${zoneCondition}
        ORDER BY cat.name
      `),
      client.query(`
        SELECT DISTINCT t.id, t.name
        FROM glamping_tags t
        JOIN glamping_zones z ON t.zone_id = z.id
        ${zoneCondition}
        ORDER BY t.name
      `),
      client.query(`
        SELECT DISTINCT i.id, i.name
        FROM glamping_items i
        JOIN glamping_zones z ON i.zone_id = z.id
        ${zoneCondition}
        ORDER BY i.name
      `),
      client.query(`
        SELECT DISTINCT referral_source
        FROM glamping_bookings
        WHERE referral_source IS NOT NULL AND referral_source != ''
        ORDER BY referral_source
      `),
      client.query(`
        SELECT DISTINCT u.id, u.first_name, u.last_name
        FROM users u
        WHERE u.is_active = true
        ORDER BY u.first_name
      `),
    ]);

    const filterOptions = {
      categories: categoriesRes.rows.map(r => ({ value: r.id, label: typeof r.name === 'object' ? (r.name as any).en || (r.name as any).vi || r.id : r.name })),
      tags: tagsRes.rows.map(r => ({ value: r.id, label: typeof r.name === 'object' ? (r.name as any).en || (r.name as any).vi || r.id : r.name })),
      items: itemsRes.rows.map(r => ({ value: r.id, label: typeof r.name === 'object' ? (r.name as any).en || (r.name as any).vi || r.id : r.name })),
      statuses: [
        { value: "pending", label: "Pending" },
        { value: "confirmed", label: "Confirmed" },
        { value: "checked_in", label: "Checked In" },
        { value: "checked_out", label: "Checked Out" },
        { value: "cancelled", label: "Cancelled" },
      ],
      sources: sourcesRes.rows.map(r => ({ value: r.referral_source, label: r.referral_source })),
      staff: staffRes.rows.map(r => ({ value: r.id, label: `${r.first_name || ""} ${r.last_name || ""}`.trim() })),
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
    console.error("Error fetching booking index:", error);
    return NextResponse.json({ error: "Failed to fetch booking index" }, { status: 500 });
  } finally {
    client.release();
  }
}
