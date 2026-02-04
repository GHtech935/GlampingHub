import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/glamping/bookings/[id]/guest
 * Update guest information for a glamping booking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      country,
      address,
      email,
      customerNotes,
      invoiceNotes,
      specialRequirements,
    } = body;

    // Check if booking exists
    const bookingResult = await client.query(
      `SELECT b.id, b.customer_id FROM glamping_bookings b WHERE b.id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    await client.query('BEGIN');

    // Find or create customer by email, then reassign booking if needed
    let targetCustomerId = booking.customer_id; // Default to current customer

    if (email !== undefined && email !== '') {
      // Find customer with new email
      const customerResult = await client.query(
        `SELECT id FROM customers WHERE email = $1`,
        [email]
      );

      if (customerResult.rows.length > 0) {
        // Email exists -> Use existing customer
        targetCustomerId = customerResult.rows[0].id;
      } else {
        // Email doesn't exist -> Create new customer
        const newCustomerResult = await client.query(
          `INSERT INTO customers (email, first_name, last_name, phone, country, address_line1, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id`,
          [
            email,
            firstName !== undefined ? firstName : '',
            lastName !== undefined ? lastName : '',
            phone !== undefined ? phone : '',
            country !== undefined ? country : 'Vietnam',
            address !== undefined ? address : ''
          ]
        );
        targetCustomerId = newCustomerResult.rows[0].id;
      }
    }

    // Update booking customer reference if changed
    if (targetCustomerId !== booking.customer_id) {
      await client.query(
        `UPDATE glamping_bookings SET customer_id = $1, updated_at = NOW() WHERE id = $2`,
        [targetCustomerId, id]
      );
    }

    // Update target customer info if provided
    const customerUpdates: string[] = [];
    const customerValues: any[] = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      customerUpdates.push(`first_name = $${paramIndex}`);
      customerValues.push(firstName);
      paramIndex++;
    }

    if (lastName !== undefined) {
      customerUpdates.push(`last_name = $${paramIndex}`);
      customerValues.push(lastName);
      paramIndex++;
    }

    if (phone !== undefined) {
      customerUpdates.push(`phone = $${paramIndex}`);
      customerValues.push(phone);
      paramIndex++;
    }

    if (country !== undefined) {
      customerUpdates.push(`country = $${paramIndex}`);
      customerValues.push(country);
      paramIndex++;
    }

    if (address !== undefined) {
      customerUpdates.push(`address_line1 = $${paramIndex}`);
      customerValues.push(address);
      paramIndex++;
    }

    if (customerUpdates.length > 0) {
      customerUpdates.push(`updated_at = NOW()`);
      customerValues.push(targetCustomerId);

      await client.query(
        `UPDATE customers
         SET ${customerUpdates.join(', ')}
         WHERE id = $${paramIndex}`,
        customerValues
      );
    }

    // Update guest_name on booking from target customer
    if (firstName !== undefined || lastName !== undefined || targetCustomerId !== booking.customer_id) {
      const currentCustomer = await client.query(
        `SELECT first_name, last_name FROM customers WHERE id = $1`,
        [targetCustomerId]
      );
      if (currentCustomer.rows.length > 0) {
        const newFirst = firstName !== undefined ? firstName : currentCustomer.rows[0].first_name || '';
        const newLast = lastName !== undefined ? lastName : currentCustomer.rows[0].last_name || '';
        const newGuestName = `${newFirst} ${newLast}`.trim();
        await client.query(
          `UPDATE glamping_bookings SET guest_name = $1, updated_at = NOW() WHERE id = $2`,
          [newGuestName, id]
        );
      }
    }

    // Update booking notes
    const bookingUpdates: string[] = [];
    const bookingValues: any[] = [];
    let bParamIndex = 1;

    if (customerNotes !== undefined) {
      bookingUpdates.push(`customer_notes = $${bParamIndex}`);
      bookingValues.push(customerNotes);
      bParamIndex++;
    }

    if (invoiceNotes !== undefined) {
      bookingUpdates.push(`invoice_notes = $${bParamIndex}`);
      bookingValues.push(invoiceNotes);
      bParamIndex++;
    }

    if (specialRequirements !== undefined) {
      bookingUpdates.push(`special_requirements = $${bParamIndex}`);
      bookingValues.push(specialRequirements);
      bParamIndex++;
    }

    if (bookingUpdates.length > 0) {
      bookingUpdates.push(`updated_at = NOW()`);
      bookingValues.push(id);

      await client.query(
        `UPDATE glamping_bookings
         SET ${bookingUpdates.join(', ')}
         WHERE id = $${bParamIndex}`,
        bookingValues
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating glamping guest info:", error);
    return NextResponse.json(
      { error: "Failed to update guest info" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
