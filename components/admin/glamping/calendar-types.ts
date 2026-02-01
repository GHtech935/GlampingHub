/**
 * Type definitions for Booking Calendar feature
 * Displays bookings in a monthly calendar view
 */

import type { BookingStatus, PaymentStatus } from './types';

/**
 * Calendar event representing a single booking
 */
export interface CalendarEvent {
  id: string;
  bookingCode: string;
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalGuests: number;
  totalAmount: number;
  itemId: string;
  itemName: string;
  customerEmail: string;
  customerPhone: string;
  /** Admin user name if created by admin, null if customer booked via web */
  createdBy: string | null;
  /** Source of booking: 'web' if customer booked, 'admin' if staff created */
  source: 'web' | 'admin';
  /** Parameter breakdown for guests (adults, children, etc.) */
  parameters?: Array<{ label: string; quantity: number }>;
}

/**
 * Data for a single calendar day
 */
export interface CalendarDayData {
  date: string;
  events: CalendarEvent[];
  totalBookings: number;
  totalGuests: number;
  totalPaidAmount: number;
}

/**
 * Filter options available for the calendar
 */
export interface CalendarFilterOptions {
  categories: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string; categoryId: string }>;
  adminUsers: Array<{ id: string; name: string }>;
}

/**
 * Summary statistics for the current view
 */
export interface CalendarSummary {
  totalBookings: number;
  totalGuests: number;
  totalAmount: number;
}

/**
 * API response for calendar data
 */
export interface CalendarResponse {
  days: Record<string, CalendarDayData>;
  filterOptions: CalendarFilterOptions;
  summary: CalendarSummary;
}

/**
 * Calendar filter state
 */
export interface CalendarFilters {
  categoryId: string;
  itemId: string;
  statuses: BookingStatus[]; // Multiple status selection
  source: 'all' | 'web' | 'admin' | string; // string for specific admin user ID
  search: string;
  searchType: 'customer' | 'item';
  showAllBookings: boolean;
}

/**
 * Position of an event bar within a week row
 * Used for multi-day booking display
 */
export type EventBarPosition = 'start' | 'middle' | 'end' | 'single';

/**
 * Status color mapping for calendar display
 */
export const STATUS_COLORS: Record<BookingStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  checked_in: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  checked_out: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

/**
 * All booking statuses for filter options
 */
export const ALL_BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

/**
 * Default statuses (exclude cancelled by default)
 */
export const DEFAULT_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'checked_in', 'checked_out'];

/**
 * Default filter values
 */
export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  categoryId: 'all',
  itemId: 'all',
  statuses: DEFAULT_STATUSES, // Exclude cancelled by default
  source: 'all',
  search: '',
  searchType: 'customer',
  showAllBookings: true,
};
