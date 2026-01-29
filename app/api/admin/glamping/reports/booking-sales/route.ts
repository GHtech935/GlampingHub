import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

export const dynamic = 'force-dynamic';

type TabType = "day" | "booking" | "booking_item" | "customer" | "staff" | "category" | "item" | "product";

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);
    const searchParams = request.nextUrl.searchParams;

    const tab = (searchParams.get("tab") || "day") as TabType;
    const dateSource = searchParams.get("dateSource") || "created";
    const dateRange = searchParams.get("dateRange") || "this_month";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const staffId = searchParams.get("staffId");
    const categoryId = searchParams.get("categoryId");
    const itemId = searchParams.get("itemId");
    const zoneId = searchParams.get("zoneId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ data: [], summary: {}, pagination: { currentPage: 1, totalPages: 0, total: 0, limit }, filterOptions: {} });
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

    // Date column
    const dateCol = dateSource === "check_in" ? "b.check_in_date" : "b.created_at";

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

    // Staff filter
    if (staffId) {
      conditions.push(`b.created_by_user_id = $${paramIndex}`);
      values.push(staffId);
      paramIndex++;
    }

    // Category filter
    if (categoryId) {
      conditions.push(`cat.id = $${paramIndex}`);
      values.push(categoryId);
      paramIndex++;
    }

    // Item filter
    if (itemId) {
      conditions.push(`i.id = $${paramIndex}`);
      values.push(itemId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Common FROM clause
    const fromClause = `
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_categories cat ON i.category_id = cat.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      LEFT JOIN users u ON b.created_by_user_id = u.id
    `;

    let dataQuery = "";
    let countQuery = "";
    let summaryQuery = "";

    switch (tab) {
      case "day":
        dataQuery = `
          SELECT
            DATE(b.created_at) as created_date,
            COUNT(DISTINCT b.id) as booking_count,
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total
          ${fromClause}
          ${whereClause}
          GROUP BY DATE(b.created_at)
          ORDER BY created_date DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        countQuery = `
          SELECT COUNT(DISTINCT DATE(b.created_at)) as total
          ${fromClause}
          ${whereClause}
        `;
        summaryQuery = `
          SELECT
            COUNT(DISTINCT b.id) as booking_count,
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total
          ${fromClause}
          ${whereClause}
        `;
        break;

      case "booking":
        dataQuery = `
          SELECT DISTINCT ON (b.id)
            b.id,
            b.booking_code,
            b.status,
            b.payment_status,
            CONCAT(u.first_name, ' ', u.last_name) as staff_name,
            b.created_at as created_date,
            CONCAT(c.first_name, ' ', c.last_name) as customer_name,
            (SELECT COUNT(*) FROM glamping_booking_tents bt2 WHERE bt2.booking_id = b.id) as item_quantity,
            b.discount_amount as discounts,
            b.subtotal_amount as gross_sales,
            b.subtotal_amount - b.discount_amount as net_sales,
            b.total_amount as total,
            COALESCE((SELECT SUM(p.amount) FROM glamping_booking_payments p WHERE p.booking_id = b.id AND p.status = 'completed'), 0) as paid_total,
            b.balance_due as balance_owing
          ${fromClause}
          ${whereClause}
          ORDER BY b.id, b.created_at DESC
        `;
        // Wrap for pagination
        dataQuery = `SELECT * FROM (${dataQuery}) sub ORDER BY created_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        countQuery = `SELECT COUNT(DISTINCT b.id) as total ${fromClause} ${whereClause}`;
        summaryQuery = `
          SELECT
            COUNT(DISTINCT b.id) as booking_count,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total
          ${fromClause}
          ${whereClause}
        `;
        break;

      case "booking_item":
        dataQuery = `
          SELECT
            bt.id,
            b.booking_code,
            b.status,
            i.name as item_name,
            i.sku as item_sku,
            CONCAT(u.first_name, ' ', u.last_name) as staff_name,
            b.created_at as created_date,
            CONCAT(c.first_name, ' ', c.last_name) as customer_name,
            1 as item_quantity,
            COALESCE(bt.discount_amount, 0) as discounts,
            bt.subtotal as gross_sales,
            bt.subtotal - COALESCE(bt.discount_amount, 0) as net_sales,
            bt.subtotal - COALESCE(bt.discount_amount, 0) as total
          ${fromClause}
          ${whereClause}
          ORDER BY b.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        countQuery = `SELECT COUNT(bt.id) as total ${fromClause} ${whereClause}`;
        summaryQuery = `
          SELECT
            COUNT(bt.id) as item_quantity,
            COALESCE(SUM(bt.discount_amount), 0) as discounts,
            COALESCE(SUM(bt.subtotal), 0) as gross_sales,
            COALESCE(SUM(bt.subtotal) - SUM(COALESCE(bt.discount_amount, 0)), 0) as net_sales,
            COALESCE(SUM(bt.subtotal) - SUM(COALESCE(bt.discount_amount, 0)), 0) as total
          ${fromClause}
          ${whereClause}
        `;
        break;

      case "customer":
        dataQuery = `
          SELECT
            c.id,
            CONCAT(c.first_name, ' ', c.last_name) as customer_name,
            c.email as customer_email,
            c.phone as customer_phone,
            COUNT(DISTINCT b.id) as booking_count,
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total,
            COALESCE((
              SELECT SUM(p.amount)
              FROM glamping_booking_payments p
              WHERE p.booking_id = ANY(ARRAY_AGG(DISTINCT b.id)) AND p.status = 'completed'
            ), 0) as paid_total,
            COALESCE(SUM(DISTINCT b.balance_due), 0) as balance_owing
          ${fromClause}
          ${whereClause}
          GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone
          ORDER BY total DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        countQuery = `SELECT COUNT(DISTINCT c.id) as total ${fromClause} ${whereClause}`;
        summaryQuery = `
          SELECT
            COUNT(DISTINCT b.id) as booking_count,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total
          ${fromClause}
          ${whereClause}
        `;
        break;

      case "staff":
        dataQuery = `
          SELECT
            u.id,
            CONCAT(u.first_name, ' ', u.last_name) as staff_name,
            COUNT(DISTINCT b.id) as booking_count,
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total
          ${fromClause}
          ${whereClause} ${conditions.length > 0 ? "AND" : "WHERE"} b.created_by_user_id IS NOT NULL
          GROUP BY u.id, u.first_name, u.last_name
          ORDER BY total DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        countQuery = `SELECT COUNT(DISTINCT u.id) as total ${fromClause} ${whereClause} ${conditions.length > 0 ? "AND" : "WHERE"} b.created_by_user_id IS NOT NULL`;
        summaryQuery = `
          SELECT
            COUNT(DISTINCT b.id) as booking_count,
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total
          ${fromClause}
          ${whereClause}
        `;
        break;

      case "category":
        dataQuery = `
          SELECT
            cat.id,
            cat.name as category_name,
            COUNT(DISTINCT b.id) as booking_count,
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total
          ${fromClause}
          ${whereClause} ${conditions.length > 0 ? "AND" : "WHERE"} cat.id IS NOT NULL
          GROUP BY cat.id, cat.name
          ORDER BY total DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        countQuery = `SELECT COUNT(DISTINCT cat.id) as total ${fromClause} ${whereClause} ${conditions.length > 0 ? "AND" : "WHERE"} cat.id IS NOT NULL`;
        summaryQuery = `
          SELECT
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(DISTINCT b.discount_amount), 0) as discounts,
            COALESCE(SUM(DISTINCT b.subtotal_amount), 0) as gross_sales,
            COALESCE(SUM(DISTINCT b.subtotal_amount) - SUM(DISTINCT b.discount_amount), 0) as net_sales,
            COALESCE(SUM(DISTINCT b.total_amount), 0) as total
          ${fromClause}
          ${whereClause}
        `;
        break;

      case "item":
        dataQuery = `
          SELECT
            i.id,
            i.name as item_name,
            i.sku as item_sku,
            cat.name as category_name,
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(bt.discount_amount), 0) as discounts,
            COALESCE(SUM(bt.subtotal), 0) as gross_sales,
            COALESCE(SUM(bt.subtotal) - SUM(COALESCE(bt.discount_amount, 0)), 0) as net_sales,
            COALESCE(SUM(bt.subtotal) - SUM(COALESCE(bt.discount_amount, 0)), 0) as total
          ${fromClause}
          ${whereClause} ${conditions.length > 0 ? "AND" : "WHERE"} i.id IS NOT NULL
          GROUP BY i.id, i.name, i.sku, cat.name
          ORDER BY total DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        countQuery = `SELECT COUNT(DISTINCT i.id) as total ${fromClause} ${whereClause} ${conditions.length > 0 ? "AND" : "WHERE"} i.id IS NOT NULL`;
        summaryQuery = `
          SELECT
            COUNT(DISTINCT bt.id) as item_quantity,
            COALESCE(SUM(bt.discount_amount), 0) as discounts,
            COALESCE(SUM(bt.subtotal), 0) as gross_sales,
            COALESCE(SUM(bt.subtotal) - SUM(COALESCE(bt.discount_amount, 0)), 0) as net_sales,
            COALESCE(SUM(bt.subtotal) - SUM(COALESCE(bt.discount_amount, 0)), 0) as total
          ${fromClause}
          ${whereClause}
        `;
        break;

      case "product":
        dataQuery = `
          SELECT
            mi.id,
            mi.name as product_name,
            mi.category as product_category,
            COUNT(bmp.id) as item_quantity,
            COALESCE(SUM(bmp.discount_amount), 0) as discounts,
            COALESCE(SUM(bmp.quantity * bmp.unit_price), 0) as gross_sales,
            COALESCE(SUM(bmp.quantity * bmp.unit_price) - SUM(COALESCE(bmp.discount_amount, 0)), 0) as net_sales,
            COALESCE(SUM(bmp.quantity * bmp.unit_price) - SUM(COALESCE(bmp.discount_amount, 0)), 0) as total
          FROM glamping_booking_menu_products bmp
          JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
          JOIN glamping_bookings b ON bmp.booking_id = b.id
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
          LEFT JOIN glamping_items i ON bt.item_id = i.id
          LEFT JOIN glamping_categories cat ON i.category_id = cat.id
          LEFT JOIN glamping_zones z ON mi.zone_id = z.id
          LEFT JOIN users u ON b.created_by_user_id = u.id
          ${whereClause}
          GROUP BY mi.id, mi.name, mi.category
          ORDER BY total DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        countQuery = `
          SELECT COUNT(DISTINCT mi.id) as total
          FROM glamping_booking_menu_products bmp
          JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
          JOIN glamping_bookings b ON bmp.booking_id = b.id
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
          LEFT JOIN glamping_items i ON bt.item_id = i.id
          LEFT JOIN glamping_categories cat ON i.category_id = cat.id
          LEFT JOIN glamping_zones z ON mi.zone_id = z.id
          LEFT JOIN users u ON b.created_by_user_id = u.id
          ${whereClause}
        `;
        summaryQuery = `
          SELECT
            COUNT(bmp.id) as item_quantity,
            COALESCE(SUM(bmp.discount_amount), 0) as discounts,
            COALESCE(SUM(bmp.quantity * bmp.unit_price), 0) as gross_sales,
            COALESCE(SUM(bmp.quantity * bmp.unit_price) - SUM(COALESCE(bmp.discount_amount, 0)), 0) as net_sales,
            COALESCE(SUM(bmp.quantity * bmp.unit_price) - SUM(COALESCE(bmp.discount_amount, 0)), 0) as total
          FROM glamping_booking_menu_products bmp
          JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
          JOIN glamping_bookings b ON bmp.booking_id = b.id
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN glamping_booking_tents bt ON bt.booking_id = b.id
          LEFT JOIN glamping_items i ON bt.item_id = i.id
          LEFT JOIN glamping_categories cat ON i.category_id = cat.id
          LEFT JOIN glamping_zones z ON mi.zone_id = z.id
          LEFT JOIN users u ON b.created_by_user_id = u.id
          ${whereClause}
        `;
        break;
    }

    // Add pagination params
    values.push(limit, offset);

    // Execute queries
    const [dataResult, countResult, summaryResult] = await Promise.all([
      client.query(dataQuery, values),
      client.query(countQuery, values.slice(0, -2)),
      client.query(summaryQuery, values.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0]?.total || "0");
    const totalPages = Math.ceil(total / limit);

    // Format data based on tab
    const data = dataResult.rows.map(row => {
      const formatted: Record<string, any> = {};
      for (const [key, val] of Object.entries(row)) {
        // Convert numeric fields
        if (["discounts", "gross_sales", "net_sales", "total", "paid_total", "balance_owing", "subtotal"].includes(key)) {
          formatted[key] = parseFloat(val as string || "0");
        } else if (["item_quantity", "booking_count"].includes(key)) {
          formatted[key] = parseInt(val as string || "0");
        } else {
          formatted[key] = val;
        }
      }
      return formatted;
    });

    // Format summary
    const summary: Record<string, any> = {};
    if (summaryResult.rows[0]) {
      for (const [key, val] of Object.entries(summaryResult.rows[0])) {
        if (["discounts", "gross_sales", "net_sales", "total", "paid_total", "balance_owing"].includes(key)) {
          summary[key] = parseFloat(val as string || "0");
        } else if (["item_quantity", "booking_count"].includes(key)) {
          summary[key] = parseInt(val as string || "0");
        } else {
          summary[key] = val;
        }
      }
    }

    // Fetch filter options
    const zoneCondition = zoneId && zoneId !== "all"
      ? `WHERE z.id = '${zoneId}'`
      : accessibleZoneIds
        ? `WHERE z.id = ANY(ARRAY[${accessibleZoneIds.map(id => `'${id}'`).join(",")}]::uuid[])`
        : "";

    const [categoriesRes, itemsRes, staffRes] = await Promise.all([
      client.query(`
        SELECT DISTINCT cat.id, cat.name
        FROM glamping_categories cat
        JOIN glamping_items i ON i.category_id = cat.id
        JOIN glamping_zones z ON i.zone_id = z.id
        ${zoneCondition}
        ORDER BY cat.name
      `),
      client.query(`
        SELECT DISTINCT i.id, i.name
        FROM glamping_items i
        JOIN glamping_zones z ON i.zone_id = z.id
        ${zoneCondition}
        ORDER BY i.name
      `),
      client.query(`
        SELECT DISTINCT u.id, u.first_name, u.last_name
        FROM users u
        WHERE u.is_active = true
        ORDER BY u.first_name
      `),
    ]);

    const filterOptions = {
      categories: categoriesRes.rows.map(r => ({
        value: r.id,
        label: typeof r.name === "object" ? (r.name as any).en || (r.name as any).vi || r.id : r.name
      })),
      items: itemsRes.rows.map(r => ({
        value: r.id,
        label: typeof r.name === "object" ? (r.name as any).en || (r.name as any).vi || r.id : r.name
      })),
      staff: staffRes.rows.map(r => ({
        value: r.id,
        label: `${r.first_name || ""} ${r.last_name || ""}`.trim()
      })),
    };

    return NextResponse.json({
      data,
      summary,
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
    console.error("Error fetching booking sales:", error);
    return NextResponse.json({ error: "Failed to fetch sales data" }, { status: 500 });
  } finally {
    client.release();
  }
}
