import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/glamping/taxes
 * List all glamping taxes
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT id, name, type, apply_to, amount, is_percentage, status
       FROM glamping_taxes
       ORDER BY name`
    );

    return NextResponse.json({
      taxes: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        apply_to: row.apply_to,
        amount: parseFloat(row.amount),
        is_percentage: row.is_percentage,
        status: row.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching glamping taxes:", error);
    return NextResponse.json(
      { error: "Failed to fetch taxes" },
      { status: 500 }
    );
  }
}
