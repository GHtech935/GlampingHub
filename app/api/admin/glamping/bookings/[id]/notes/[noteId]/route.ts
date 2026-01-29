import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/glamping/bookings/[id]/notes/[noteId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getSession();
  if (!session || !isStaffSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId, noteId } = await params;

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
    // Fetch existing note
    const noteResult = await client.query(
      "SELECT id, author_id FROM glamping_booking_notes WHERE id = $1 AND booking_id = $2",
      [noteId, bookingId]
    );

    if (noteResult.rows.length === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const note = noteResult.rows[0];

    // Permission: author can edit own note, admin can edit any
    if (note.author_id !== session.id && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await client.query(
      `UPDATE glamping_booking_notes
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, booking_id, author_id, content, created_at, updated_at`,
      [content, noteId]
    );

    const row = result.rows[0];
    return NextResponse.json({
      note: {
        id: row.id,
        bookingId: row.booking_id,
        authorId: row.author_id,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("Error updating booking note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE /api/admin/glamping/bookings/[id]/notes/[noteId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getSession();
  if (!session || !isStaffSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId, noteId } = await params;

  const client = await pool.connect();
  try {
    // Fetch existing note
    const noteResult = await client.query(
      "SELECT id, author_id FROM glamping_booking_notes WHERE id = $1 AND booking_id = $2",
      [noteId, bookingId]
    );

    if (noteResult.rows.length === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const note = noteResult.rows[0];

    // Permission: author can delete own note, admin can delete any
    if (note.author_id !== session.id && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await client.query("DELETE FROM glamping_booking_notes WHERE id = $1", [
      noteId,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
