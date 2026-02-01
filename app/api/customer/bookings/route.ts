import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, isCustomerSession } from '@/lib/auth';

// GET /api/customer/bookings - Get customer's glamping bookings
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getSession();

    if (!session || !isCustomerSession(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    // Build WHERE clause based on filter
    let filterClause = '';
    const today = new Date().toISOString().split('T')[0];

    switch (filter) {
      case 'upcoming':
        // Upcoming: check_in_date >= today AND not cancelled
        filterClause = `AND b.check_in_date >= '${today}' AND b.status NOT IN ('cancelled') AND b.payment_status NOT IN ('expired', 'failed')`;
        break;
      case 'past':
        // Past: check_out_date < today AND not cancelled
        filterClause = `AND b.check_out_date < '${today}' AND b.status NOT IN ('cancelled')`;
        break;
      case 'cancelled':
        // Cancelled: status is 'cancelled' or payment_status is 'expired' or 'failed'
        filterClause = `AND (b.status = 'cancelled' OR b.payment_status IN ('expired', 'failed'))`;
        break;
      default:
        // All bookings - no additional filter
        filterClause = '';
    }

    const result = await client.query(
      `SELECT
        b.id,
        b.booking_code,
        b.check_in_date,
        b.check_out_date,
        b.nights,
        b.guests,
        b.total_guests,
        b.status,
        b.payment_status,
        b.subtotal_amount,
        b.tax_amount,
        b.discount_amount,
        b.total_amount,
        b.deposit_due,
        b.balance_due,
        b.currency,
        b.created_at,
        -- Get the first item's zone info
        z.name as zone_name,
        z.id as zone_id,
        -- Get item name from the booking
        (
          SELECT i.name
          FROM glamping_booking_items bi
          JOIN glamping_items i ON bi.item_id = i.id
          WHERE bi.booking_id = b.id
          LIMIT 1
        ) as item_name,
        -- Calculate actual remaining balance from payments table
        GREATEST(0, b.total_amount - COALESCE(
          (SELECT SUM(amount) FROM glamping_booking_payments
           WHERE booking_id = b.id
           AND status IN ('paid', 'success', 'successful', 'completed')), 0
        )) as calculated_balance
      FROM glamping_bookings b
      LEFT JOIN glamping_booking_items bi ON bi.booking_id = b.id
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE b.customer_id = $1
      ${filterClause}
      GROUP BY b.id, z.name, z.id
      ORDER BY b.check_in_date DESC`,
      [session.id]
    );

    const bookings = result.rows.map(row => {
      // Parse guests JSONB
      let adults = 0;
      let children = 0;
      if (row.guests) {
        const guests = typeof row.guests === 'string' ? JSON.parse(row.guests) : row.guests;
        adults = guests.adults || guests.adult || 0;
        children = guests.children || guests.child || 0;
      }

      return {
        id: row.id,
        bookingCode: row.booking_code,
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        nights: row.nights,
        adults,
        children,
        totalGuests: row.total_guests || (adults + children),
        status: row.status,
        paymentStatus: row.payment_status,
        subtotalAmount: parseFloat(row.subtotal_amount) || 0,
        taxAmount: parseFloat(row.tax_amount) || 0,
        discountAmount: parseFloat(row.discount_amount) || 0,
        totalAmount: parseFloat(row.total_amount) || 0,
        depositDue: parseFloat(row.deposit_due) || 0,
        balanceDue: parseFloat(row.calculated_balance) || 0,
        currency: row.currency || 'VND',
        createdAt: row.created_at,
        zoneName: row.zone_name,
        zoneId: row.zone_id,
        itemName: row.item_name,
      };
    });

    return NextResponse.json({
      bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
