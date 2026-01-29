import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(formatDateToYMD(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

interface ItemEvent {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  attached_at: Date;
}

async function getItemEvents(itemId: string): Promise<ItemEvent[]> {
  const result = await pool.query(
    `SELECT e.id, e.name, e.start_date, e.end_date, e.days_of_week, ei.created_at as attached_at
     FROM glamping_item_events e
     JOIN glamping_item_event_items ei ON e.id = ei.event_id
     WHERE ei.item_id = $1
     ORDER BY ei.created_at DESC`,
    [itemId]
  );
  return result.rows;
}

async function getPricingByEvent(itemId: string, eventId: string): Promise<Record<string, number>> {
  const result = await pool.query(
    `SELECT parameter_id, amount
     FROM glamping_pricing
     WHERE item_id = $1 AND event_id = $2`,
    [itemId, eventId]
  );

  const pricing: Record<string, number> = {};
  result.rows.forEach((row) => {
    if (row.parameter_id) {
      pricing[row.parameter_id] = parseFloat(row.amount);
    }
  });
  return pricing;
}

async function getBasePricing(itemId: string): Promise<Record<string, number>> {
  const result = await pool.query(
    `SELECT parameter_id, amount
     FROM glamping_pricing
     WHERE item_id = $1 AND event_id IS NULL`,
    [itemId]
  );

  const pricing: Record<string, number> = {};
  result.rows.forEach((row) => {
    if (row.parameter_id) {
      pricing[row.parameter_id] = parseFloat(row.amount);
    }
  });
  return pricing;
}

function findMatchedEvent(events: ItemEvent[], dateStr: string): ItemEvent | null {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  for (const event of events) {
    // Check date range
    if (event.start_date && event.end_date) {
      const startDate = new Date(event.start_date + 'T00:00:00');
      const endDate = new Date(event.end_date + 'T00:00:00');

      if (date >= startDate && date <= endDate) {
        // Check day of week
        if (!event.days_of_week || event.days_of_week.length === 0 || event.days_of_week.includes(dayOfWeek)) {
          return event;
        }
      }
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const { searchParams } = new URL(request.url);

    const startDateParam = searchParams.get('startDate');
    const monthsParam = searchParams.get('months') || '3';
    const months = parseInt(monthsParam, 10);

    if (!startDateParam) {
      return NextResponse.json(
        { error: 'startDate parameter is required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    // 1. Fetch item attributes
    const itemResult = await pool.query(`
      SELECT
        COALESCE(a.inventory_quantity, 1) as inventory_quantity,
        COALESCE(a.unlimited_inventory, false) as unlimited_inventory
      FROM glamping_items i
      LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
      WHERE i.id = $1
    `, [itemId]);

    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const item = itemResult.rows[0];

    // 2. Fetch events for this item (sorted by attach order DESC)
    const events = await getItemEvents(itemId);

    // 3. Fetch base pricing (fallback)
    const basePricing = await getBasePricing(itemId);

    // 4. Generate date range
    const dateRange = generateDateRange(startDate, endDate);

    // 5. Build calendar with event-based pricing
    const calendar = await Promise.all(
      dateRange.map(async (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
        const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';

        // Find matched event for this date
        const matchedEvent = findMatchedEvent(events, dateStr);

        // Get pricing for this date
        let pricing: Record<string, number>;
        if (matchedEvent) {
          pricing = await getPricingByEvent(itemId, matchedEvent.id);
          // Fallback to base pricing for parameters without event pricing
          Object.keys(basePricing).forEach((paramId) => {
            if (!pricing[paramId]) {
              pricing[paramId] = basePricing[paramId];
            }
          });
        } else {
          pricing = basePricing;
        }

        // Count bookings for this specific date using per-tent dates
        const bookingResult = await pool.query(`
          SELECT COUNT(DISTINCT bt.id) as booking_count
          FROM glamping_booking_tents bt
          JOIN glamping_bookings b ON bt.booking_id = b.id
          WHERE bt.item_id = $1
            AND b.status NOT IN ('cancelled')
            AND bt.check_in_date <= $2
            AND bt.check_out_date > $2
        `, [itemId, dateStr]);

        const bookingCount = parseInt(bookingResult.rows[0]?.booking_count || 0);

        // Determine availability
        const isAvailable = item.unlimited_inventory || bookingCount < item.inventory_quantity;

        // Calculate legacy base price for backward compatibility (sum of all parameter prices)
        const legacyBasePrice = Object.values(pricing).reduce((sum, price) => sum + price, 0);

        return {
          date: dateStr,
          dayOfWeek,
          isWeekend,
          price: legacyBasePrice, // For backward compatibility
          pricing, // New: pricing per parameter
          hasPricing: Object.keys(pricing).length > 0,
          minStay: 1,
          status: bookingCount > 0 && !isAvailable ? 'booked' : 'available',
          isAvailable,
          unavailableReason: !isAvailable && bookingCount > 0 ? 'Fully booked' : undefined,
          notes: null,
          matchedEventId: matchedEvent?.id || null,
          matchedEventName: matchedEvent?.name || null,
        };
      })
    );

    // 6. Calculate statistics
    const availableDays = calendar.filter((d) => d.isAvailable).length;
    const bookedDays = calendar.filter((d) => !d.isAvailable).length;
    const daysWithoutPricing = calendar.filter((d) => !d.hasPricing).length;

    const pricesWithData = calendar.filter((d) => d.hasPricing).map((d) => d.price);
    const averagePrice = pricesWithData.length > 0
      ? pricesWithData.reduce((sum, p) => sum + p, 0) / pricesWithData.length
      : 0;
    const minPrice = pricesWithData.length > 0 ? Math.min(...pricesWithData) : 0;
    const maxPrice = pricesWithData.length > 0 ? Math.max(...pricesWithData) : 0;

    const response = {
      itemId,
      startDate: formatDateToYMD(startDate),
      endDate: formatDateToYMD(endDate),
      totalDays: calendar.length,
      calendar,
      statistics: {
        availableDays,
        bookedDays,
        daysWithoutPricing,
        averagePrice,
        minPrice,
        maxPrice,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in item availability API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
