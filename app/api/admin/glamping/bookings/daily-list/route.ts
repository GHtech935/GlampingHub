import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getLocalizedString(value: any, fallback: string = ""): string {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") return value.vi || value.en || fallback;
  return fallback;
}

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
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const bookingFilter = searchParams.get("bookingFilter") || "staying";
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build WHERE conditions for bookings query
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Exclude cancelled by default
    conditions.push(`b.status != 'cancelled'`);

    // Date filter on tent-level dates
    if (bookingFilter === "starting") {
      conditions.push(`bt.check_in_date = $${paramIndex}`);
      values.push(date);
      paramIndex++;
    } else if (bookingFilter === "ending") {
      conditions.push(`bt.check_out_date = $${paramIndex}`);
      values.push(date);
      paramIndex++;
    } else {
      conditions.push(`bt.check_in_date <= $${paramIndex} AND bt.check_out_date > $${paramIndex}`);
      values.push(date);
      paramIndex++;
    }

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({
          summary: [], summaryTotals: { totalBookings: 0, totalAmount: 0, totalGuests: 0, totalAdults: 0, totalChildren: 0, totalQuantity: 0, totalInventory: 0, totalBooked: 0, parameterBreakdown: {} },
          categories: [], parameters: [], filterOptions: { categories: [], items: [] }, dateCounts: { today: 0, tomorrow: 0 }
        });
      }
      if (zoneId && zoneId !== "all") {
        if (!accessibleZoneIds.includes(zoneId)) {
          return NextResponse.json({ error: "You do not have access to this zone" }, { status: 403 });
        }
        conditions.push(`i.zone_id = $${paramIndex}`);
        values.push(zoneId);
        paramIndex++;
      } else {
        conditions.push(`i.zone_id = ANY($${paramIndex}::uuid[])`);
        values.push(accessibleZoneIds);
        paramIndex++;
      }
    } else {
      if (zoneId && zoneId !== "all") {
        conditions.push(`i.zone_id = $${paramIndex}`);
        values.push(zoneId);
        paramIndex++;
      }
    }

    if (categoryId && categoryId !== "all") {
      conditions.push(`i.category_id = $${paramIndex}`);
      values.push(categoryId);
      paramIndex++;
    }

    if (status && status !== "all") {
      conditions.shift();
      conditions.unshift(`b.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

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

    // 1. Bookings query grouped by category > item
    const bookingsQuery = `
      SELECT
        bt.item_id,
        i.name as item_name,
        i.category_id,
        COALESCE(cat.name, '{}') as category_name,
        b.id as booking_id,
        b.booking_code,
        b.status,
        b.payment_status,
        b.total_amount,
        bt.check_in_date,
        bt.check_out_date,
        bt.adults,
        bt.children,
        bt.total_guests,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.email as customer_email,
        c.phone as customer_phone
      FROM glamping_booking_tents bt
      JOIN glamping_bookings b ON bt.booking_id = b.id
      JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_categories cat ON i.category_id = cat.id
      LEFT JOIN customers c ON b.customer_id = c.id
      ${whereClause}
      ORDER BY cat.name ASC, i.name ASC, b.booking_code ASC
    `;

    const bookingsResult = await client.query(bookingsQuery, values);

    // 2. Summary query: items with inventory + booking counts
    // We need a separate simpler date condition for summary
    const summaryDateCondition = bookingFilter === "starting"
      ? `bt.check_in_date = $1`
      : bookingFilter === "ending"
        ? `bt.check_out_date = $1`
        : `bt.check_in_date <= $1 AND bt.check_out_date > $1`;

    const summaryZoneCondition = zoneId && zoneId !== "all"
      ? `AND i.zone_id = $2`
      : accessibleZoneIds !== null && accessibleZoneIds.length > 0
        ? `AND i.zone_id = ANY($2::uuid[])`
        : "";

    const summaryZoneParam = zoneId && zoneId !== "all"
      ? [zoneId]
      : accessibleZoneIds !== null && accessibleZoneIds.length > 0
        ? [accessibleZoneIds]
        : [];

    const summaryQuery = `
      SELECT
        i.id as item_id,
        i.name as item_name,
        COALESCE(cat.name, '{}') as category_name,
        COALESCE(ia.inventory_quantity, 1) as inventory_total,
        COUNT(DISTINCT bt.id) as booked_count,
        COALESCE(SUM(b.total_amount), 0) as total_amount,
        COALESCE(SUM(bt.total_guests), 0) as total_guests,
        COALESCE(SUM(bt.adults), 0) as total_adults,
        COALESCE(SUM(bt.children), 0) as total_children,
        COUNT(DISTINCT bt.id) as total_quantity
      FROM glamping_items i
      LEFT JOIN glamping_categories cat ON i.category_id = cat.id
      LEFT JOIN glamping_item_attributes ia ON ia.item_id = i.id
      LEFT JOIN glamping_booking_tents bt ON bt.item_id = i.id
        AND ${summaryDateCondition}
        AND EXISTS (
          SELECT 1 FROM glamping_bookings b2
          WHERE b2.id = bt.booking_id AND b2.status != 'cancelled'
        )
      LEFT JOIN glamping_bookings b ON bt.booking_id = b.id AND b.status != 'cancelled'
      WHERE 1=1 ${summaryZoneCondition}
      GROUP BY i.id, i.name, cat.name, ia.inventory_quantity
      ORDER BY cat.name ASC, i.name ASC
    `;

    const summaryResult = await client.query(summaryQuery, [date, ...summaryZoneParam]);

    // 3. Fetch parameters for the zone
    const paramsZoneCondition = zoneId && zoneId !== "all" ? `WHERE p.zone_id = $1` : "";
    const paramsZoneParam = zoneId && zoneId !== "all" ? [zoneId] : [];

    const parametersResult = await client.query(
      `SELECT p.id, p.name, p.link_to_guests
       FROM glamping_parameters p
       ${paramsZoneCondition}
       ORDER BY p.display_order ASC`,
      paramsZoneParam
    );

    // 4. Fetch parameter breakdown per booking (for dynamic columns)
    const bookingIds = bookingsResult.rows.map((r: any) => r.booking_id);
    let paramBreakdownMap = new Map<string, Record<string, number>>();

    if (bookingIds.length > 0) {
      const paramBreakdownResult = await client.query(
        `SELECT bp.booking_id, bp.parameter_id, bp.booked_quantity
         FROM glamping_booking_parameters bp
         WHERE bp.booking_id = ANY($1::uuid[])`,
        [bookingIds]
      );

      for (const row of paramBreakdownResult.rows) {
        const key = row.booking_id;
        if (!paramBreakdownMap.has(key)) {
          paramBreakdownMap.set(key, {});
        }
        const breakdown = paramBreakdownMap.get(key)!;
        breakdown[row.parameter_id] = (breakdown[row.parameter_id] || 0) + row.booked_quantity;
      }
    }

    // Group bookings by category > item
    const categoryMap = new Map<string, any>();
    for (const row of bookingsResult.rows) {
      const catKey = row.category_id || "uncategorized";
      if (!categoryMap.has(catKey)) {
        categoryMap.set(catKey, {
          categoryId: row.category_id || "uncategorized",
          categoryName: getLocalizedString(row.category_name, "Uncategorized"),
          items: new Map<string, any>(),
        });
      }

      const category = categoryMap.get(catKey);
      const itemKey = row.item_id;
      if (!category.items.has(itemKey)) {
        category.items.set(itemKey, {
          itemId: row.item_id,
          itemName: getLocalizedString(row.item_name),
          bookings: [],
          subtotals: {
            totalAmount: 0,
            adults: 0,
            children: 0,
            totalGuests: 0,
            totalQuantity: 0,
            parameterBreakdown: {},
          },
        });
      }

      const item = category.items.get(itemKey);
      const paramBreakdown = paramBreakdownMap.get(row.booking_id) || {};

      item.bookings.push({
        id: row.booking_id,
        bookingCode: row.booking_code,
        status: row.status,
        paymentStatus: row.payment_status,
        customerName: `${row.customer_first_name || ""} ${row.customer_last_name || ""}`.trim(),
        customerEmail: row.customer_email || "",
        customerPhone: row.customer_phone || "",
        source: null,
        totalAmount: parseFloat(row.total_amount || 0),
        adults: row.adults || 0,
        children: row.children || 0,
        totalGuests: row.total_guests || 0,
        totalQuantity: 1,
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        parameterBreakdown: paramBreakdown,
      });

      item.subtotals.totalAmount += parseFloat(row.total_amount || 0);
      item.subtotals.adults += row.adults || 0;
      item.subtotals.children += row.children || 0;
      item.subtotals.totalGuests += row.total_guests || 0;
      item.subtotals.totalQuantity += 1;

      // Aggregate parameter breakdown for subtotals
      for (const [pid, qty] of Object.entries(paramBreakdown)) {
        item.subtotals.parameterBreakdown[pid] = (item.subtotals.parameterBreakdown[pid] || 0) + (qty as number);
      }
    }

    // Convert maps to arrays
    const categories = Array.from(categoryMap.values()).map((cat: any) => ({
      ...cat,
      items: Array.from(cat.items.values()),
    }));

    // Build summary
    const summary = summaryResult.rows.map((row: any) => ({
      itemId: row.item_id,
      itemName: getLocalizedString(row.item_name),
      categoryName: getLocalizedString(row.category_name),
      inventoryTotal: parseInt(row.inventory_total || 1),
      bookedCount: parseInt(row.booked_count || 0),
      inventoryPercent: Math.min(100, Math.round((parseInt(row.booked_count || 0) / Math.max(1, parseInt(row.inventory_total || 1))) * 100)),
      totalAmount: parseFloat(row.total_amount || 0),
      totalGuests: parseInt(row.total_guests || 0),
      totalAdults: parseInt(row.total_adults || 0),
      totalChildren: parseInt(row.total_children || 0),
      totalQuantity: parseInt(row.total_quantity || 0),
      parameterBreakdown: {},
    }));

    const summaryTotals = {
      totalBookings: summary.reduce((acc: number, s: any) => acc + s.bookedCount, 0),
      totalAmount: summary.reduce((acc: number, s: any) => acc + s.totalAmount, 0),
      totalGuests: summary.reduce((acc: number, s: any) => acc + s.totalGuests, 0),
      totalAdults: summary.reduce((acc: number, s: any) => acc + s.totalAdults, 0),
      totalChildren: summary.reduce((acc: number, s: any) => acc + s.totalChildren, 0),
      totalQuantity: summary.reduce((acc: number, s: any) => acc + s.totalQuantity, 0),
      totalInventory: summary.reduce((acc: number, s: any) => acc + s.inventoryTotal, 0),
      totalBooked: summary.reduce((acc: number, s: any) => acc + s.bookedCount, 0),
      parameterBreakdown: {},
    };

    // Filter options
    const zoneCondition = zoneId && zoneId !== "all" ? `WHERE i.zone_id = $1` : "";
    const zoneParam = zoneId && zoneId !== "all" ? [zoneId] : [];

    const [categoriesOptions, itemsOptions] = await Promise.all([
      client.query(
        `SELECT DISTINCT cat.id, cat.name
         FROM glamping_categories cat
         JOIN glamping_items i ON i.category_id = cat.id
         ${zoneCondition}
         ORDER BY cat.name ASC`,
        zoneParam
      ),
      client.query(
        `SELECT i.id, i.name FROM glamping_items i ${zoneCondition} ORDER BY i.name ASC`,
        zoneParam
      ),
    ]);

    // Date counts
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const countZoneConditions: string[] = [`b.status != 'cancelled'`];
    const countValues: any[] = [];
    let countParamIdx = 1;

    if (zoneId && zoneId !== "all") {
      countZoneConditions.push(`i.zone_id = $${countParamIdx}`);
      countValues.push(zoneId);
      countParamIdx++;
    } else if (accessibleZoneIds !== null && accessibleZoneIds.length > 0) {
      countZoneConditions.push(`i.zone_id = ANY($${countParamIdx}::uuid[])`);
      countValues.push(accessibleZoneIds);
      countParamIdx++;
    }

    const countBase = countZoneConditions.join(" AND ");

    let dateCondition: string;
    if (bookingFilter === "starting") {
      dateCondition = `bt.check_in_date = $${countParamIdx}`;
    } else if (bookingFilter === "ending") {
      dateCondition = `bt.check_out_date = $${countParamIdx}`;
    } else {
      dateCondition = `bt.check_in_date <= $${countParamIdx} AND bt.check_out_date > $${countParamIdx}`;
    }

    const countQuery = `
      SELECT COUNT(DISTINCT bt.id) as cnt
      FROM glamping_booking_tents bt
      JOIN glamping_bookings b ON bt.booking_id = b.id
      JOIN glamping_items i ON bt.item_id = i.id
      WHERE ${countBase} AND ${dateCondition}
    `;

    const [todayCount, tomorrowCount] = await Promise.all([
      client.query(countQuery, [...countValues, today]),
      client.query(countQuery, [...countValues, tomorrow]),
    ]);

    return NextResponse.json({
      summary,
      summaryTotals,
      categories,
      parameters: parametersResult.rows.map((r: any) => ({
        id: r.id,
        name: getLocalizedString(r.name),
        label: getLocalizedString(r.name),
        linkToGuests: r.link_to_guests || false,
      })),
      filterOptions: {
        categories: categoriesOptions.rows.map((r: any) => ({
          id: r.id,
          name: getLocalizedString(r.name),
        })),
        items: itemsOptions.rows.map((r: any) => ({
          id: r.id,
          name: getLocalizedString(r.name),
        })),
      },
      dateCounts: {
        today: parseInt(todayCount.rows[0]?.cnt || "0"),
        tomorrow: parseInt(tomorrowCount.rows[0]?.cnt || "0"),
      },
    });
  } catch (error) {
    console.error("Error fetching daily list:", error);
    return NextResponse.json({ error: "Failed to fetch daily list" }, { status: 500 });
  } finally {
    client.release();
  }
}
