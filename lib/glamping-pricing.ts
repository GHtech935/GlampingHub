import { Pool, PoolClient } from 'pg';
import { calculateEventPrice, EventPricingConfig } from './glamping-event-pricing';

interface PricingRecord {
  parameter_id: string;
  event_id: string | null;
  group_min: number | null;
  group_max: number | null;
  amount: number;
  rate_type: string;
  pricing_mode: 'per_person' | 'per_group';
}

interface PricingMap {
  base: Record<string, Array<{
    group_min: number | null;
    group_max: number | null;
    amount: number;
    pricing_mode: 'per_person' | 'per_group';
  }>>;
  events: Record<string, Record<string, Array<{
    group_min: number | null;
    group_max: number | null;
    amount: number;
    pricing_mode: 'per_person' | 'per_group';
  }>>>;
}

interface NightlyPricing {
  date: string;
  parameters: Record<string, number>;
  pricingModes: Record<string, 'per_person' | 'per_group'>;
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
 * Returns both the price amount and the pricing_mode
 */
function findPrice(
  prices: Array<{
    group_min: number | null;
    group_max: number | null;
    amount: number;
    pricing_mode: 'per_person' | 'per_group';
  }>,
  quantity: number
): { amount: number; pricing_mode: 'per_person' | 'per_group' } | null {
  // Find group pricing that matches the quantity
  const groupPrice = prices.find(
    (p) =>
      p.group_min !== null &&
      p.group_max !== null &&
      quantity >= p.group_min &&
      quantity <= p.group_max
  );

  if (groupPrice) {
    return { amount: groupPrice.amount, pricing_mode: groupPrice.pricing_mode };
  }

  // Find base price (no group limits)
  const basePrice = prices.find(
    (p) => p.group_min === null && p.group_max === null
  );

  return basePrice ? { amount: basePrice.amount, pricing_mode: basePrice.pricing_mode } : null;
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
      rate_type,
      COALESCE(pricing_mode, 'per_person') as pricing_mode
    FROM glamping_pricing
    WHERE item_id = $1
    ORDER BY parameter_id, event_id NULLS FIRST, group_min NULLS FIRST
  `;

  const pricingResult = await db.query(pricingQuery, [itemId]);

  // Fetch all active events for this item (via junction table) with pricing config
  // Events are prioritized by: type (closure > special > seasonal), display_order, created_at
  const eventsQuery = `
    SELECT
      e.id,
      e.name,
      e.type,
      e.start_date,
      e.end_date,
      e.days_of_week,
      e.status,
      e.created_at,
      e.pricing_type,
      e.dynamic_pricing_value,
      e.dynamic_pricing_mode,
      e.yield_thresholds,
      ei.display_order
    FROM glamping_item_events e
    INNER JOIN glamping_item_event_items ei ON e.id = ei.event_id
    WHERE ei.item_id = $1
      AND e.status = 'available'
    ORDER BY
      CASE e.type
        WHEN 'closure' THEN 1
        WHEN 'special' THEN 2
        WHEN 'seasonal' THEN 3
        ELSE 4
      END,
      ei.display_order DESC,
      e.created_at DESC
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
      pricing_mode: row.pricing_mode || 'per_person',
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
        pricing_mode: record.pricing_mode,
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
        pricing_mode: record.pricing_mode,
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
      // Must have start_date, but end_date is optional (null = indefinite)
      if (!event.start_date) {
        return false;
      }

      // Convert start_date to YYYY-MM-DD string for consistent comparison
      const startDateStr = parseDateToString(event.start_date);

      // Check date is on or after start_date
      if (dateStr < startDateStr) {
        return false;
      }

      // If end_date exists, check date is not after it
      if (event.end_date) {
        const endDateStr = parseDateToString(event.end_date);
        if (dateStr > endDateStr) {
          return false;
        }
      }
      // end_date is null means event runs indefinitely

      // Check day of week if specified
      if (event.days_of_week && event.days_of_week.length > 0) {
        if (!event.days_of_week.includes(dayOfWeek)) {
          return false;
        }
      }

      return true;
    });

    const dayPricing: Record<string, number> = {};
    const dayPricingModes: Record<string, 'per_person' | 'per_group'> = {};

    // Calculate price for each parameter
    Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
      // Use qty=1 for price tier lookup when qty=0 (to get unit price for display)
      const lookupQty = Math.max(quantity, 1);
      let priceResult: { amount: number; pricing_mode: 'per_person' | 'per_group' } | null = null;
      let matchedEvent: any = null;

      // Get base price FIRST (needed for dynamic/yield pricing AND for pricing_mode inheritance)
      const basePrices = pricingMap.base[paramId] || [];
      const basePriceResult = findPrice(basePrices, lookupQty);
      // Default pricing_mode from base, fallback to 'per_person' if no base pricing exists
      const basePricingMode = basePriceResult?.pricing_mode || 'per_person';

      // Check events (newest first - already sorted by created_at DESC)
      for (const event of matchingEvents) {
        // For new_price events, check if pricing exists in glamping_pricing
        if (event.pricing_type === 'new_price') {
          const eventPrices = pricingMap.events[event.id]?.[paramId];
          if (eventPrices) {
            const eventPriceResult = findPrice(eventPrices, lookupQty);
            if (eventPriceResult !== null) {
              // Use amount from event, but INHERIT pricing_mode from base pricing
              priceResult = {
                amount: eventPriceResult.amount,
                pricing_mode: basePricingMode,
              };
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

      // Apply pricing calculation based on event type
      if (matchedEvent) {
        const pricingType = matchedEvent.pricing_type || 'base_price';

        if (pricingType === 'new_price') {
          // Price already found from glamping_pricing table
          // (priceResult variable is already set above)
        } else if (pricingType === 'dynamic') {
          // Calculate dynamic pricing
          if (basePriceResult !== null) {
            const eventConfig: EventPricingConfig = {
              pricing_type: 'dynamic',
              dynamic_pricing_value: matchedEvent.dynamic_pricing_value,
              dynamic_pricing_mode: matchedEvent.dynamic_pricing_mode,
            };
            const dynamicPrice = calculateEventPrice(basePriceResult.amount, eventConfig);
            priceResult = { amount: dynamicPrice, pricing_mode: basePriceResult.pricing_mode };
          }
        } else if (pricingType === 'yield') {
          // Calculate yield pricing based on current inventory
          if (basePriceResult !== null) {
            const eventConfig: EventPricingConfig = {
              pricing_type: 'yield',
              yield_thresholds: matchedEvent.yield_thresholds,
            };

            // Use item inventory for yield pricing
            // If unlimited inventory (null), use high number to avoid yield pricing adjustments
            const remainingStock = itemInventory !== null ? itemInventory : 999;
            const yieldPrice = calculateEventPrice(basePriceResult.amount, eventConfig, { remainingStock });
            priceResult = { amount: yieldPrice, pricing_mode: basePriceResult.pricing_mode };
          }
        } else {
          // base_price - use base price as-is
          priceResult = basePriceResult;
        }
      } else {
        // No event matched, use base price
        priceResult = basePriceResult;
      }

      // Use 0 if no price found, default to per_person mode
      const finalPrice = priceResult !== null ? priceResult.amount : 0;
      const finalPricingMode = priceResult !== null ? priceResult.pricing_mode : 'per_person';
      dayPricing[paramId] = finalPrice;
      dayPricingModes[paramId] = finalPricingMode;

      // Accumulate total for this parameter
      if (!parameterTotalPricing[paramId]) {
        parameterTotalPricing[paramId] = 0;
      }
      parameterTotalPricing[paramId] += finalPrice;
    });

    nightlyPricing.push({
      date: dateStr,
      parameters: dayPricing,
      pricingModes: dayPricingModes,
    });
  }

  // Ensure all requested parameters are in the pricing object, even if with price = 0
  // This prevents missing parameters from being excluded from the calculation
  Object.keys(parameterQuantities || {}).forEach(paramId => {
    if (parameterTotalPricing[paramId] === undefined) {
      console.warn(`[Pricing] Parameter ${paramId} has no pricing configured, setting to 0`);
      parameterTotalPricing[paramId] = 0;
    }
  });

  return {
    parameterPricing: parameterTotalPricing,
    nightlyPricing,
  };
}
