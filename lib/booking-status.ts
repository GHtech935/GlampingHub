export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'checked_in' | 'checked_out';
export type PaymentStatus = 'pending' | 'deposit_paid' | 'fully_paid' | 'refunded' | 'refund_pending' | 'no_refund' | 'expired';

// Constants for filtering
export const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled', 'no_show'];
export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'deposit_paid', 'fully_paid', 'refunded', 'refund_pending', 'no_refund', 'expired'];

export function getPaymentStatusLabel(status: PaymentStatus, locale: string = 'vi'): string {
  const labels: Record<PaymentStatus, { vi: string; en: string }> = {
    pending: { vi: 'Chờ thanh toán', en: 'Pending Payment' },
    deposit_paid: { vi: 'Đã đặt cọc', en: 'Deposit Paid' },
    fully_paid: { vi: 'Đã thanh toán', en: 'Fully Paid' },
    refunded: { vi: 'Đã hoàn tiền', en: 'Refunded' },
    refund_pending: { vi: 'Chờ hoàn tiền', en: 'Refund Pending' },
    no_refund: { vi: 'Không hoàn tiền', en: 'No Refund' },
    expired: { vi: 'Hết hạn', en: 'Expired' },
  };

  return labels[status]?.[locale as 'vi' | 'en'] || status;
}

export function getPaymentStatusVariant(status: PaymentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    deposit_paid: 'secondary',
    fully_paid: 'default',
    refunded: 'destructive',
    refund_pending: 'secondary',
    no_refund: 'destructive',
    expired: 'destructive',
  };

  return variants[status] || 'default';
}

export function getBookingStatusLabel(status: BookingStatus, locale: string = 'vi'): string {
  const labels: Record<BookingStatus, { vi: string; en: string }> = {
    pending: { vi: 'Chờ xác nhận', en: 'Pending' },
    confirmed: { vi: 'Đã xác nhận', en: 'Confirmed' },
    cancelled: { vi: 'Đã hủy', en: 'Cancelled' },
    completed: { vi: 'Hoàn thành', en: 'Completed' },
    no_show: { vi: 'Không đến', en: 'No Show' },
    checked_in: { vi: 'Đã check-in', en: 'Checked In' },
    checked_out: { vi: 'Đã check-out', en: 'Checked Out' },
  };

  return labels[status]?.[locale as 'vi' | 'en'] || status;
}

export function getBookingStatusVariant(status: BookingStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    confirmed: 'default',
    cancelled: 'destructive',
    completed: 'secondary',
    no_show: 'destructive',
    checked_in: 'default',
    checked_out: 'secondary',
  };

  return variants[status] || 'default';
}

// Alias for backward compatibility
export const getStatusLabel = getBookingStatusLabel;
export const getStatusVariant = getBookingStatusVariant;
