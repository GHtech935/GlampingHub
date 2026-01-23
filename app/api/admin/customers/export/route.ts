import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, isStaffSession, getAccessibleCampsiteIds } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin, sale, and owner can export customers
    if (!['admin', 'sale', 'owner'].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const campsiteId = searchParams.get("campsiteId");
    const checkedOutOnly = searchParams.get("checkedOutOnly") === "true";

    // Validate required params
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];

    // Date range filter on check_in_date
    params.push(startDate);
    conditions.push(`b.check_in_date >= $${params.length}::date`);

    params.push(endDate);
    conditions.push(`b.check_in_date <= $${params.length}::date`);

    // Exclude cancelled bookings
    conditions.push(`b.status != 'cancelled'`);

    // Checked out only filter
    if (checkedOutOnly) {
      conditions.push(`b.status = 'checked_out'`);
    }

    // Campsite filter (specific campsite selected)
    if (campsiteId) {
      params.push(campsiteId);
      conditions.push(`b.campsite_id = $${params.length}::uuid`);
    }

    // Owner restriction - only see customers from their campsites
    const accessibleCampsiteIds = getAccessibleCampsiteIds(session);
    if (accessibleCampsiteIds && accessibleCampsiteIds.length > 0) {
      params.push(accessibleCampsiteIds);
      conditions.push(`b.campsite_id = ANY($${params.length}::uuid[])`);
    } else if (accessibleCampsiteIds && accessibleCampsiteIds.length === 0) {
      // Owner has no campsites assigned - return empty
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query customers with booking count within the date range
    const result = await query<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      country: string;
      booking_count: string;
    }>(
      `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.country,
        COUNT(b.id) as booking_count
      FROM customers c
      INNER JOIN bookings b ON b.customer_id = c.id
      ${whereClause}
      GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.country
      ORDER BY c.last_name, c.first_name
      `,
      params
    );

    const customers = result.rows.map((row) => ({
      id: row.id,
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      email: row.email || "",
      phone: row.phone || "",
      country: row.country || "",
      booking_count: parseInt(row.booking_count || "0"),
    }));

    return NextResponse.json({
      success: true,
      data: customers,
      total: customers.length,
    });
  } catch (error) {
    console.error("Export customers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
