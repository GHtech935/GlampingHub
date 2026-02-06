/**
 * Type definitions for Daily Manifest and Daily List pages
 */

import { type BookingStatus, type PaymentStatus } from './types';

// ─── Shared Filter Types ────────────────────────────────────────────────────

export type BookingFilterType = 'starting' | 'ending' | 'staying';

export interface DailyFilters {
  date: string; // YYYY-MM-DD
  bookingFilter: BookingFilterType;
  categoryId?: string;
  itemId?: string;
  status?: string;
  search?: string;
}

// ─── Daily Manifest Types ───────────────────────────────────────────────────

export interface ManifestBooking {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalGuests: number;
  totalAmount: number;
  depositDue: number;
  balanceDue: number;
  paidAmount: number;
  discountAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string | null;
  internalNotes: string | null;
  source: string | null;
  tentId: string;
  createdAt: string;
  /** Parameters for this booking (replaces adults/children) */
  parameters?: Array<{ label: string; quantity: number; displayOrder: number }>;
}

export interface ManifestItem {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  categoryName: string;
  totalBookings: number;
  totalGuests: number;
  totalPaid: number;
  totalDue: number;
  bookings: ManifestBooking[];
  /** Aggregated parameters (replaces totalAdults/totalChildren) */
  parameterTotals?: Record<string, number>;
}

export interface ManifestFilterOptions {
  categories: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string }>;
}

export interface ManifestResponse {
  items: ManifestItem[];
  filterOptions: ManifestFilterOptions;
  dateCounts: {
    today: number;
    tomorrow: number;
  };
}

// ─── Daily List Types ───────────────────────────────────────────────────────

export interface DailyListSummaryItem {
  itemId: string;
  itemName: string;
  categoryName: string;
  inventoryTotal: number;
  bookedCount: number;
  inventoryPercent: number;
  totalAmount: number;
  totalGuests: number;
  totalQuantity: number;
  parameterBreakdown: Record<string, number>;
}

export interface DailyListSummaryTotals {
  totalBookings: number;
  totalAmount: number;
  totalGuests: number;
  totalQuantity: number;
  totalInventory: number;
  totalBooked: number;
  parameterBreakdown: Record<string, number>;
}

export interface DailyListBooking {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  source: string | null;
  totalAmount: number;
  totalGuests: number;
  totalQuantity: number;
  checkInDate: string;
  checkOutDate: string;
  parameterBreakdown: Record<string, number>;
}

export interface DailyListItemGroup {
  itemId: string;
  itemName: string;
  bookings: DailyListBooking[];
  subtotals: {
    totalAmount: number;
    totalGuests: number;
    totalQuantity: number;
    parameterBreakdown: Record<string, number>;
  };
}

export interface DailyListCategoryGroup {
  categoryId: string;
  categoryName: string;
  items: DailyListItemGroup[];
}

export interface ParameterDef {
  id: string;
  name: string;
  label: string;
  linkToGuests: boolean;
}

export interface DailyListResponse {
  summary: DailyListSummaryItem[];
  summaryTotals: DailyListSummaryTotals;
  categories: DailyListCategoryGroup[];
  parameters: ParameterDef[];
  filterOptions: ManifestFilterOptions;
  dateCounts: {
    today: number;
    tomorrow: number;
  };
}
