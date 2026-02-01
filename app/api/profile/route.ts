import { NextRequest, NextResponse } from 'next/server';
import { getSession, isCustomerSession } from '@/lib/auth';
import pool from '@/lib/db';

// GET - Get customer profile
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !isCustomerSession(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT
        c.id, c.email, c.phone, c.first_name, c.last_name, c.country,
        c.address_line1, c.city, c.postal_code,
        c.is_registered, c.email_verified,
        c.created_at,
        c.password_hash IS NOT NULL as has_password,
        (SELECT COUNT(*) FROM glamping_bookings WHERE customer_id = c.id) as total_bookings,
        (SELECT MAX(created_at) FROM glamping_bookings WHERE customer_id = c.id) as last_booking_date
      FROM customers c
      WHERE c.id = $1`,
      [session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = result.rows[0];

    return NextResponse.json({
      customer: {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        firstName: customer.first_name,
        lastName: customer.last_name,
        country: customer.country,
        address: customer.address_line1,
        city: customer.city,
        postalCode: customer.postal_code,
        isRegistered: customer.is_registered,
        emailVerified: customer.email_verified,
        totalBookings: parseInt(customer.total_bookings) || 0,
        lastBookingDate: customer.last_booking_date,
        createdAt: customer.created_at,
        hasPassword: customer.has_password,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update customer profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !isCustomerSession(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phone, country, address, city, postalCode } = body;

    const result = await pool.query(
      `UPDATE customers
       SET
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         phone = COALESCE($4, phone),
         country = COALESCE($5, country),
         address_line1 = COALESCE($6, address_line1),
         city = COALESCE($7, city),
         postal_code = COALESCE($8, postal_code),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, phone, first_name, last_name, country, address_line1, city, postal_code`,
      [session.id, firstName, lastName, phone, country, address, city, postalCode]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = result.rows[0];

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        firstName: customer.first_name,
        lastName: customer.last_name,
        country: customer.country,
        address: customer.address_line1,
        city: customer.city,
        postalCode: customer.postal_code,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
