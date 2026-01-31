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

    // Date filter - use serving_date from menu products
    conditions.push(`bmp.serving_date = $${paramIndex}`);
    values.push(date);
    paramIndex++;

    // Only include active bookings (not cancelled, pending, or checked_out)
    conditions.push(`b.status NOT IN ('cancelled', 'pending', 'checked_out')`);

    // Zone access control
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({
          summary: {
            date,
            totalTents: 0,
            totalAdults: 0,
            totalChildren: 0,
            aggregatedMenuItems: [],
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

    // Main query: Get all menu products for the date with booking and tent info
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
      FROM glamping_booking_menu_products bmp
      JOIN glamping_booking_tents bt ON bmp.booking_tent_id = bt.id
      JOIN glamping_bookings b ON bmp.booking_id = b.id
      JOIN glamping_items gi ON bt.item_id = gi.id
      JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
      LEFT JOIN customers c ON b.customer_id = c.id
      ${whereClause}
      ORDER BY b.booking_code, bt.display_order, mi.name
    `;

    const dataResult = await client.query(dataQuery, values);

    // Fetch parameters for all tents
    const tentIds = [...new Set(dataResult.rows.map((r: any) => r.tent_id))];
    let paramsByTentId = new Map<string, Array<{ label: string; quantity: number }>>();

    if (tentIds.length > 0) {
      const paramsResult = await client.query(
        `SELECT bp.booking_tent_id, bp.label, bp.booked_quantity
         FROM glamping_booking_parameters bp
         JOIN glamping_parameters p ON bp.parameter_id = p.id
         WHERE bp.booking_tent_id = ANY($1::uuid[])
           AND (p.visibility IS NULL OR p.visibility != 'hidden')`,
        [tentIds]
      );
      for (const row of paramsResult.rows) {
        if (!paramsByTentId.has(row.booking_tent_id)) {
          paramsByTentId.set(row.booking_tent_id, []);
        }
        paramsByTentId.get(row.booking_tent_id)!.push({
          label: row.label,
          quantity: row.booked_quantity,
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

    // Aggregated menu items summary query
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
      ${whereClause}
      GROUP BY mi.id, mi.name, mi.unit, mi.min_guests
      ORDER BY mi.name
    `;

    const summaryResult = await client.query(summaryQuery, values);

    // Helper to get localized string
    const getLocalizedString = (value: any): string => {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        return value.vi || value.en || Object.values(value)[0] || "";
      }
      return String(value);
    };

    // Transform data into nested structure by booking
    const bookingsMap = new Map<string, {
      bookingId: string;
      bookingCode: string;
      bookerName: string;
      photoConsent: boolean | null;
      notes: Array<{ id: string; authorName: string; content: string; createdAt: string }>;
      tents: Map<string, {
        tentId: string;
        itemId: string;
        itemName: string;
        parameters: Array<{ label: string; quantity: number }>;
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

    // Convert to array format
    const data = Array.from(bookingsMap.values()).map((booking) => ({
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,
      bookerName: booking.bookerName,
      photoConsent: booking.photoConsent,
      notes: booking.notes,
      tentCount: booking.tents.size,
      tents: Array.from(booking.tents.values())
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((tent) => ({
          tentId: tent.tentId,
          itemId: tent.itemId,
          itemName: tent.itemName,
          parameters: tent.parameters,
          menuProducts: tent.menuProducts,
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
