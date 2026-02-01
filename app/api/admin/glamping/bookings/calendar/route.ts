import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession, getAccessibleGlampingZoneIds } from "@/lib/auth";

// Disable caching - admin needs real-time data
export const dynamic = 'force-dynamic';

// GET /api/admin/glamping/bookings/calendar
// Fetch bookings for calendar view, grouped by date
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
    const month = searchParams.get("month"); // YYYY-MM format

    if (!month) {
      return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
    }

    // Optional filters
    const categoryId = searchParams.get("categoryId");
    const itemId = searchParams.get("itemId");
    const statuses = searchParams.get("statuses"); // Comma-separated list of statuses
    const source = searchParams.get("source"); // 'all', 'web', 'admin', or specific admin user ID
    const search = searchParams.get("search");
    const searchType = searchParams.get("searchType") || 'customer'; // 'customer' or 'item'

    // Calculate date range for the month
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0); // Last day of month

    // Extend range to show bookings that span into/out of the month
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = endOfMonth.toISOString().split('T')[0];

    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Date range: bookings that overlap with the month
    conditions.push(`bt.check_in_date <= $${paramIndex}`);
    values.push(endDate);
    paramIndex++;

    conditions.push(`bt.check_out_date >= $${paramIndex}`);
    values.push(startDate);
    paramIndex++;

    // Zone filter
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ days: {}, filterOptions: { categories: [], items: [], adminUsers: [] }, summary: { totalBookings: 0, totalGuests: 0, totalAmount: 0 } });
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

    // Category filter
    if (categoryId && categoryId !== "all") {
      conditions.push(`i.category_id = $${paramIndex}`);
      values.push(categoryId);
      paramIndex++;
    }

    // Item filter
    if (itemId && itemId !== "all") {
      conditions.push(`i.id = $${paramIndex}`);
      values.push(itemId);
      paramIndex++;
    }

    // Status filter - supports multiple statuses
    if (statuses) {
      const statusArray = statuses.split(',').filter(s => s.trim());
      if (statusArray.length > 0) {
        conditions.push(`b.status = ANY($${paramIndex}::text[])`);
        values.push(statusArray);
        paramIndex++;
      }
    }

    // Source filter
    if (source && source !== "all") {
      if (source === "web") {
        conditions.push(`b.created_by_user_id IS NULL`);
      } else if (source === "admin") {
        conditions.push(`b.created_by_user_id IS NOT NULL`);
      } else {
        // Specific admin user ID
        conditions.push(`b.created_by_user_id = $${paramIndex}`);
        values.push(source);
        paramIndex++;
      }
    }

    // Search filter
    if (search && search.trim() !== "") {
      if (searchType === 'item') {
        conditions.push(`(
          i.name::text ILIKE $${paramIndex} OR
          i.sku ILIKE $${paramIndex}
        )`);
      } else {
        // Search by customer
        conditions.push(`(
          b.booking_code ILIKE $${paramIndex} OR
          c.email ILIKE $${paramIndex} OR
          c.first_name ILIKE $${paramIndex} OR
          c.last_name ILIKE $${paramIndex} OR
          c.phone ILIKE $${paramIndex} OR
          CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramIndex}
        )`);
      }
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Main query to fetch bookings with tent data
    const query = `
      SELECT
        bt.id as tent_id,
        bt.check_in_date,
        bt.check_out_date,
        bt.nights,
        bt.subtotal,
        b.id as booking_id,
        b.booking_code,
        b.status,
        b.payment_status,
        b.total_amount,
        b.total_guests,
        b.guests,
        b.created_by_user_id,
        i.id as item_id,
        i.name as item_name,
        i.category_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        (
          SELECT json_agg(json_build_object(
            'label', p.name,
            'quantity', bp.booked_quantity
          ))
          FROM glamping_booking_parameters bp
          JOIN glamping_parameters p ON bp.parameter_id = p.id
          WHERE bp.booking_tent_id = bt.id
        ) as parameters
      FROM glamping_booking_tents bt
      JOIN glamping_bookings b ON bt.booking_id = b.id
      JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON b.created_by_user_id = u.id
      ${whereClause}
      ORDER BY bt.check_in_date ASC, c.first_name ASC
    `;

    const result = await client.query(query, values);

    // First, group tents by booking_id + date range to consolidate bookings
    // Key: booking_id-checkInDate-checkOutDate
    const bookingDateGroups: Map<string, {
      booking: any;
      tents: Array<{ itemId: string; itemName: string; parameters: any[] }>;
    }> = new Map();

    for (const row of result.rows) {
      const checkInStr = row.check_in_date instanceof Date
        ? row.check_in_date.toISOString().split('T')[0]
        : String(row.check_in_date).split('T')[0];
      const checkOutStr = row.check_out_date instanceof Date
        ? row.check_out_date.toISOString().split('T')[0]
        : String(row.check_out_date).split('T')[0];

      const groupKey = `${row.booking_id}-${checkInStr}-${checkOutStr}`;
      const itemName = typeof row.item_name === 'object'
        ? (row.item_name.vi || row.item_name.en || 'Unknown')
        : row.item_name;

      if (bookingDateGroups.has(groupKey)) {
        // Add tent to existing group
        const group = bookingDateGroups.get(groupKey)!;
        group.tents.push({
          itemId: row.item_id,
          itemName,
          parameters: row.parameters || [],
        });
      } else {
        // Create new group
        bookingDateGroups.set(groupKey, {
          booking: row,
          tents: [{
            itemId: row.item_id,
            itemName,
            parameters: row.parameters || [],
          }],
        });
      }
    }

    // Group bookings by date
    const daysMap: Record<string, {
      events: any[];
      totalBookings: Set<string>;
      totalGuests: number;
      totalPaidAmount: number;
    }> = {};

    // Process each grouped booking (by date range)
    for (const [groupKey, group] of bookingDateGroups) {
      const row = group.booking;
      const checkInStr = row.check_in_date instanceof Date
        ? row.check_in_date.toISOString().split('T')[0]
        : String(row.check_in_date).split('T')[0];
      const checkOutStr = row.check_out_date instanceof Date
        ? row.check_out_date.toISOString().split('T')[0]
        : String(row.check_out_date).split('T')[0];

      const checkIn = new Date(checkInStr);
      const checkOut = new Date(checkOutStr);
      const customerName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown';

      // Build item name: show count if multiple tents, or single tent name
      const tentCount = group.tents.length;
      const itemName = tentCount > 1
        ? `${tentCount} tents`
        : group.tents[0].itemName;

      // Combine all parameters from all tents
      const allParameters = group.tents.flatMap(t => t.parameters || []);

      const event = {
        id: row.booking_id,
        bookingCode: row.booking_code,
        customerName,
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        status: row.status,
        paymentStatus: row.payment_status,
        totalGuests: row.total_guests || 0,
        totalAmount: parseFloat(row.total_amount) || 0,
        // Use groupKey as unique identifier for this booking+date combination
        itemId: groupKey,
        itemName,
        tentCount,
        tents: group.tents, // Include all tents for detail view
        customerEmail: row.email || '',
        customerPhone: row.phone || '',
        createdBy: row.created_by_user_id ? `${row.created_by_first_name || ''} ${row.created_by_last_name || ''}`.trim() : null,
        source: row.created_by_user_id ? 'admin' : 'web',
        parameters: allParameters,
      };

      // Add event to each day it spans (including checkout day)
      const current = new Date(checkIn);
      while (current <= checkOut) {
        const dateStr = current.toISOString().split('T')[0];

        // Only include days within the requested month
        if (dateStr >= startDate && dateStr <= endDate) {
          if (!daysMap[dateStr]) {
            daysMap[dateStr] = {
              events: [],
              totalBookings: new Set(),
              totalGuests: 0,
              totalPaidAmount: 0,
            };
          }

          // Add event if not already added for this day (check by groupKey)
          const existingEvent = daysMap[dateStr].events.find(e => e.itemId === groupKey);
          if (!existingEvent) {
            daysMap[dateStr].events.push(event);
          }

          // Track unique bookings
          if (!daysMap[dateStr].totalBookings.has(row.booking_id)) {
            daysMap[dateStr].totalBookings.add(row.booking_id);
            daysMap[dateStr].totalGuests += event.totalGuests;

            // Only count paid amount for paid bookings
            if (row.payment_status === 'fully_paid' || row.payment_status === 'deposit_paid') {
              daysMap[dateStr].totalPaidAmount += event.totalAmount;
            }
          }
        }

        current.setDate(current.getDate() + 1);
      }
    }

    // Convert to response format
    const days: Record<string, any> = {};
    for (const [date, data] of Object.entries(daysMap)) {
      days[date] = {
        date,
        events: data.events,
        totalBookings: data.totalBookings.size,
        totalGuests: data.totalGuests,
        totalPaidAmount: data.totalPaidAmount,
      };
    }

    // Fetch filter options
    const filterZoneCondition = zoneId && zoneId !== "all"
      ? `WHERE zone_id = $1`
      : accessibleZoneIds !== null
        ? `WHERE zone_id = ANY($1::uuid[])`
        : '';

    const filterZoneValue: any[] = zoneId && zoneId !== "all"
      ? [zoneId]
      : accessibleZoneIds !== null
        ? [accessibleZoneIds]
        : [];

    // Categories
    const categoriesQuery = `
      SELECT DISTINCT gc.id, gc.name
      FROM glamping_categories gc
      JOIN glamping_items gi ON gi.category_id = gc.id
      ${filterZoneCondition ? filterZoneCondition.replace('zone_id', 'gi.zone_id') : ''}
      ORDER BY gc.name
    `;
    const categoriesResult = filterZoneValue.length > 0
      ? await client.query(categoriesQuery, filterZoneValue)
      : await client.query(categoriesQuery);

    // Items
    const itemsQuery = `
      SELECT id, name, category_id
      FROM glamping_items
      ${filterZoneCondition}
      ORDER BY name
    `;
    const itemsResult = filterZoneValue.length > 0
      ? await client.query(itemsQuery, filterZoneValue)
      : await client.query(itemsQuery);

    // Admin users who have created bookings
    const adminUsersQuery = `
      SELECT DISTINCT u.id, u.first_name, u.last_name
      FROM users u
      JOIN glamping_bookings b ON b.created_by_user_id = u.id
      JOIN glamping_booking_items bi ON bi.booking_id = b.id
      JOIN glamping_items i ON bi.item_id = i.id
      ${filterZoneCondition ? filterZoneCondition.replace('zone_id', 'i.zone_id') : ''}
      ORDER BY u.first_name, u.last_name
    `;
    const adminUsersResult = filterZoneValue.length > 0
      ? await client.query(adminUsersQuery, filterZoneValue)
      : await client.query(adminUsersQuery);

    // Calculate summary
    const uniqueBookings = new Set<string>();
    let totalGuests = 0;
    let totalAmount = 0;

    for (const day of Object.values(daysMap)) {
      for (const event of day.events) {
        if (!uniqueBookings.has(event.id)) {
          uniqueBookings.add(event.id);
          totalGuests += event.totalGuests;
          totalAmount += event.totalAmount;
        }
      }
    }

    const filterOptions = {
      categories: categoriesResult.rows.map(row => ({
        id: row.id,
        name: typeof row.name === 'object' ? (row.name.vi || row.name.en || 'Unknown') : row.name,
      })),
      items: itemsResult.rows.map(row => ({
        id: row.id,
        name: typeof row.name === 'object' ? (row.name.vi || row.name.en || 'Unknown') : row.name,
        categoryId: row.category_id,
      })),
      adminUsers: adminUsersResult.rows.map(row => ({
        id: row.id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      })),
    };

    const summary = {
      totalBookings: uniqueBookings.size,
      totalGuests,
      totalAmount,
    };

    return NextResponse.json({ days, filterOptions, summary });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
