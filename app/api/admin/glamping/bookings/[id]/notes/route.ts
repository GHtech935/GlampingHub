import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "sale", "operations", "glamping_owner"];

// GET /api/admin/glamping/bookings/[id]/notes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isStaffSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId } = await params;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        n.id,
        n.booking_id,
        n.author_id,
        n.content,
        n.created_at,
        n.updated_at,
        u.first_name AS author_first_name,
        u.last_name AS author_last_name
      FROM glamping_booking_notes n
      JOIN users u ON u.id = n.author_id
      WHERE n.booking_id = $1
      ORDER BY n.created_at DESC`,
      [bookingId]
    );

    const notes = result.rows.map((row) => ({
      id: row.id,
      bookingId: row.booking_id,
      authorId: row.author_id,
      authorName: [row.author_first_name, row.author_last_name]
        .filter(Boolean)
        .join(" "),
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      notes,
      currentUserId: session.id,
      currentUserRole: session.role,
    });
  } catch (error) {
    console.error("Error fetching booking notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST /api/admin/glamping/bookings/[id]/notes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isStaffSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: bookingId } = await params;

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    // Verify booking exists
    const bookingCheck = await client.query(
      "SELECT id FROM glamping_bookings WHERE id = $1",
      [bookingId]
    );
    if (bookingCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const result = await client.query(
      `INSERT INTO glamping_booking_notes (booking_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, booking_id, author_id, content, created_at, updated_at`,
      [bookingId, session.id, content]
    );

    const row = result.rows[0];
    return NextResponse.json({
      note: {
        id: row.id,
        bookingId: row.booking_id,
        authorId: row.author_id,
        authorName: [session.firstName, session.lastName]
          .filter(Boolean)
          .join(" "),
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("Error creating booking note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
