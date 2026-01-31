import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { eachDayOfInterval, parseISO, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!itemId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'itemId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Get item inventory attributes (only active items)
    const itemQuery = await pool.query(`
      SELECT
        i.id,
        i.name,
        COALESCE(a.inventory_quantity, 1) as inventory_quantity,
        COALESCE(a.unlimited_inventory, false) as unlimited_inventory,
        COALESCE(a.allocation_type, 'per_night') as allocation_type
      FROM glamping_items i
      LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE i.id = $1
        AND COALESCE(z.is_active, true) = true
        AND COALESCE(a.is_active, true) = true
    `, [itemId]);

    if (itemQuery.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = itemQuery.rows[0];

    // If unlimited inventory, all dates are available
    if (item.unlimited_inventory) {
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      });

      const availability = days.map(day => ({
        date: format(day, 'yyyy-MM-dd'),
        available: true,
        unlimited: true
      }));

      return NextResponse.json({ availability });
    }

    // Get all bookings that overlap with the date range
    // Use glamping_booking_tents which stores per-tent dates (supports multi-tent bookings with different dates)
    const bookingsQuery = await pool.query(`
      SELECT
        bt.check_in_date::text as check_in_date,
        bt.check_out_date::text as check_out_date
      FROM glamping_booking_tents bt
      JOIN glamping_bookings b ON bt.booking_id = b.id
      WHERE bt.item_id = $1
        AND b.status NOT IN ('cancelled', 'rejected')
        AND bt.check_in_date IS NOT NULL
        AND bt.check_out_date IS NOT NULL
        AND bt.check_in_date < $3
        AND bt.check_out_date > $2
    `, [itemId, startDate, endDate]);

    // Generate all days in the range
    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate)
    });

    // Check availability for each day
    const availability = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');

      // Count how many bookings overlap with this specific day
      const overlappingBookings = bookingsQuery.rows.filter(booking => {
        try {
          // Skip if dates are null or invalid
          if (!booking.check_in_date || !booking.check_out_date) {
            return false;
          }

          const checkIn = format(parseISO(booking.check_in_date), 'yyyy-MM-dd');
          const checkOut = format(parseISO(booking.check_out_date), 'yyyy-MM-dd');

          // A booking overlaps with this day if:
          // check_in <= day < check_out
          return dayStr >= checkIn && dayStr < checkOut;
        } catch (error) {
          // Skip bookings with invalid dates
          console.error('Invalid booking date:', booking, error);
          return false;
        }
      });

      const bookedQuantity = overlappingBookings.length;
      const availableQuantity = item.inventory_quantity - bookedQuantity;

      return {
        date: dayStr,
        available: availableQuantity > 0,
        available_quantity: Math.max(0, availableQuantity),
        booked_quantity: bookedQuantity
      };
    });

    return NextResponse.json({ availability });
  } catch (error) {
    console.error('Calendar availability error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar availability' },
      { status: 500 }
    );
  }
}
