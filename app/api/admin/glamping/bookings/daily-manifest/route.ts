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
    const itemId = searchParams.get("itemId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build WHERE conditions
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
      // staying (default)
      conditions.push(`bt.check_in_date <= $${paramIndex} AND bt.check_out_date > $${paramIndex}`);
      values.push(date);
      paramIndex++;
    }

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ items: [], filterOptions: { categories: [], items: [] }, dateCounts: { today: 0, tomorrow: 0 } });
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

    if (itemId && itemId !== "all") {
      conditions.push(`bt.item_id = $${paramIndex}`);
      values.push(itemId);
      paramIndex++;
    }

    if (status && status !== "all") {
      // Override the default exclusion
      conditions.shift(); // remove the 'cancelled' exclusion
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

    // Main query: bookings grouped by item
    const query = `
      SELECT
        bt.item_id,
        i.name as item_name,
        i.sku as item_sku,
        COALESCE(cat.name, '{}') as category_name,
        b.id as booking_id,
        b.booking_code,
        b.status,
        b.payment_status,
        bt.check_in_date,
        bt.check_out_date,
        bt.nights,
        b.total_amount,
        b.deposit_due,
        b.balance_due,
        b.discount_amount,
        b.customer_notes,
        b.internal_notes,
        b.created_at,
        bt.id as tent_id,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.email as customer_email,
        c.phone as customer_phone,
        COALESCE(
          (SELECT SUM(bp.amount) FROM glamping_booking_payments bp WHERE bp.booking_id = b.id AND bp.status = 'completed'),
          0
        ) as paid_amount
      FROM glamping_booking_tents bt
      JOIN glamping_bookings b ON bt.booking_id = b.id
      JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_categories cat ON i.category_id = cat.id
      LEFT JOIN customers c ON b.customer_id = c.id
      ${whereClause}
      ORDER BY i.name ASC, b.booking_code ASC
    `;

    const result = await client.query(query, values);

    // Fetch parameters for all bookings
    const bookingIds = [...new Set(result.rows.map((r: any) => r.booking_id))];
    let paramsByBookingTent = new Map<string, Array<{ label: string; quantity: number; displayOrder: number }>>();

    if (bookingIds.length > 0) {
      const paramsResult = await client.query(
        `SELECT bp.booking_id, bp.booking_tent_id, bp.label, bp.booked_quantity,
                COALESCE(p.display_order, 0) as display_order
         FROM glamping_booking_parameters bp
         LEFT JOIN glamping_parameters p ON bp.parameter_id = p.id
         WHERE bp.booking_id = ANY($1::uuid[])
           AND (p.visibility IS NULL OR p.visibility != 'hidden')
         ORDER BY COALESCE(p.display_order, 0) ASC`,
        [bookingIds]
      );
      for (const row of paramsResult.rows) {
        const key = row.booking_tent_id || row.booking_id;
        if (!paramsByBookingTent.has(key)) {
          paramsByBookingTent.set(key, []);
        }
        paramsByBookingTent.get(key)!.push({
          label: row.label,
          quantity: row.booked_quantity,
          displayOrder: parseInt(row.display_order) || 0,
        });
      }
    }

    // Group by item
    const itemMap = new Map<string, any>();
    for (const row of result.rows) {
      const key = row.item_id;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          itemId: row.item_id,
          itemName: getLocalizedString(row.item_name),
          itemSku: row.item_sku,
          categoryName: getLocalizedString(row.category_name),
          totalBookings: 0,
          totalGuests: 0,
          totalPaid: 0,
          totalDue: 0,
          bookings: [],
          parameterTotals: {} as Record<string, number>,
        });
      }

      const item = itemMap.get(key);
      item.totalBookings++;

      // Get parameters for this tent
      const tentParams = paramsByBookingTent.get(row.tent_id) || [];
      const tentTotalGuests = tentParams.reduce((sum, p) => sum + p.quantity, 0);

      item.totalGuests += tentTotalGuests;
      item.totalPaid += parseFloat(row.paid_amount || 0);
      item.totalDue += parseFloat(row.balance_due || 0);

      // Aggregate parameter totals
      for (const param of tentParams) {
        item.parameterTotals[param.label] = (item.parameterTotals[param.label] || 0) + param.quantity;
      }

      item.bookings.push({
        id: row.booking_id,
        bookingCode: row.booking_code,
        status: row.status,
        paymentStatus: row.payment_status,
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        nights: row.nights,
        totalGuests: tentTotalGuests,
        totalAmount: parseFloat(row.total_amount || 0),
        depositDue: parseFloat(row.deposit_due || 0),
        balanceDue: parseFloat(row.balance_due || 0),
        paidAmount: parseFloat(row.paid_amount || 0),
        discountAmount: parseFloat(row.discount_amount || 0),
        customerName: `${row.customer_first_name || ""} ${row.customer_last_name || ""}`.trim(),
        customerEmail: row.customer_email || "",
        customerPhone: row.customer_phone || "",
        customerNotes: row.customer_notes,
        internalNotes: row.internal_notes,
        source: null,
        tentId: row.tent_id,
        createdAt: row.created_at,
        parameters: tentParams,
      });
    }

    // Fetch filter options
    const zoneCondition = zoneId && zoneId !== "all" ? `WHERE i.zone_id = $1` : "";
    const zoneParam = zoneId && zoneId !== "all" ? [zoneId] : [];

    const [categoriesResult, itemsResult] = await Promise.all([
      client.query(
        `SELECT DISTINCT cat.id, cat.name
         FROM glamping_categories cat
         JOIN glamping_items i ON i.category_id = cat.id
         ${zoneCondition}
         ORDER BY cat.name ASC`,
        zoneParam
      ),
      client.query(
        `SELECT i.id, i.name
         FROM glamping_items i
         ${zoneCondition}
         ORDER BY i.name ASC`,
        zoneParam
      ),
    ]);

    // Date counts for today and tomorrow
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    // Build a base condition for zone filtering in count queries
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
      items: Array.from(itemMap.values()),
      filterOptions: {
        categories: categoriesResult.rows.map((r: any) => ({
          id: r.id,
          name: getLocalizedString(r.name),
        })),
        items: itemsResult.rows.map((r: any) => ({
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
    console.error("Error fetching daily manifest:", error);
    return NextResponse.json({ error: "Failed to fetch daily manifest" }, { status: 500 });
  } finally {
    client.release();
  }
}
