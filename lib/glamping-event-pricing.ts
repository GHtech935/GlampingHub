/**
 * Event Pricing Calculation Logic
 *
 * This module contains helper functions to calculate pricing based on event pricing types:
 * - base_price: Use base price as-is
 * - new_price: Use custom price entered by admin
 * - dynamic: Apply percentage or fixed adjustment to base price
 * - yield: Adjust price based on remaining stock thresholds
 */

export interface EventPricingConfig {
  pricing_type: 'base_price' | 'new_price' | 'dynamic' | 'yield';
  dynamic_pricing_value?: number | null;
  dynamic_pricing_mode?: 'percent' | 'fixed' | null;
  yield_thresholds?: Array<{ stock: number; rate_adjustment: number }> | null;
}

export interface PricingOptions {
  remainingStock?: number;  // For yield pricing
  customPrice?: number;     // For new_price (from glamping_pricing table)
}

/**
 * Calculate final price based on event pricing type
 *
 * @param basePrice - The base price from glamping_pricing table
 * @param event - Event pricing configuration
 * @param options - Additional options (stock for yield, custom price for new_price)
 * @returns Final calculated price
 */
export function calculateEventPrice(
  basePrice: number,
  event: EventPricingConfig,
  options?: PricingOptions
): number {
  // Validate base price
  if (!basePrice || basePrice <= 0) {
    console.warn('Invalid base price:', basePrice);
    return 0;
  }

  switch (event.pricing_type) {
    case 'base_price':
      // No calculation - use base price as-is
      return basePrice;

    case 'new_price':
      // Use custom price entered by admin
      if (options?.customPrice !== undefined && options.customPrice !== null) {
        return options.customPrice;
      }
      // Fallback to base price if custom price not provided
      console.warn('new_price event but no customPrice provided, using base price');
      return basePrice;

    case 'dynamic':
      // Apply dynamic pricing formula
      if (event.dynamic_pricing_value === null || event.dynamic_pricing_value === undefined) {
        console.warn('dynamic pricing but no value provided, using base price');
        return basePrice;
      }
      if (!event.dynamic_pricing_mode) {
        console.warn('dynamic pricing but no mode provided, using base price');
        return basePrice;
      }
      return calculateDynamicPrice(
        basePrice,
        event.dynamic_pricing_value,
        event.dynamic_pricing_mode
      );

    case 'yield':
      // Apply yield pricing based on stock thresholds
      if (!event.yield_thresholds || event.yield_thresholds.length === 0) {
        console.warn('yield pricing but no thresholds provided, using base price');
        return basePrice;
      }
      if (options?.remainingStock === undefined) {
        console.warn('yield pricing but no remainingStock provided, using base price');
        return basePrice;
      }
      return calculateYieldPrice(
        basePrice,
        event.yield_thresholds,
        options.remainingStock
      );

    default:
      console.warn('Unknown pricing type:', event.pricing_type);
      return basePrice;
  }
}

/**
 * Calculate dynamic pricing adjustment
 *
 * Percent Mode: final_price = base_price × (1 + value / 100)
 * Fixed Mode: final_price = base_price + value
 *
 * @param basePrice - The base price
 * @param value - The adjustment value (percentage or fixed amount)
 * @param mode - 'percent' or 'fixed'
 * @returns Calculated price
 *
 * @example
 * // Percent increase
 * calculateDynamicPrice(1000000, 25, 'percent') // Returns 1250000 (+25%)
 *
 * @example
 * // Percent decrease
 * calculateDynamicPrice(1000000, -10, 'percent') // Returns 900000 (-10%)
 *
 * @example
 * // Fixed increase
 * calculateDynamicPrice(1000000, 50000, 'fixed') // Returns 1050000
 *
 * @example
 * // Fixed decrease
 * calculateDynamicPrice(1000000, -100000, 'fixed') // Returns 900000
 */
export function calculateDynamicPrice(
  basePrice: number,
  value: number,
  mode: 'percent' | 'fixed'
): number {
  if (mode === 'percent') {
    // Formula: base × (1 + value/100)
    const multiplier = 1 + (value / 100);
    return Math.round(basePrice * multiplier);
  } else {
    // Formula: base + value
    return Math.round(basePrice + value);
  }
}

/**
 * Find matching yield threshold based on remaining stock
 *
 * Logic: Find thresholds where remaining_stock <= threshold.stock,
 * then select the threshold with the highest stock value
 *
 * @param thresholds - Array of yield thresholds
 * @param remainingStock - Current remaining stock
 * @returns Matching threshold or null if none found
 *
 * @example
 * const thresholds = [
 *   { stock: 10, rate_adjustment: 0 },
 *   { stock: 5, rate_adjustment: 20 },
 *   { stock: 0, rate_adjustment: 50 }
 * ];
 *
 * findYieldThreshold(thresholds, 8)  // Returns { stock: 5, rate_adjustment: 20 }
 * findYieldThreshold(thresholds, 3)  // Returns { stock: 0, rate_adjustment: 50 }
 * findYieldThreshold(thresholds, 15) // Returns null (stock > all thresholds)
 */
export function findYieldThreshold(
  thresholds: Array<{ stock: number; rate_adjustment: number }>,
  remainingStock: number
): { stock: number; rate_adjustment: number } | null {
  // Filter thresholds where threshold stock is less than or equal to remaining stock
  // This finds all thresholds that have been "crossed" (stock has fallen to or below them)
  const matchingThresholds = thresholds.filter(t => t.stock <= remainingStock);

  if (matchingThresholds.length === 0) {
    return null;
  }

  // Sort by stock descending and pick the first (highest stock threshold that was crossed)
  // This gives us the most recent/specific threshold that applies
  const sorted = [...matchingThresholds].sort((a, b) => b.stock - a.stock);
  return sorted[0];
}

/**
 * Calculate yield pricing based on stock threshold
 *
 * Formula: base_price × (1 + threshold.rate_adjustment / 100)
 *
 * @param basePrice - The base price
 * @param thresholds - Array of yield thresholds
 * @param remainingStock - Current remaining stock
 * @returns Calculated price based on matching threshold
 *
 * @example
 * const basePrice = 1000000;
 * const thresholds = [
 *   { stock: 10, rate_adjustment: 0 },    // 10+ items: no adjustment
 *   { stock: 5, rate_adjustment: 20 },    // 5-10 items: +20%
 *   { stock: 0, rate_adjustment: 50 }     // 0-5 items: +50%
 * ];
 *
 * calculateYieldPrice(basePrice, thresholds, 8)  // Returns 1200000 (+20%)
 * calculateYieldPrice(basePrice, thresholds, 3)  // Returns 1500000 (+50%)
 * calculateYieldPrice(basePrice, thresholds, 15) // Returns 1000000 (no match, use base)
 */
export function calculateYieldPrice(
  basePrice: number,
  thresholds: Array<{ stock: number; rate_adjustment: number }>,
  remainingStock: number
): number {
  const threshold = findYieldThreshold(thresholds, remainingStock);

  if (!threshold) {
    // No matching threshold, use base price
    return basePrice;
  }

  // Apply rate adjustment: base × (1 + rate/100)
  const multiplier = 1 + (threshold.rate_adjustment / 100);
  return Math.round(basePrice * multiplier);
}

/**
 * Helper function to determine if an event price is editable in the UI
 *
 * @param pricingType - The event pricing type
 * @returns True if the price should be editable (manual input allowed)
 */
export function isEventPriceEditable(
  pricingType: 'base_price' | 'new_price' | 'dynamic' | 'yield'
): boolean {
  return pricingType === 'new_price';
}

/**
 * Helper function to determine if an event price is read-only (calculated)
 *
 * @param pricingType - The event pricing type
 * @returns True if the price should be read-only (calculated, not editable)
 */
export function isEventPriceReadOnly(
  pricingType: 'base_price' | 'new_price' | 'dynamic' | 'yield'
): boolean {
  return ['base_price', 'dynamic', 'yield'].includes(pricingType);
}
