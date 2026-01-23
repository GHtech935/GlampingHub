import { Pool, PoolClient } from 'pg';
import { calculateEventPrice, EventPricingConfig } from './glamping-event-pricing';

interface PricingRecord {
  parameter_id: string;
  event_id: string | null;
  group_min: number | null;
  group_max: number | null;
  amount: number;
  rate_type: string;
}

interface PricingMap {
  base: Record<string, Array<{
    group_min: number | null;
    group_max: number | null;
    amount: number;
  }>>;
  events: Record<string, Record<string, Array<{
    group_min: number | null;
    group_max: number | null;
    amount: number;
  }>>>;
}

interface NightlyPricing {
  date: string;
  parameters: Record<string, number>;
}

interface PricingResult {
  parameterPricing: Record<string, number>;
  nightlyPricing: NightlyPricing[];
}

/**
 * Format a Date object to YYYY-MM-DD string in local timezone.
 * This ensures consistent date comparison without timezone issues.
 */
function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date value (string or Date) to YYYY-MM-DD string.
 * Handles both ISO strings and Date objects from database.
 */
function parseDateToString(dateValue: string | Date): string {
  if (typeof dateValue === 'string') {
    // If already a YYYY-MM-DD string, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    // Otherwise parse and format
    return formatDateToLocalString(new Date(dateValue));
  }
  return formatDateToLocalString(dateValue);
}

/**
 * Find price for a parameter based on quantity and available price tiers
 */
function findPrice(
  prices: Array<{
    group_min: number | null;
    group_max: number | null;
    amount: number;
  }>,
  quantity: number
): number | null {
  // Find group pricing that matches the quantity
  const groupPrice = prices.find(
    (p) =>
      p.group_min !== null &&
      p.group_max !== null &&
      quantity >= p.group_min &&
      quantity <= p.group_max
  );

  if (groupPrice) {
    return groupPrice.amount;
  }

  // Find base price (no group limits)
  const basePrice = prices.find(
    (p) => p.group_min === null && p.group_max === null
  );

  return basePrice ? basePrice.amount : null;
}

/**
 * Get remaining inventory for an item
 * Returns null if unlimited inventory, otherwise returns the quantity
 */
async function getItemInventory(
  db: Pool | PoolClient,
  itemId: string
): Promise<number | null> {
  const query = `
    SELECT inventory_quantity, unlimited_inventory
    FROM glamping_item_attributes
    WHERE item_id = $1
  `;

  const result = await db.query(query, [itemId]);

  if (result.rows.length === 0) {
    // No inventory record, assume unlimited
    return null;
  }

  const row = result.rows[0];

  if (row.unlimited_inventory === true) {
    // Unlimited inventory - return null to indicate no stock constraints
    return null;
  }

  // Return inventory quantity (can be used for yield pricing)
  return row.inventory_quantity || 0;
}

/**
 * Calculate glamping pricing with proper event and group pricing logic
 */
export async function calculateGlampingPricing(
  db: Pool | PoolClient,
  itemId: string,
  checkInDate: Date,
  checkOutDate: Date,
  parameterQuantities: Record<string, number>
): Promise<PricingResult> {
  // Calculate number of nights
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (nights <= 0) {
    throw new Error('Invalid date range');
  }

  // Fetch all pricing records (base + events)
  const pricingQuery = `
    SELECT
      parameter_id,
      event_id,
      group_min,
      group_max,
      amount,
      rate_type
    FROM glamping_pricing
    WHERE item_id = $1
    ORDER BY parameter_id, event_id NULLS FIRST, group_min NULLS FIRST
  `;

  const pricingResult = await db.query(pricingQuery, [itemId]);

  // Fetch all active events for this item (via junction table) with pricing config
  const eventsQuery = `
    SELECT
      e.id,
      e.name,
      e.start_date,
      e.end_date,
      e.days_of_week,
      e.status,
      e.created_at,
      e.pricing_type,
      e.dynamic_pricing_value,
      e.dynamic_pricing_mode,
      e.yield_thresholds
    FROM glamping_item_events e
    INNER JOIN glamping_item_event_items ei ON e.id = ei.event_id
    WHERE ei.item_id = $1
      AND e.status = 'available'
    ORDER BY e.created_at DESC
  `;

  const eventsResult = await db.query(eventsQuery, [itemId]);

  // Fetch item inventory for yield pricing
  const itemInventory = await getItemInventory(db, itemId);

  // Build pricing map
  const pricingMap: PricingMap = {
    base: {},
    events: {},
  };

  pricingResult.rows.forEach((row: any) => {
    const record: PricingRecord = {
      parameter_id: row.parameter_id,
      event_id: row.event_id,
      group_min: row.group_min,
      group_max: row.group_max,
      amount: parseFloat(row.amount),
      rate_type: row.rate_type,
    };

    if (record.event_id === null) {
      // Base pricing
      if (!pricingMap.base[record.parameter_id]) {
        pricingMap.base[record.parameter_id] = [];
      }
      pricingMap.base[record.parameter_id].push({
        group_min: record.group_min,
        group_max: record.group_max,
        amount: record.amount,
      });
    } else {
      // Event pricing
      if (!pricingMap.events[record.event_id]) {
        pricingMap.events[record.event_id] = {};
      }
      if (!pricingMap.events[record.event_id][record.parameter_id]) {
        pricingMap.events[record.event_id][record.parameter_id] = [];
      }
      pricingMap.events[record.event_id][record.parameter_id].push({
        group_min: record.group_min,
        group_max: record.group_max,
        amount: record.amount,
      });
    }
  });

  // Calculate pricing for each night
  const nightlyPricing: NightlyPricing[] = [];
  const parameterTotalPricing: Record<string, number> = {};

  for (let i = 0; i < nights; i++) {
    const currentDate = new Date(checkInDate);
    currentDate.setDate(currentDate.getDate() + i);

    // Use local date string for consistent comparison
    const dateStr = formatDateToLocalString(currentDate);
    const dayOfWeek = currentDate.getDay(); // 0=Sunday, 6=Saturday

    // Find matching events for this date (already sorted by created_at DESC)
    const matchingEvents = eventsResult.rows.filter((event: any) => {
      if (!event.start_date || !event.end_date) {
        return false;
      }

      // Convert all dates to YYYY-MM-DD strings for consistent comparison
      const startDateStr = parseDateToString(event.start_date);
      const endDateStr = parseDateToString(event.end_date);

      // Check date range (inclusive) using string comparison
      if (dateStr < startDateStr || dateStr > endDateStr) {
        return false;
      }

      // Check day of week if specified
      if (event.days_of_week && event.days_of_week.length > 0) {
        if (!event.days_of_week.includes(dayOfWeek)) {
          return false;
        }
      }

      return true;
    });

    const dayPricing: Record<string, number> = {};

    // Calculate price for each parameter
    Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
      let price: number | null = null;
      let matchedEvent: any = null;

      // Check events (newest first - already sorted by created_at DESC)
      for (const event of matchingEvents) {
        // For new_price events, check if pricing exists in glamping_pricing
        if (event.pricing_type === 'new_price') {
          const eventPrices = pricingMap.events[event.id]?.[paramId];
          if (eventPrices) {
            price = findPrice(eventPrices, quantity);
            if (price !== null) {
              matchedEvent = event;
              break;
            }
          }
        } else {
          // For base_price, dynamic, and yield events, we'll calculate later
          // Just mark this event as matched
          matchedEvent = event;
          break;
        }
      }

      // Get base price for calculation (needed for dynamic and yield pricing)
      const basePrices = pricingMap.base[paramId] || [];
      const basePrice = findPrice(basePrices, quantity);

      // Apply pricing calculation based on event type
      if (matchedEvent) {
        const pricingType = matchedEvent.pricing_type || 'base_price';

        if (pricingType === 'new_price') {
          // Price already found from glamping_pricing table
          // (price variable is already set above)
        } else if (pricingType === 'dynamic') {
          // Calculate dynamic pricing
          if (basePrice !== null) {
            const eventConfig: EventPricingConfig = {
              pricing_type: 'dynamic',
              dynamic_pricing_value: matchedEvent.dynamic_pricing_value,
              dynamic_pricing_mode: matchedEvent.dynamic_pricing_mode,
            };
            price = calculateEventPrice(basePrice, eventConfig);
          }
        } else if (pricingType === 'yield') {
          // Calculate yield pricing based on current inventory
          if (basePrice !== null) {
            const eventConfig: EventPricingConfig = {
              pricing_type: 'yield',
              yield_thresholds: matchedEvent.yield_thresholds,
            };

            // Use item inventory for yield pricing
            // If unlimited inventory (null), use high number to avoid yield pricing adjustments
            const remainingStock = itemInventory !== null ? itemInventory : 999;
            price = calculateEventPrice(basePrice, eventConfig, { remainingStock });
          }
        } else {
          // base_price - use base price as-is
          price = basePrice;
        }
      } else {
        // No event matched, use base price
        price = basePrice;
      }

      // Use 0 if no price found
      const finalPrice = price !== null ? price : 0;
      dayPricing[paramId] = finalPrice;

      // Accumulate total for this parameter
      if (!parameterTotalPricing[paramId]) {
        parameterTotalPricing[paramId] = 0;
      }
      parameterTotalPricing[paramId] += finalPrice;
    });

    nightlyPricing.push({
      date: dateStr,
      parameters: dayPricing,
    });
  }

  return {
    parameterPricing: parameterTotalPricing,
    nightlyPricing,
  };
}
