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

    const date = searchParams.get("date");
    const zoneId = searchParams.get("zoneId");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Store date parameter for later use in query
    const dateParam = date;
    values.push(date);
    paramIndex++;

    // Only include active bookings (not cancelled, pending, or checked_out)
    conditions.push(`b.status NOT IN ('cancelled', 'pending', 'checked_out')`);

    // Only include bookings where the selected date falls within the booking period
    conditions.push(`b.check_in_date <= $1 AND b.check_out_date > $1`);

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({
          summary: {
            date,
            totalTents: 0,
            parametersSummary: [],
            aggregatedMenuItems: [],
            aggregatedCommonItems: [],
            aggregatedAdditionalCosts: [],
          },
          data: [],
        });
      }
      if (zoneId && zoneId !== "all") {
        if (!accessibleZoneIds.includes(zoneId)) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        conditions.push(`gi.zone_id = $${paramIndex}`);
        values.push(zoneId);
        paramIndex++;
      } else {
        conditions.push(`gi.zone_id = ANY($${paramIndex}::uuid[])`);
        values.push(accessibleZoneIds);
        paramIndex++;
      }
    } else if (zoneId && zoneId !== "all") {
      conditions.push(`gi.zone_id = $${paramIndex}`);
      values.push(zoneId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Main query: Get all tents with their menu products (including tents without products)
    const dataQuery = `
      SELECT
        b.id as booking_id,
        b.booking_code,
        b.photo_consent,
        c.first_name,
        c.last_name,
        bt.id as tent_id,
        bt.display_order,
        gi.id as item_id,
        gi.name as item_name,
        mi.id as menu_item_id,
        mi.name as menu_item_name,
        mi.unit as menu_item_unit,
        mi.min_guests,
        bmp.quantity,
        bmp.quantity * COALESCE(mi.min_guests, 1) as adjusted_quantity,
        bmp.notes
      FROM glamping_bookings b
      JOIN glamping_booking_tents bt ON bt.booking_id = b.id
      JOIN glamping_items gi ON bt.item_id = gi.id
      LEFT JOIN glamping_booking_menu_products bmp ON bmp.booking_tent_id = bt.id AND bmp.serving_date = $1
      LEFT JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
      LEFT JOIN customers c ON b.customer_id = c.id
      ${whereClause}
      ORDER BY b.booking_code, bt.display_order, mi.name
    `;

    const dataResult = await client.query(dataQuery, values);

    // Fetch parameters for all tents
    const tentIds = [...new Set(dataResult.rows.map((r: any) => r.tent_id))];
    let paramsByTentId = new Map<string, Array<{ label: string; quantity: number; countedForMenu?: boolean }>>();

    if (tentIds.length > 0) {
      const paramsResult = await client.query(
        `SELECT bp.booking_tent_id, bp.label, bp.booked_quantity, p.counted_for_menu, p.display_order
         FROM glamping_booking_parameters bp
         JOIN glamping_parameters p ON bp.parameter_id = p.id
         WHERE bp.booking_tent_id = ANY($1::uuid[])
           AND (p.visibility IS NULL OR p.visibility != 'hidden')
         ORDER BY p.display_order ASC, p.name ASC`,
        [tentIds]
      );
      for (const row of paramsResult.rows) {
        if (!paramsByTentId.has(row.booking_tent_id)) {
          paramsByTentId.set(row.booking_tent_id, []);
        }
        paramsByTentId.get(row.booking_tent_id)!.push({
          label: row.label,
          quantity: row.booked_quantity,
          countedForMenu: row.counted_for_menu,
        });
      }
    }

    // Fetch booking notes
    const bookingIds = [...new Set(dataResult.rows.map((r: any) => r.booking_id))];
    let notesByBookingId = new Map<string, Array<{ id: string; authorName: string; content: string; createdAt: string }>>();

    if (bookingIds.length > 0) {
      const notesResult = await client.query(
        `SELECT n.id, n.booking_id, n.content, n.created_at,
                u.first_name, u.last_name
         FROM glamping_booking_notes n
         JOIN users u ON u.id = n.author_id
         WHERE n.booking_id = ANY($1::uuid[])
         ORDER BY n.created_at ASC`,
        [bookingIds]
      );
      for (const row of notesResult.rows) {
        if (!notesByBookingId.has(row.booking_id)) {
          notesByBookingId.set(row.booking_id, []);
        }
        const authorName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown';
        notesByBookingId.get(row.booking_id)!.push({
          id: row.id,
          authorName,
          content: row.content,
          createdAt: row.created_at,
        });
      }
    }

    // Helper to get localized string
    const getLocalizedString = (value: any): string => {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        return value.vi || value.en || Object.values(value)[0] || "";
      }
      return String(value);
    };

    // Fetch additional costs for all bookings
    let additionalCostsByBookingId = new Map<string, Array<{ name: string; quantity: number; notes: string | null }>>();

    if (bookingIds.length > 0) {
      const additionalCostsResult = await client.query(
        `SELECT ac.booking_id, ac.name, ac.quantity, ac.notes
         FROM glamping_booking_additional_costs ac
         WHERE ac.booking_id = ANY($1::uuid[])
         ORDER BY ac.created_at`,
        [bookingIds]
      );

      for (const row of additionalCostsResult.rows) {
        if (!additionalCostsByBookingId.has(row.booking_id)) {
          additionalCostsByBookingId.set(row.booking_id, []);
        }
        additionalCostsByBookingId.get(row.booking_id)!.push({
          name: row.name,
          quantity: row.quantity,
          notes: row.notes,
        });
      }
    }

    // Fetch common items (addons) for all bookings
    let commonItemsByTentId = new Map<string, Array<{ itemName: string; parameterName: string; quantity: number }>>();

    if (bookingIds.length > 0) {
      const commonItemsResult = await client.query(
        `SELECT bi.booking_id, bi.booking_tent_id, bi.addon_item_id, bi.parameter_id, bi.quantity,
                addon_item.name as item_name, p.name as parameter_name
         FROM glamping_booking_items bi
         LEFT JOIN glamping_items addon_item ON bi.addon_item_id = addon_item.id
         LEFT JOIN glamping_parameters p ON bi.parameter_id = p.id
         WHERE bi.booking_id = ANY($1::uuid[])
           AND bi.metadata->>'type' = 'addon'
         ORDER BY bi.booking_tent_id, addon_item.name, bi.created_at`,
        [bookingIds]
      );

      for (const row of commonItemsResult.rows) {
        const tentId = row.booking_tent_id;
        if (!tentId) continue;
        if (!commonItemsByTentId.has(tentId)) {
          commonItemsByTentId.set(tentId, []);
        }

        commonItemsByTentId.get(tentId)!.push({
          itemName: getLocalizedString(row.item_name),
          parameterName: getLocalizedString(row.parameter_name),
          quantity: row.quantity,
        });
      }
    }

    // Aggregated menu items summary query
    // Build WHERE clause for summary that includes date filter
    const summaryConditions = ['bmp.serving_date = $1', ...conditions];
    const summaryWhereClause = `WHERE ${summaryConditions.join(" AND ")}`;

    const summaryQuery = `
      SELECT
        mi.name as menu_item_name,
        mi.unit as menu_item_unit,
        mi.min_guests,
        SUM(bmp.quantity * COALESCE(mi.min_guests, 1)) as total_quantity
      FROM glamping_booking_menu_products bmp
      JOIN glamping_booking_tents bt ON bmp.booking_tent_id = bt.id
      JOIN glamping_bookings b ON bmp.booking_id = b.id
      JOIN glamping_items gi ON bt.item_id = gi.id
      JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
      ${summaryWhereClause}
      GROUP BY mi.id, mi.name, mi.unit, mi.min_guests
      ORDER BY mi.name
    `;

    const summaryResult = await client.query(summaryQuery, values);

    // Aggregated common items summary
    let aggregatedCommonItems: Array<{ itemName: string; parameterName: string; totalQuantity: number }> = [];

    if (bookingIds.length > 0) {
      const commonSummaryResult = await client.query(
        `SELECT addon_item.name as item_name, p.name as parameter_name,
                SUM(bi.quantity) as total_quantity
         FROM glamping_booking_items bi
         LEFT JOIN glamping_items addon_item ON bi.addon_item_id = addon_item.id
         LEFT JOIN glamping_parameters p ON bi.parameter_id = p.id
         WHERE bi.booking_id = ANY($1::uuid[])
           AND bi.metadata->>'type' = 'addon'
         GROUP BY addon_item.name, p.name
         ORDER BY addon_item.name, p.name`,
        [bookingIds]
      );

      aggregatedCommonItems = commonSummaryResult.rows.map((row: any) => ({
        itemName: getLocalizedString(row.item_name),
        parameterName: getLocalizedString(row.parameter_name),
        totalQuantity: parseInt(row.total_quantity) || 0,
      }));
    }

    // Aggregated additional costs summary
    let aggregatedAdditionalCosts: Array<{ name: string; totalQuantity: number }> = [];

    if (bookingIds.length > 0) {
      const additionalCostsSummaryResult = await client.query(
        `SELECT ac.name, SUM(ac.quantity) as total_quantity
         FROM glamping_booking_additional_costs ac
         WHERE ac.booking_id = ANY($1::uuid[])
         GROUP BY ac.name
         ORDER BY ac.name`,
        [bookingIds]
      );

      aggregatedAdditionalCosts = additionalCostsSummaryResult.rows.map((row: any) => ({
        name: row.name,
        totalQuantity: parseInt(row.total_quantity) || 0,
      }));
    }

    // Transform data into nested structure by booking
    const bookingsMap = new Map<string, {
      bookingId: string;
      bookingCode: string;
      bookerName: string;
      photoConsent: boolean | null;
      notes: Array<{ id: string; authorName: string; content: string; createdAt: string }>;
      additionalCosts: Array<{ name: string; quantity: number; notes: string | null }>;
      tents: Map<string, {
        tentId: string;
        itemId: string;
        itemName: string;
        parameters: Array<{ label: string; quantity: number; countedForMenu?: boolean }>;
        displayOrder: number;
        menuProducts: {
          menuItemId: string;
          menuItemName: string;
          menuItemUnit: string;
          minGuests: number | null;
          quantity: number;
          adjustedQuantity: number;
          notes: string | null;
        }[];
        commonItems: Array<{ itemName: string; parameterName: string; quantity: number }>;
      }>;
    }>();

    // Track unique tents for summary
    const uniqueTentIds = new Set<string>();
    const aggregatedParams = new Map<string, number>();

    for (const row of dataResult.rows) {
      const bookingId = row.booking_id;
      const tentId = row.tent_id;

      if (!bookingsMap.has(bookingId)) {
        const firstName = row.first_name || "";
        const lastName = row.last_name || "";
        bookingsMap.set(bookingId, {
          bookingId,
          bookingCode: row.booking_code,
          bookerName: `${firstName} ${lastName}`.trim() || "Unknown",
          photoConsent: row.photo_consent,
          notes: notesByBookingId.get(bookingId) || [],
          additionalCosts: additionalCostsByBookingId.get(bookingId) || [],
          tents: new Map(),
        });
      }

      const booking = bookingsMap.get(bookingId)!;

      if (!booking.tents.has(tentId)) {
        const tentParams = paramsByTentId.get(tentId) || [];
        booking.tents.set(tentId, {
          tentId,
          itemId: row.item_id,
          itemName: getLocalizedString(row.item_name),
          parameters: tentParams,
          displayOrder: row.display_order || 0,
          menuProducts: [],
          commonItems: commonItemsByTentId.get(tentId) || [],
        });

        // Count unique tents and aggregate parameters
        if (!uniqueTentIds.has(tentId)) {
          uniqueTentIds.add(tentId);
          for (const param of tentParams) {
            aggregatedParams.set(param.label, (aggregatedParams.get(param.label) || 0) + param.quantity);
          }
        }
      }

      const tent = booking.tents.get(tentId)!;
      // Only add menu product if menu_item_id exists (not NULL from LEFT JOIN)
      if (row.menu_item_id) {
        tent.menuProducts.push({
          menuItemId: row.menu_item_id,
          menuItemName: getLocalizedString(row.menu_item_name),
          menuItemUnit: getLocalizedString(row.menu_item_unit),
          minGuests: row.min_guests ? parseInt(row.min_guests) : null,
          quantity: row.quantity,
          adjustedQuantity: parseInt(row.adjusted_quantity) || row.quantity,
          notes: row.notes || null,
        });
      }
    }

    // Convert to array format
    const data = Array.from(bookingsMap.values()).map((booking) => ({
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,
      bookerName: booking.bookerName,
      photoConsent: booking.photoConsent,
      notes: booking.notes,
      additionalCosts: booking.additionalCosts,
      tentCount: booking.tents.size,
      tents: Array.from(booking.tents.values())
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((tent) => ({
          tentId: tent.tentId,
          itemId: tent.itemId,
          itemName: tent.itemName,
          parameters: tent.parameters,
          menuProducts: tent.menuProducts,
          commonItems: tent.commonItems,
        })),
    }));

    // Build aggregated menu items summary
    const aggregatedMenuItems = summaryResult.rows.map((row) => ({
      menuItemName: getLocalizedString(row.menu_item_name),
      menuItemUnit: getLocalizedString(row.menu_item_unit),
      minGuests: row.min_guests ? parseInt(row.min_guests) : null,
      totalQuantity: parseInt(row.total_quantity) || 0,
    }));

    // Convert aggregated parameters to array
    const parametersSummary = Array.from(aggregatedParams.entries()).map(([label, quantity]) => ({
      label,
      quantity,
    }));

    return NextResponse.json({
      summary: {
        date,
        totalTents: uniqueTentIds.size,
        parametersSummary,
        aggregatedMenuItems,
        aggregatedCommonItems,
        aggregatedAdditionalCosts,
      },
      data,
    });
  } catch (error) {
    console.error("Error fetching kitchen food report:", error);
    return NextResponse.json({ error: "Failed to fetch kitchen food report" }, { status: 500 });
  } finally {
    client.release();
  }
}
