/**
 * Glamping Booking Utilities
 *
 * CRITICAL: This file contains the core logic for grouping booking items by booking period.
 *
 * Database Reality:
 * - Each row in glamping_booking_items represents ONE PARAMETER (adults, children, pets, etc.)
 * - Multiple rows with the same item_id + date range represent ONE booking period
 * - The same tent can be booked for MULTIPLE date ranges (e.g., Jan 1-3 AND Jan 6-8)
 * - We must GROUP BY (item_id + checkInDate + checkOutDate) to identify unique booking periods
 *
 * Example:
 * Raw booking_items (4 rows):
 *   - item_id="tent-a1", dates="2026-01-01 to 2026-01-03", parameter_id="adults", quantity=2
 *   - item_id="tent-a1", dates="2026-01-01 to 2026-01-03", parameter_id="children", quantity=1
 *   - item_id="tent-a1", dates="2026-01-06 to 2026-01-08", parameter_id="adults", quantity=2
 *   - item_id="tent-a1", dates="2026-01-06 to 2026-01-08", parameter_id="children", quantity=1
 *
 * After grouping (2 booking periods of the SAME tent):
 *   - Period 1: Tent A1 (Jan 1-3): 2 adults + 1 child, 2 nights
 *   - Period 2: Tent A1 (Jan 6-8): 2 adults + 1 child, 2 nights
 */

import {
  BookingItem,
  BookingItemMetadata,
  BookingPeriod,
  BookingTent,
  ParameterGroup
} from '@/components/admin/glamping/types';

/**
 * Groups booking items by booking period (item_id + date range)
 *
 * CRITICAL FUNCTION: This handles the case where the same tent is booked for multiple date ranges
 *
 * @param bookingItems Raw booking items from API (one row per parameter)
 * @param bookingCheckIn Fallback check-in date if not in item metadata
 * @param bookingCheckOut Fallback check-out date if not in item metadata
 * @returns Array of booking periods with aggregated data
 */
export function groupBookingItemsByPeriod(
  bookingItems: BookingItem[],
  bookingCheckIn?: string,
  bookingCheckOut?: string
): BookingPeriod[] {
  const grouped = new Map<string, BookingPeriod>();

  for (const item of bookingItems) {
    // Skip addon items - they're shown separately, not in accommodation totals
    if (item.metadata?.type === 'addon') continue;

    // CRITICAL: Use metadata dates if available, fallback to booking dates
    const checkIn = item.metadata?.checkInDate || bookingCheckIn || '';
    const checkOut = item.metadata?.checkOutDate || bookingCheckOut || '';

    // Unique key: itemId + date range
    const periodKey = `${item.itemId}|${checkIn}|${checkOut}`;

    if (!grouped.has(periodKey)) {
      // Calculate nights for this specific period
      const nights = checkIn && checkOut
        ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
        : item.quantity; // Fallback to quantity if dates not available

      // First time seeing this booking period - initialize
      grouped.set(periodKey, {
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        parameterGroups: [],
        totalNights: nights,
        totalPrice: 0,
        metadata: item.metadata || {},
        specialRequests: item.metadata?.specialRequests,
        notes: item.metadata?.notes,
      });
    }

    const period = grouped.get(periodKey)!;

    // Add this parameter to the period's parameter groups
    if (item.parameterId && item.parameterName) {
      period.parameterGroups.push({
        parameterId: item.parameterId,
        parameterName: item.parameterName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }

    // Aggregate total price
    period.totalPrice += item.totalPrice;

    // Update metadata if the current item has more complete data
    if (item.metadata) {
      if (item.metadata.specialRequests && !period.specialRequests) {
        period.specialRequests = item.metadata.specialRequests;
      }
      if (item.metadata.notes && !period.notes) {
        period.notes = item.metadata.notes;
      }
      // Merge guests data if available
      if (item.metadata.guests) {
        if (!period.metadata.guests) {
          period.metadata.guests = { adults: 0, children: 0 };
        }
        period.metadata.guests.adults = Math.max(
          period.metadata.guests.adults || 0,
          item.metadata.guests.adults || 0
        );
        period.metadata.guests.children = Math.max(
          period.metadata.guests.children || 0,
          item.metadata.guests.children || 0
        );
      }
    }
  }

  return Array.from(grouped.values());
}

/**
 * Calculate total number of guests for a booking period from its parameterGroups
 */
export function calculateTotalGuestsForPeriod(period: BookingPeriod): number {
  if (!period.parameterGroups || period.parameterGroups.length === 0) return 0;
  return period.parameterGroups.reduce((sum, pg) => sum + (pg.quantity || 0), 0);
}

/**
 * Calculate total number of unique physical tents (distinct item_ids)
 * in a booking, regardless of how many booking periods they have
 */
export function getUniqueTentCount(bookingPeriods: BookingPeriod[]): number {
  const uniqueItemIds = new Set(bookingPeriods.map(period => period.itemId));
  return uniqueItemIds.size;
}

/**
 * Calculate total nights across ALL booking periods
 * This sums up the nights for each period (not just the date span)
 */
export function getTotalNightsAcrossPeriods(bookingPeriods: BookingPeriod[]): number {
  return bookingPeriods.reduce((sum, period) => sum + period.totalNights, 0);
}

/**
 * Get a range of nights across all booking periods
 * Returns "2 nights" or "2-3 nights" if periods have different durations
 */
export function getNightsRange(bookingPeriods: BookingPeriod[]): string {
  if (bookingPeriods.length === 0) return '0 nights';

  const nights = bookingPeriods.map(period => period.totalNights);
  const minNights = Math.min(...nights);
  const maxNights = Math.max(...nights);

  if (minNights === maxNights) {
    return `${minNights} night${minNights !== 1 ? 's' : ''}`;
  }

  return `${minNights}-${maxNights} nights`;
}

/**
 * Calculate total guests across all booking periods
 */
export function getTotalGuestsAcrossPeriods(bookingPeriods: BookingPeriod[]): number {
  return bookingPeriods.reduce((sum, period) => sum + calculateTotalGuestsForPeriod(period), 0);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getUniqueTentCount instead
 */
export function getTotalTentCount(bookingItems: BookingItem[]): number {
  const uniqueItemIds = new Set(bookingItems.map(item => item.itemId));
  return uniqueItemIds.size;
}

/**
 * Get color scheme for a tent by index
 * Cycles through colors if there are more than 5 tents
 */
export const TENT_COLORS = [
  { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-700', dot: 'bg-blue-500', ring: 'ring-blue-500' },
  { bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { bg: 'bg-amber-50', border: 'border-l-amber-500', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-500' },
  { bg: 'bg-purple-50', border: 'border-l-purple-500', text: 'text-purple-700', dot: 'bg-purple-500', ring: 'ring-purple-500' },
  { bg: 'bg-rose-50', border: 'border-l-rose-500', text: 'text-rose-700', dot: 'bg-rose-500', ring: 'ring-rose-500' },
];

export function getTentColor(index: number) {
  return TENT_COLORS[index % TENT_COLORS.length];
}

/**
 * Format guest count for display using parameterGroups
 * Examples: "2 Adults", "2 Adults, 1 Child", "3 Guests"
 */
export function formatGuestCount(period: BookingPeriod, locale: 'en' | 'vi' = 'en'): string {
  if (!period.parameterGroups || period.parameterGroups.length === 0) {
    return locale === 'vi' ? 'Không có khách' : 'No guests';
  }

  const paramsWithGuests = period.parameterGroups.filter(pg => pg.quantity > 0);
  if (paramsWithGuests.length === 0) {
    return locale === 'vi' ? 'Không có khách' : 'No guests';
  }

  return paramsWithGuests.map(pg => `${pg.quantity} ${pg.parameterName}`).join(', ');
}

/**
 * Check if booking has multiple periods with different check-in/out dates
 */
export function hasVariableDates(bookingPeriods: BookingPeriod[]): boolean {
  if (bookingPeriods.length <= 1) return false;

  const firstCheckIn = bookingPeriods[0].checkInDate;
  const firstCheckOut = bookingPeriods[0].checkOutDate;

  return bookingPeriods.some(period =>
    period.checkInDate !== firstCheckIn || period.checkOutDate !== firstCheckOut
  );
}

/**
 * Legacy function: Groups booking items by physical tent (item_id only, ignoring dates)
 * @deprecated Use groupBookingItemsByPeriod for proper multi-period support
 */
export function groupBookingItemsByTent(
  bookingItems: BookingItem[],
  bookingCheckIn?: string,
  bookingCheckOut?: string
): BookingPeriod[] {
  // For backward compatibility, this now just calls the period grouping
  // In practice, this will group by period, which is more accurate
  return groupBookingItemsByPeriod(bookingItems, bookingCheckIn, bookingCheckOut);
}

/**
 * Convert a single BookingTent + its related BookingItems into a BookingPeriod
 *
 * This uses the authoritative per-tent data from glamping_booking_tents
 * instead of reconstructing it from booking_items metadata.
 */
export function tentToBookingPeriod(
  tent: BookingTent,
  bookingItems: BookingItem[]
): BookingPeriod {
  // Filter items that belong to this tent, excluding addon items
  const tentItems = bookingItems.filter(item => item.bookingTentId === tent.id);
  const accommodationItems = tentItems.filter(item => item.metadata?.type !== 'addon');

  // Build parameter groups from accommodation items only (no addons)
  const parameterGroups: ParameterGroup[] = accommodationItems
    .filter(item => item.parameterId && item.parameterName)
    .map(item => ({
      parameterId: item.parameterId!,
      parameterName: item.parameterName!,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

  // Calculate total price from accommodation items only
  const totalPrice = accommodationItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    itemId: tent.itemId,
    tentId: tent.id,
    itemName: tent.itemName,
    itemSku: tent.itemSku,
    checkInDate: tent.checkInDate,
    checkOutDate: tent.checkOutDate,
    parameterGroups,
    totalNights: tent.nights,
    totalPrice: totalPrice || tent.subtotal,
    metadata: {
      checkInDate: tent.checkInDate,
      checkOutDate: tent.checkOutDate,
      specialRequests: tent.specialRequests,
    },
    specialRequests: tent.specialRequests,
  };
}

/**
 * Convert an array of BookingTents into BookingPeriods (batch)
 *
 * Preferred over groupBookingItemsByPeriod when tent data is available,
 * as it uses the authoritative per-tent data from the database.
 */
export function tentsToBookingPeriods(
  tents: BookingTent[],
  bookingItems: BookingItem[]
): BookingPeriod[] {
  return tents.map(tent => tentToBookingPeriod(tent, bookingItems));
}
