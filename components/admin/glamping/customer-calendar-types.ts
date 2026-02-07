/**
 * Type definitions for Customer Calendar feature
 * Timeline-based calendar view with items grouped by category
 */

import type { BookingStatus, PaymentStatus } from './types';

/**
 * View options for the calendar (weeks)
 */
export const VIEW_WEEK_OPTIONS = [1, 2, 3, 4, 6] as const;
export type ViewWeeks = typeof VIEW_WEEK_OPTIONS[number];

/**
 * Glamping item for the calendar view
 */
export interface CustomerCalendarItem {
  id: string;
  name: string;
  sku?: string;
  displayOrder: number;
}

/**
 * Booking entry for the calendar
 */
export interface CustomerCalendarBooking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalGuests: number;
  totalAmount: number;
  itemId: string;
  itemName: string;
}

/**
 * Category with items for grouping
 */
export interface CustomerCalendarCategory {
  id: string;
  name: string;
  weight: number;
  items: CustomerCalendarItem[];
  /** Number of items with bookings (for collapsed view) */
  bookingCount?: number;
}

/**
 * Response data structure from API
 */
export interface CustomerCalendarData {
  categories: CustomerCalendarCategory[];
  bookings: CustomerCalendarBooking[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Filter state for the calendar
 */
export interface CustomerCalendarFilters {
  startDate: Date;
  viewWeeks: ViewWeeks;
  categoryIds: string[];
  showEmptyItems: boolean;
}

/**
 * Default filter values
 */
export const DEFAULT_CUSTOMER_CALENDAR_FILTERS: CustomerCalendarFilters = {
  startDate: new Date(),
  viewWeeks: 2,
  categoryIds: [],
  showEmptyItems: true,
};

/**
 * Payment status color mapping for booking bars
 */
export const CUSTOMER_CALENDAR_PAYMENT_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-orange-500',
  deposit_paid: 'bg-blue-500',
  fully_paid: 'bg-green-500',
  refund_pending: 'bg-yellow-500',
  refunded: 'bg-gray-400',
  no_refund: 'bg-red-500',
  expired: 'bg-gray-600',
};
