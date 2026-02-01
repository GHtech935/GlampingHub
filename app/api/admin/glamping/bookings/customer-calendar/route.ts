import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

// Disable caching - admin needs real-time data
export const dynamic = 'force-dynamic';

// GET /api/admin/glamping/bookings/customer-calendar
// Fetch data for customer calendar view (timeline-based)
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get accessible zone IDs
    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);

    const searchParams = request.nextUrl.searchParams;

    // Required parameters
    const zoneId = searchParams.get("zoneId");
    const startDate = searchParams.get("startDate"); // YYYY-MM-DD
    const endDate = searchParams.get("endDate"); // YYYY-MM-DD

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate parameters are required" },
        { status: 400 }
      );
    }

    // Optional filters
    const categoryIds = searchParams.get("categoryIds"); // Comma-separated
    const showEmptyItems = searchParams.get("showEmptyItems") !== "false";

    // Build zone filter
    let zoneCondition = "";
    const zoneValues: any[] = [];

    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({
          categories: [],
          bookings: [],
          dateRange: { startDate, endDate },
        });
      }

      if (zoneId && zoneId !== "all") {
        if (!accessibleZoneIds.includes(zoneId)) {
          return NextResponse.json(
            { error: "You do not have access to this zone" },
            { status: 403 }
          );
        }
        zoneCondition = "gi.zone_id = $1";
        zoneValues.push(zoneId);
      } else {
        zoneCondition = "gi.zone_id = ANY($1::uuid[])";
        zoneValues.push(accessibleZoneIds);
      }
    } else {
      if (zoneId && zoneId !== "all") {
        zoneCondition = "gi.zone_id = $1";
        zoneValues.push(zoneId);
      }
    }

    // Build category filter
    let categoryCondition = "";
    const categoryValues: any[] = [];
    if (categoryIds) {
      const categoryIdArray = categoryIds.split(",").filter((id) => id.trim());
      if (categoryIdArray.length > 0) {
        categoryCondition = `gc.id = ANY($${zoneValues.length + 1}::uuid[])`;
        categoryValues.push(categoryIdArray);
      }
    }

    // Query 1: Get items grouped by category
    const itemsQuery = `
      SELECT
        gi.id as item_id,
        gi.name as item_name,
        gi.sku as item_sku,
        gi.display_order,
        gc.id as category_id,
        gc.name as category_name,
        gc.weight as category_weight
      FROM glamping_items gi
      JOIN glamping_categories gc ON gi.category_id = gc.id
      ${zoneCondition ? `WHERE ${zoneCondition}` : ""}
      ${categoryCondition ? (zoneCondition ? ` AND ${categoryCondition}` : `WHERE ${categoryCondition}`) : ""}
      ORDER BY gc.weight DESC, gi.display_order ASC, gi.name ASC
    `;

    const itemsResult = await client.query(
      itemsQuery,
      [...zoneValues, ...categoryValues]
    );

    // Group items by category
    const categoriesMap = new Map<
      string,
      {
        id: string;
        name: string;
        weight: number;
        items: Array<{
          id: string;
          name: string;
          sku?: string;
          displayOrder: number;
        }>;
      }
    >();

    for (const row of itemsResult.rows) {
      const categoryId = row.category_id;
      const categoryName =
        typeof row.category_name === "object"
          ? row.category_name.vi || row.category_name.en || "Unknown"
          : row.category_name;

      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          weight: row.category_weight || 0,
          items: [],
        });
      }

      const itemName =
        typeof row.item_name === "object"
          ? row.item_name.vi || row.item_name.en || "Unknown"
          : row.item_name;

      categoriesMap.get(categoryId)!.items.push({
        id: row.item_id,
        name: itemName,
        sku: row.item_sku,
        displayOrder: row.display_order || 0,
      });
    }

    // Query 2: Get bookings in date range
    const bookingsConditions: string[] = [];
    const bookingsValues: any[] = [];
    let paramIndex = 1;

    // Date range: bookings that overlap with the range
    bookingsConditions.push(`bt.check_in_date <= $${paramIndex}`);
    bookingsValues.push(endDate);
    paramIndex++;

    bookingsConditions.push(`bt.check_out_date >= $${paramIndex}`);
    bookingsValues.push(startDate);
    paramIndex++;

    // Exclude cancelled bookings
    bookingsConditions.push(`b.status != 'cancelled'`);

    // Zone filter for bookings
    if (zoneCondition) {
      const adjustedZoneCondition = zoneCondition.replace(
        /\$(\d+)/g,
        (_, num) => `$${parseInt(num) + paramIndex - 1}`
      );
      bookingsConditions.push(adjustedZoneCondition.replace("gi.", "i."));
      bookingsValues.push(...zoneValues);
      paramIndex += zoneValues.length;
    }

    // Category filter for bookings
    if (categoryCondition) {
      const adjustedCategoryCondition = categoryCondition.replace(
        /\$(\d+)/g,
        (_, num) => `$${parseInt(num) + paramIndex - 1}`
      );
      bookingsConditions.push(adjustedCategoryCondition);
      bookingsValues.push(...categoryValues);
    }

    const bookingsQuery = `
      SELECT
        b.id as booking_id,
        b.booking_code,
        b.status,
        b.payment_status,
        b.total_amount,
        b.total_guests,
        bt.item_id,
        bt.check_in_date,
        bt.check_out_date,
        i.name as item_name,
        i.category_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone
      FROM glamping_booking_tents bt
      JOIN glamping_bookings b ON bt.booking_id = b.id
      JOIN glamping_items i ON bt.item_id = i.id
      JOIN glamping_categories gc ON i.category_id = gc.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE ${bookingsConditions.join(" AND ")}
      ORDER BY bt.check_in_date ASC
    `;

    const bookingsResult = await client.query(bookingsQuery, bookingsValues);

    // Helper function to format date as YYYY-MM-DD in local timezone
    const formatDateLocal = (date: Date | string): string => {
      if (typeof date === 'string') {
        return date.split('T')[0];
      }
      // Format in local timezone, not UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Transform bookings
    const bookings = bookingsResult.rows.map((row) => {
      const checkInStr = formatDateLocal(row.check_in_date);
      const checkOutStr = formatDateLocal(row.check_out_date);

      const customerName =
        `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unknown";
      const itemName =
        typeof row.item_name === "object"
          ? row.item_name.vi || row.item_name.en || "Unknown"
          : row.item_name;

      return {
        id: row.booking_id,
        bookingCode: row.booking_code,
        customerName,
        customerEmail: row.email || "",
        customerPhone: row.phone || "",
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        status: row.status,
        paymentStatus: row.payment_status,
        totalGuests: row.total_guests || 0,
        totalAmount: parseFloat(row.total_amount) || 0,
        itemId: row.item_id,
        itemName,
      };
    });

    // Count bookings per item for collapsed view
    const itemBookingCounts = new Map<string, Set<string>>();
    for (const booking of bookings) {
      if (!itemBookingCounts.has(booking.itemId)) {
        itemBookingCounts.set(booking.itemId, new Set());
      }
      itemBookingCounts.get(booking.itemId)!.add(booking.id);
    }

    // Filter categories/items if showEmptyItems is false
    const categories = Array.from(categoriesMap.values()).map((category) => {
      let items = category.items;
      let bookingCount = 0;

      // Count bookings for this category
      for (const item of items) {
        const count = itemBookingCounts.get(item.id)?.size || 0;
        bookingCount += count;
      }

      if (!showEmptyItems) {
        // Filter to only items with bookings
        items = items.filter(
          (item) => (itemBookingCounts.get(item.id)?.size || 0) > 0
        );
      }

      return {
        ...category,
        items,
        bookingCount,
      };
    });

    // Filter out empty categories if showEmptyItems is false
    const filteredCategories = showEmptyItems
      ? categories
      : categories.filter((c) => c.items.length > 0);

    return NextResponse.json({
      categories: filteredCategories,
      bookings,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("Error fetching customer calendar data:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer calendar data" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
