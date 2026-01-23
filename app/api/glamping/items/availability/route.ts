import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Allow both staff and guest access for public search
    // if (!session || session.type !== 'staff') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { item_ids, check_in_date, check_out_date } = body;

    if (!item_ids || !Array.isArray(item_ids)) {
      return NextResponse.json({ error: 'item_ids array is required' }, { status: 400 });
    }

    if (!check_in_date || !check_out_date) {
      return NextResponse.json({ error: 'check_in_date and check_out_date are required' }, { status: 400 });
    }

    // Check availability for each item
    const availability = await Promise.all(
      item_ids.map(async (itemId: string) => {
        try {
          // Get item inventory attributes
          const itemQuery = await pool.query(`
            SELECT
              i.id,
              i.name,
              COALESCE(a.inventory_quantity, 1) as inventory_quantity,
              COALESCE(a.unlimited_inventory, false) as unlimited_inventory,
              COALESCE(a.allocation_type, 'per_night') as allocation_type
            FROM glamping_items i
            LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
            WHERE i.id = $1
          `, [itemId]);

          if (itemQuery.rows.length === 0) {
            return {
              item_id: itemId,
              is_available: false,
              available_quantity: 0,
              booking_conflicts: 0,
              error: 'Item not found'
            };
          }

          const item = itemQuery.rows[0];

          // If unlimited inventory, always available
          if (item.unlimited_inventory) {
            return {
              item_id: itemId,
              is_available: true,
              available_quantity: -1,
              booking_conflicts: 0,
              unlimited: true
            };
          }

          // Count overlapping bookings
          // Overlap logic: booking overlaps if:
          // - Booking starts before our end date AND booking ends after our start date
          const bookingQuery = await pool.query(`
            SELECT COUNT(DISTINCT bi.id) as booking_count
            FROM glamping_booking_items bi
            JOIN glamping_bookings b ON bi.booking_id = b.id
            WHERE bi.item_id = $1
              AND b.status NOT IN ('cancelled')
              AND (
                (b.check_in_date <= $2 AND b.check_out_date > $2)
                OR (b.check_in_date < $3 AND b.check_out_date >= $3)
                OR (b.check_in_date >= $2 AND b.check_out_date <= $3)
              )
          `, [itemId, check_in_date, check_out_date]);

          const bookedQuantity = parseInt(bookingQuery.rows[0].booking_count);
          const availableQuantity = item.inventory_quantity - bookedQuantity;

          return {
            item_id: itemId,
            is_available: availableQuantity > 0,
            available_quantity: Math.max(0, availableQuantity),
            booking_conflicts: bookedQuantity,
            unlimited: false
          };
        } catch (error) {
          console.error(`Error checking availability for item ${itemId}:`, error);
          return {
            item_id: itemId,
            is_available: false,
            available_quantity: 0,
            booking_conflicts: 0,
            error: 'Failed to check availability'
          };
        }
      })
    );

    return NextResponse.json({ availability });
  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
  }
}
