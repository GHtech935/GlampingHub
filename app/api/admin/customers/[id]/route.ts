import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, isStaffSession, getAccessibleCampsiteIds } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET customer detail with booking history
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin, sale, owner, and glamping_owner can view customer details
    if (!['admin', 'sale', 'owner', 'glamping_owner'].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: customerId } = await context.params;

    // Get accessible campsite IDs for filtering
    const accessibleCampsiteIds = getAccessibleCampsiteIds(session);

    // For owner: verify customer has bookings at their campsites
    if (accessibleCampsiteIds) {
      const customerCheck = await query(
        `SELECT 1 FROM bookings
         WHERE customer_id = $1
         AND campsite_id = ANY($2::uuid[])
         LIMIT 1`,
        [customerId, accessibleCampsiteIds]
      );

      if (customerCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Customer not found or no access" },
          { status: 404 }
        );
      }
    }

    // Build total_spent subquery based on role
    const totalSpentCondition = accessibleCampsiteIds
      ? `AND campsite_id = ANY($2::uuid[])`
      : '';

    const customerParams = accessibleCampsiteIds
      ? [customerId, accessibleCampsiteIds]
      : [customerId];

    // Get customer details
    const customerResult = await query(
      `
      SELECT
        c.*,
        COALESCE((
          SELECT SUM(total_amount)
          FROM bookings
          WHERE customer_id = c.id
            ${totalSpentCondition}
            AND status != 'cancelled' AND payment_status NOT IN ('expired', 'refunded', 'refund_pending', 'no_refund')
        ), 0) as total_spent
      FROM customers c
      WHERE c.id = $1
      `,
      customerParams
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerResult.rows[0];

    // Build booking query with campsite filtering for owner
    const bookingCondition = accessibleCampsiteIds
      ? `AND b.campsite_id = ANY($2::uuid[])`
      : '';

    const bookingParams = accessibleCampsiteIds
      ? [customerId, accessibleCampsiteIds]
      : [customerId];

    // Get booking history
    const bookingsResult = await query(
      `
      SELECT
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.total_amount,
        b.status,
        b.payment_status,
        b.created_at,
        cs.name as campsite_name
      FROM bookings b
      LEFT JOIN campsites cs ON b.campsite_id = cs.id
      WHERE b.customer_id = $1
      ${bookingCondition}
      ORDER BY b.created_at DESC
      LIMIT 50
      `,
      bookingParams
    );

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          ...customer,
          total_spent: parseFloat(customer.total_spent || "0"),
        },
        bookings: bookingsResult.rows,
      },
    });
  } catch (error) {
    console.error("Get customer detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update customer
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isStaffSession(session) || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: customerId } = await context.params;
    const body = await request.json();

    const {
      email,
      phone,
      first_name,
      last_name,
      country,
      address_line1,
      city,
      postal_code,
      marketing_consent,
    } = body;

    // Check if email already exists for another customer
    if (email) {
      const emailCheck = await query(
        `SELECT id FROM customers WHERE email = $1 AND id != $2`,
        [email, customerId]
      );
      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    // Update customer
    const result = await query(
      `
      UPDATE customers
      SET
        email = COALESCE($1, email),
        phone = COALESCE($2, phone),
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        country = COALESCE($5, country),
        address_line1 = COALESCE($6, address_line1),
        city = COALESCE($7, city),
        postal_code = COALESCE($8, postal_code),
        marketing_consent = COALESCE($9, marketing_consent),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
      `,
      [
        email,
        phone,
        first_name,
        last_name,
        country,
        address_line1,
        city,
        postal_code,
        marketing_consent,
        customerId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE customer
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isStaffSession(session) || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: customerId } = await context.params;

    // Check if customer has bookings
    const bookingCheck = await query(
      `SELECT COUNT(*) as count FROM bookings WHERE customer_id = $1`,
      [customerId]
    );

    if (parseInt(bookingCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with existing bookings" },
        { status: 400 }
      );
    }

    // Delete customer
    await query(`DELETE FROM customers WHERE id = $1`, [customerId]);

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
