/**
 * Booking History Tracking System
 *
 * This module provides functions to log and retrieve booking history events.
 * All booking changes are tracked from creation to completion.
 */

import pool from '@/lib/db';

// Action types
export type BookingHistoryAction =
  | 'created'
  | 'payment_received'
  | 'late_payment_received'
  | 'status_changed'
  | 'payment_status_changed'
  | 'updated'
  | 'cancelled'
  | 'note_added'
  | 'product_added'
  | 'product_updated'
  | 'product_cancelled'
  | 'product_removed';

// Actor types
export type ActorType = 'customer' | 'admin' | 'system';

// Entry interface
export interface BookingHistoryEntry {
  bookingId: string;
  action: BookingHistoryAction;
  oldStatus?: string;
  newStatus?: string;
  oldPaymentStatus?: string;
  newPaymentStatus?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  actorType: ActorType;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  description: string;
  metadata?: Record<string, any>;
}

// History record from database
export interface BookingHistoryRecord {
  id: string;
  booking_id: string;
  action: BookingHistoryAction;
  old_status: string | null;
  new_status: string | null;
  old_payment_status: string | null;
  new_payment_status: string | null;
  payment_amount: number | null;
  payment_method: string | null;
  actor_type: ActorType;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Log a booking history entry
 */
export async function logBookingHistory(entry: BookingHistoryEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO booking_status_history (
        booking_id,
        action,
        old_status,
        new_status,
        old_payment_status,
        new_payment_status,
        payment_amount,
        payment_method,
        actor_type,
        actor_id,
        actor_name,
        actor_email,
        description,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        entry.bookingId,
        entry.action,
        entry.oldStatus || null,
        entry.newStatus || null,
        entry.oldPaymentStatus || null,
        entry.newPaymentStatus || null,
        entry.paymentAmount || null,
        entry.paymentMethod || null,
        entry.actorType,
        entry.actorId || null,
        entry.actorName || null,
        entry.actorEmail || null,
        entry.description,
        entry.metadata ? JSON.stringify(entry.metadata) : '{}',
      ]
    );
  } catch (error) {
    // Log error but don't throw - history logging should not break main flow
    console.error('Failed to log booking history:', error);
  }
}

/**
 * Get booking history for a specific booking
 */
export async function getBookingHistory(bookingId: string): Promise<BookingHistoryRecord[]> {
  const { rows } = await pool.query<BookingHistoryRecord>(
    `SELECT * FROM booking_status_history
     WHERE booking_id = $1
     ORDER BY created_at ASC`,
    [bookingId]
  );
  return rows;
}

/**
 * Helper to generate description for common actions
 */
export const historyDescriptions = {
  created: (locale: 'vi' | 'en' = 'vi') =>
    locale === 'vi' ? 'Khách hàng tạo booking' : 'Customer created booking',

  paymentReceived: (amount: number, method: string, locale: 'vi' | 'en' = 'vi') => {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    return locale === 'vi'
      ? `Nhận thanh toán ${formattedAmount} qua ${method}`
      : `Received payment ${formattedAmount} via ${method}`;
  },

  statusChanged: (oldStatus: string, newStatus: string, actorName: string, locale: 'vi' | 'en' = 'vi') => {
    const statusLabels: Record<string, { vi: string; en: string }> = {
      pending: { vi: 'Chờ xác nhận', en: 'Pending' },
      confirmed: { vi: 'Đã xác nhận', en: 'Confirmed' },
      checked_in: { vi: 'Đã check-in', en: 'Checked In' },
      checked_out: { vi: 'Đã check-out', en: 'Checked Out' },
      cancelled: { vi: 'Đã huỷ', en: 'Cancelled' },
    };

    const oldLabel = statusLabels[oldStatus]?.[locale] || oldStatus;
    const newLabel = statusLabels[newStatus]?.[locale] || newStatus;

    return locale === 'vi'
      ? `${actorName} chuyển trạng thái từ "${oldLabel}" sang "${newLabel}"`
      : `${actorName} changed status from "${oldLabel}" to "${newLabel}"`;
  },

  paymentStatusChanged: (oldStatus: string, newStatus: string, actorName: string, locale: 'vi' | 'en' = 'vi') => {
    const statusLabels: Record<string, { vi: string; en: string }> = {
      pending: { vi: 'Chờ thanh toán', en: 'Pending Payment' },
      expired: { vi: 'Hết hạn', en: 'Expired' },
      deposit_paid: { vi: 'Đã cọc', en: 'Deposit Paid' },
      fully_paid: { vi: 'Đã thanh toán đủ', en: 'Fully Paid' },
      refund_pending: { vi: 'Chờ hoàn tiền', en: 'Refund Pending' },
      refunded: { vi: 'Đã hoàn tiền', en: 'Refunded' },
      no_refund: { vi: 'Không hoàn tiền', en: 'No Refund' },
    };

    const oldLabel = statusLabels[oldStatus]?.[locale] || oldStatus;
    const newLabel = statusLabels[newStatus]?.[locale] || newStatus;

    return locale === 'vi'
      ? `${actorName} chuyển thanh toán từ "${oldLabel}" sang "${newLabel}"`
      : `${actorName} changed payment from "${oldLabel}" to "${newLabel}"`;
  },

  cancelled: (actorName: string, reason: string, locale: 'vi' | 'en' = 'vi') =>
    locale === 'vi'
      ? `${actorName} huỷ booking${reason ? ` - Lý do: ${reason}` : ''}`
      : `${actorName} cancelled booking${reason ? ` - Reason: ${reason}` : ''}`,

  noteAdded: (actorName: string, locale: 'vi' | 'en' = 'vi') =>
    locale === 'vi'
      ? `${actorName} thêm ghi chú nội bộ`
      : `${actorName} added internal note`,

  bookingUpdated: (changes: string[], locale: 'vi' | 'en' = 'vi') => {
    if (changes.length === 0) {
      return locale === 'vi' ? 'Cập nhật thông tin booking' : 'Updated booking information';
    }
    if (changes.length === 1) {
      return locale === 'vi'
        ? `Cập nhật: ${changes[0]}`
        : `Updated: ${changes[0]}`;
    }
    return locale === 'vi'
      ? `Cập nhật ${changes.length} thông tin`
      : `Updated ${changes.length} fields`;
  },

  // Product actions
  productAdded: (productName: string, quantity: number, amount: number, actorName: string, locale: 'vi' | 'en' = 'vi') => {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    return locale === 'vi'
      ? `${actorName} thêm sản phẩm: ${productName} x${quantity} (${formattedAmount})`
      : `${actorName} added product: ${productName} x${quantity} (${formattedAmount})`;
  },

  productUpdated: (productName: string, oldQty: number, newQty: number, actorName: string, locale: 'vi' | 'en' = 'vi') =>
    locale === 'vi'
      ? `${actorName} cập nhật số lượng: ${productName} (${oldQty} → ${newQty})`
      : `${actorName} updated quantity: ${productName} (${oldQty} → ${newQty})`,

  productCancelled: (productName: string, quantity: number, reason: string, actorName: string, locale: 'vi' | 'en' = 'vi') =>
    locale === 'vi'
      ? `${actorName} huỷ sản phẩm: ${productName} x${quantity} - Lý do: ${reason}`
      : `${actorName} cancelled product: ${productName} x${quantity} - Reason: ${reason}`,

  productRemoved: (productName: string, quantity: number, actorName: string, locale: 'vi' | 'en' = 'vi') =>
    locale === 'vi'
      ? `${actorName} xoá sản phẩm: ${productName} x${quantity}`
      : `${actorName} removed product: ${productName} x${quantity}`,
};
