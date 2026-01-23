import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// Helper to extract localized string from JSONB
function getLocalizedString(value: any, fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.vi || value.en || fallback;
  }
  return fallback;
}

/**
 * GET /api/admin/glamping/customers/[customerId]/bookings
 * Get all glamping bookings for a customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerId } = await params;

    const query = `
      SELECT
        b.id,
        b.booking_code,
        b.check_in_date,
        b.check_out_date,
        b.total_amount,
        b.status,
        b.payment_status,
        b.created_at,
        z.name as zone_name
      FROM glamping_bookings b
      LEFT JOIN glamping_booking_items bi ON bi.booking_id = b.id
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE b.customer_id = $1
      GROUP BY b.id, z.name
      ORDER BY b.check_in_date DESC
      LIMIT 20
    `;

    const result = await client.query(query, [customerId]);

    // Map bookings with localized zone names
    const bookings = result.rows.map(row => ({
      ...row,
      zone_name: getLocalizedString(row.zone_name),
    }));

    return NextResponse.json({
      bookings,
    });
  } catch (error) {
    console.error("Error fetching customer bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer bookings" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
