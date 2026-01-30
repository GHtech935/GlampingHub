/**
 * Type definitions for Glamping Booking System
 * Supports multi-tent bookings with per-item metadata
 */

import { type MultilingualText } from '@/lib/i18n-utils';

// Booking statuses
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type PaymentStatus = 'pending' | 'deposit_paid' | 'fully_paid' | 'refund_pending' | 'refunded' | 'no_refund' | 'expired';

/**
 * Metadata structure for individual booking items
 * Stored in glamping_booking_items.metadata JSONB field
 */
export interface BookingItemMetadata {
  /** Per-item check-in date (ISO format: YYYY-MM-DD) */
  checkInDate?: string;

  /** Per-item check-out date (ISO format: YYYY-MM-DD) */
  checkOutDate?: string;

  /** Guest distribution for this specific item */
  guests?: {
    adults: number;
    children: number;
  };

  /** Special requests for this item (e.g., "Double bed", "Ground floor") */
  specialRequests?: string;

  /** Internal notes for this item */
  notes?: string;

  /** Custom fields that can be added per implementation */
  [key: string]: any;
}

/**
 * Represents a single item in a booking (tent, room, etc.)
 */
export interface BookingItem {
  id: string;
  itemId: string;
  itemName: string;
  itemSku?: string;
  parameterId?: string;
  parameterName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;

  /** Links to the booking tent this item belongs to */
  bookingTentId?: string;

  /** Metadata containing per-item details like dates, guests, requests */
  metadata?: BookingItemMetadata;
}

/**
 * Payment record for a booking
 */
export interface BookingPayment {
  id: string;
  paymentMethod: string;
  amount: number;
  status: string;
  transactionReference?: string;
  paidAt?: string;
  createdAt: string;
}

/**
 * History/audit record for booking changes
 */
export interface BookingHistoryRecord {
  id: string;
  action: string;
  description: string;
  created_at: string;
  actor_name: string | null;
  actor_type: string;
  payment_amount: number | null;
}

/**
 * Complete booking details
 */
export interface BookingDetail {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;

  /** Booking-level dates (may differ from per-item dates) */
  dates: {
    checkIn: string;
    checkOut: string;
    checkInTime?: string;
    checkOutTime?: string;
    nights: number;
  };

  /** Total guests across all items */
  guests: Record<string, number>;
  totalGuests: number;

  pricing: {
    subtotalAmount: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    depositDue: number;
    balanceDue: number;
    currency: string;
  };

  customer: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    country?: string;
    address?: string;
  };

  zone: {
    id: string;
    name: MultilingualText | string;
  } | null;

  /** Array of booked items (tents, rooms, etc.) */
  items: BookingItem[];

  /** Per-tent breakdown (from glamping_booking_tents) */
  tents?: BookingTent[];

  payments: BookingPayment[];

  parameters: Array<{
    id: string;
    parameterId: string;
    label: string;
    bookedQuantity: number;
    controlsInventory: boolean;
  }>;

  notes: {
    customer?: string;
    internal?: string;
  };

  invoiceNotes?: string;
  specialRequirements?: string;
  partyNames?: string;
  taxInvoiceRequired?: boolean;
  taxRate?: number;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

/**
 * Represents a single tent within a booking (glamping_booking_tents row)
 * This is the intermediate layer between bookings and child tables.
 */
export interface BookingTent {
  id: string;
  itemId: string;
  itemName: string;
  itemSku?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  subtotal: number;
  specialRequests?: string;
  displayOrder: number;
  /** Per-tent voucher discount fields */
  voucherCode?: string | null;
  discountType?: string | null;
  discountValue?: number;
  discountAmount?: number;
  /** Parameters for this tent (replaces adults/children columns) */
  parameters?: Array<{
    parameterId: string;
    label: string;
    bookedQuantity: number;
  }>;
}

/**
 * Menu product in a booking
 */
export interface BookingMenuProduct {
  id: string;
  booking_id: string;
  booking_item_id?: string | null; // Links to specific item, null for shared products
  booking_tent_id?: string | null; // Links to specific tent, null for shared products
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  name: string;
  description?: string;
  image?: string;
  category_name: string;
  /** Per-product voucher discount fields */
  voucherCode?: string | null;
  discountAmount?: number;
}

/**
 * Customer's booking history item
 */
export interface CustomerBooking {
  id: string;
  booking_code: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
}

/**
 * Per-item financial breakdown
 */
export interface ItemFinancialBreakdown {
  itemId: string;
  itemName: string;
  accommodationCost: number;
  productsCost: number;
  subtotal: number;
  tax: number;
  total: number;
  percentage: number; // Percentage of total booking
}

/**
 * Represents a single parameter group within a physical tent
 */
export interface ParameterGroup {
  parameterId: string;
  parameterName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Represents a physical tent/room with all its parameters aggregated
 *
 * CRITICAL: This is what should be displayed in the UI, NOT individual booking_items rows.
 * Each PhysicalTent represents one actual tent, room, or accommodation unit.
 * Multiple BookingItem rows with the same itemId get grouped into one PhysicalTent.
 */
export interface PhysicalTent {
  /** Unique identifier for the physical tent (glamping_items.id) */
  itemId: string;

  /** Display name of the tent */
  itemName: string;

  /** SKU if available */
  itemSku?: string;

  /** All parameters for this tent (adults, children, pets, etc.) */
  parameterGroups: ParameterGroup[];

  /** Total number of guests (sum of guest-type parameters) */
  totalGuests: number;

  /** Number of adults (sum of "adults" parameters) */
  adultsCount: number;

  /** Number of children (sum of "children" parameters) */
  childrenCount: number;

  /** Number of nights (typically same across all parameters) */
  totalNights: number;

  /** Total price for this tent (sum of all parameter prices) */
  totalPrice: number;

  /** Metadata from the first booking_item (or merged if needed) */
  metadata: BookingItemMetadata;

  /** Per-item check-in date (from metadata or booking-level) */
  checkInDate?: string;

  /** Per-item check-out date (from metadata or booking-level) */
  checkOutDate?: string;

  /** Special requests for this tent */
  specialRequests?: string;

  /** Internal notes for this tent */
  notes?: string;
}

// ─── Edit Tab Types ─────────────────────────────────────────────────────────

/**
 * Row item for the Edit tab table (tent or menu product)
 */
export interface EditItemRow {
  type: 'tent' | 'menu_product';
  id: string;
  name: string;
  details: string;
  quantity: number;
  dateRange: string;
  taxAmount: number;
  subtotal: number;
  discountAmount: number;
  voucherCode?: string | null;
}

/**
 * Data passed to the tent edit modal
 */
export interface TentEditData {
  id: string;
  bookingId: string;
  itemId: string;
  itemName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  subtotal: number;
  specialRequests?: string;
  voucherCode?: string | null;
  discountType?: string | null;
  discountValue?: number;
  discountAmount?: number;
  parameters: Array<{
    parameterId: string;
    parameterName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Data passed to the product edit modal
 */
export interface ProductEditData {
  id: string;
  bookingId: string;
  menuItemId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  servingDate?: string | null;
  bookingTentId?: string | null;
  voucherCode?: string | null;
  discountAmount?: number;
}

/**
 * Represents a booking period (item + date range combination)
 *
 * CRITICAL: Same tent can be booked for MULTIPLE date ranges (e.g., Jan 1-3 AND Jan 6-8).
 * Each BookingPeriod is uniquely identified by (itemId + checkInDate + checkOutDate).
 * This is the CORRECT grouping for multi-period bookings.
 *
 * Example: If Tent A1 is booked Jan 1-3 and again Jan 6-8, there will be 2 BookingPeriod
 * objects, but only 1 unique physical tent (itemId).
 */
/**
 * Additional cost item for a booking (damages, extra services, custom charges)
 */
export interface BookingAdditionalCost {
  id: string;
  bookingId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BookingPeriod {
  /** Unique identifier for the physical tent (glamping_items.id) */
  itemId: string;

  /** Booking tent record ID (glamping_booking_tents.id) — unique per tent in a booking */
  tentId?: string;

  /** Display name of the tent */
  itemName: string;

  /** SKU if available */
  itemSku?: string;

  /** Check-in date for THIS specific booking period (ISO format: YYYY-MM-DD) */
  checkInDate: string;

  /** Check-out date for THIS specific booking period (ISO format: YYYY-MM-DD) */
  checkOutDate: string;

  /** All parameters for this booking period (adults, children, pets, etc.) */
  parameterGroups: ParameterGroup[];

  /** Number of nights for THIS specific period */
  totalNights: number;

  /** Total price for THIS booking period (sum of all parameter prices) */
  totalPrice: number;

  /** Metadata for this booking period */
  metadata: BookingItemMetadata;

  /** Special requests for this booking period */
  specialRequests?: string;

  /** Internal notes for this booking period */
  notes?: string;
}
