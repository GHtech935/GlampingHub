import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "sale", "operations", "owner", "glamping_owner"];

// GET /api/admin/glamping/bookings/notes - List bookings with notes
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaffSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zoneId");
  const dateRange = searchParams.get("dateRange") || "last_30_days";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const staffId = searchParams.get("staffId");
  const search = searchParams.get("search");

  const client = await pool.connect();
  try {
    // Build filters
    const conditions: string[] = [];
    const params: (string | Date)[] = [];
    let paramIndex = 1;

    // Zone filter
    if (zoneId && zoneId !== "all") {
      conditions.push(`i.zone_id = $${paramIndex}`);
      params.push(zoneId);
      paramIndex++;
    }

    // For glamping_owner, restrict to their zones
    if (session.role === "glamping_owner" && session.glampingZoneIds?.length) {
      conditions.push(`i.zone_id = ANY($${paramIndex}::uuid[])`);
      params.push(session.glampingZoneIds.join(","));
      paramIndex++;
    }

    // Date range filter
    const now = new Date();
    let dateFilter: { from?: Date; to?: Date } = {};

    switch (dateRange) {
      case "today":
        dateFilter.from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter.to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case "last_7_days":
        dateFilter.from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter.to = now;
        break;
      case "last_30_days":
        dateFilter.from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter.to = now;
        break;
      case "custom":
        if (dateFrom) dateFilter.from = new Date(dateFrom);
        if (dateTo) dateFilter.to = new Date(dateTo);
        break;
    }

    if (dateFilter.from) {
      conditions.push(`n.created_at >= $${paramIndex}`);
      params.push(dateFilter.from);
      paramIndex++;
    }
    if (dateFilter.to) {
      conditions.push(`n.created_at < $${paramIndex}`);
      params.push(dateFilter.to);
      paramIndex++;
    }

    // Staff filter
    if (staffId && staffId !== "all") {
      conditions.push(`n.author_id = $${paramIndex}`);
      params.push(staffId);
      paramIndex++;
    }

    // Search filter
    if (search) {
      conditions.push(`(
        n.content ILIKE $${paramIndex} OR
        b.booking_code ILIKE $${paramIndex} OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query for bookings with their first note (earliest note per booking)
    const notesQuery = `
      SELECT DISTINCT ON (n.booking_id)
        n.id AS note_id,
        n.content,
        n.created_at AS note_date,
        b.id AS booking_id,
        b.booking_code,
        u.id AS staff_id,
        u.first_name AS staff_first_name,
        u.last_name AS staff_last_name,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name
      FROM glamping_booking_notes n
      JOIN glamping_bookings b ON n.booking_id = b.id
      JOIN users u ON n.author_id = u.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN glamping_booking_items bi ON bi.booking_id = b.id
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      ${whereClause}
      ORDER BY n.booking_id, n.created_at ASC
    `;

    const notesResult = await client.query(notesQuery, params);

    // Sort by note_date descending (newest first)
    const notes = notesResult.rows
      .map((row) => ({
        noteId: row.note_id,
        content: row.content,
        noteDate: row.note_date,
        bookingId: row.booking_id,
        bookingCode: row.booking_code,
        staffId: row.staff_id,
        staffName: [row.staff_first_name, row.staff_last_name]
          .filter(Boolean)
          .join(" ") || "Unknown",
        customerName: [row.customer_first_name, row.customer_last_name]
          .filter(Boolean)
          .join(" ") || "Guest",
      }))
      .sort((a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime());

    // Get staff options for filter dropdown (staff who have written notes)
    const staffQuery = `
      SELECT DISTINCT u.id, u.first_name, u.last_name
      FROM users u
      JOIN glamping_booking_notes n ON n.author_id = u.id
      ORDER BY u.first_name, u.last_name
    `;
    const staffResult = await client.query(staffQuery);

    const staffOptions = staffResult.rows.map((row) => ({
      id: row.id,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Unknown",
    }));

    return NextResponse.json({
      notes,
      staffOptions,
      totalCount: notes.length,
    });
  } catch (error) {
    console.error("Error fetching booking notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking notes" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
