import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: bookingCode } = await params;

    // First, get the booking ID from the booking code
    const bookingIdResult = await query(`
      SELECT id FROM glamping_bookings WHERE booking_code = $1
    `, [bookingCode]);

    if (bookingIdResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingId = bookingIdResult.rows[0].id;

    // Query 1: Main booking + customer info
    const bookingResult = await query(`
      SELECT
        b.id, b.booking_code, b.status, b.payment_status,
        b.check_in_date, b.check_out_date,
        b.subtotal_amount, b.tax_amount, b.discount_amount,
        b.total_amount, b.deposit_due, b.balance_due,
        b.guests, b.total_guests, b.special_requirements, b.currency,
        c.email, c.first_name, c.last_name, c.phone, c.country, c.address_line1
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Query 2: Accommodation details
    const accommodationResult = await query(`
      SELECT i.name as item_name, z.name as zone_name, z.id as zone_id
      FROM glamping_booking_items bi
      JOIN glamping_items i ON bi.item_id = i.id
      JOIN glamping_zones z ON i.zone_id = z.id
      WHERE bi.booking_id = $1 LIMIT 1
    `, [bookingId]);

    const accommodation = accommodationResult.rows[0] || {};

    // Query 3: Parameters
    const parametersResult = await query(`
      SELECT bp.label, bp.booked_quantity, p.color_code
      FROM glamping_booking_parameters bp
      LEFT JOIN glamping_parameters p ON bp.parameter_id = p.id
      WHERE bp.booking_id = $1
    `, [bookingId]);

    // Query 4: Menu products
    const menuProductsResult = await query(`
      SELECT
        mp.id, mp.menu_item_id, mp.quantity, mp.unit_price, mp.total_price,
        mi.name, mi.description, mi.unit, mi.image_url,
        mc.name as category_name
      FROM glamping_booking_menu_products mp
      LEFT JOIN glamping_menu_items mi ON mp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE mp.booking_id = $1
      ORDER BY mc.weight, mi.sort_order, mi.name
    `, [bookingId]);

    // Calculate 24-hour restriction
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const msUntilCheckIn = checkInDate.getTime() - now.getTime();
    const hoursUntilCheckIn = msUntilCheckIn / (1000 * 60 * 60);
    const canEditMenu = hoursUntilCheckIn >= 24 && booking.status === 'confirmed';

    // Build response
    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        accommodation,
        customer: {
          email: booking.email,
          first_name: booking.first_name,
          last_name: booking.last_name,
          phone: booking.phone,
          country: booking.country,
          address_line1: booking.address_line1,
        }
      },
      parameters: parametersResult.rows,
      menuProducts: menuProductsResult.rows,
      canEditMenu,
      hoursUntilCheckIn: Math.max(0, hoursUntilCheckIn),
    });
  } catch (error: any) {
    console.error('Error fetching booking details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
