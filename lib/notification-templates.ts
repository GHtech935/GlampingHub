/**
 * Notification Templates for GlampingHub
 *
 * Defines all notification types for customers and staff
 * with bilingual content (Vietnamese/English)
 */

// Template structure interface
export interface NotificationTemplate {
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  title: { vi: string; en: string };
  message: { vi: string; en: string };
  link: string;
  sendEmail: boolean;
  roles?: ('admin' | 'sale' | 'operations' | 'owner')[]; // Only for staff notifications
}

// =============================================================================
// CUSTOMER NOTIFICATION TEMPLATES (9 types)
// =============================================================================

export const CUSTOMER_NOTIFICATION_TEMPLATES = {
  // 1. Booking Created
  booking_created: {
    icon: '📝',
    color: 'blue',
    title: {
      vi: 'Đặt chỗ thành công',
      en: 'Booking Created'
    },
    message: {
      vi: 'Đơn đặt chỗ {booking_reference} đã được tạo. Vui lòng thanh toán trong 30 phút.',
      en: 'Booking {booking_reference} created. Please complete payment within 30 minutes.'
    },
    link: '/booking/confirmation/{booking_id}',
    sendEmail: false // Email already sent in booking flow
  },

  // 2. Payment Received
  payment_received: {
    icon: '💰',
    color: 'green',
    title: {
      vi: 'Đã nhận thanh toán',
      en: 'Payment Received'
    },
    message: {
      vi: 'Thanh toán {amount} đã được xác nhận. Đơn đặt chỗ của bạn đã được xác nhận.',
      en: 'Payment of {amount} confirmed. Your booking has been confirmed.'
    },
    link: '/booking/confirmation/{booking_id}',
    sendEmail: true
  },

  // 3. Booking Confirmed
  booking_confirmed: {
    icon: '✅',
    color: 'green',
    title: {
      vi: 'Đặt chỗ đã được xác nhận',
      en: 'Booking Confirmed'
    },
    message: {
      vi: 'Đơn đặt chỗ {booking_reference} đã được xác nhận. Chúng tôi đang chờ đón bạn!',
      en: 'Booking {booking_reference} confirmed. We look forward to welcoming you!'
    },
    link: '/booking/confirmation/{booking_id}',
    sendEmail: true
  },

  // 4. Balance Payment Reminder
  balance_reminder: {
    icon: '⏰',
    color: 'orange',
    title: {
      vi: 'Nhắc thanh toán còn lại',
      en: 'Balance Payment Reminder'
    },
    message: {
      vi: 'Vui lòng thanh toán số dư {amount} trước khi nhận phòng ({checkin_date}).',
      en: 'Please pay balance of {amount} before check-in on {checkin_date}.'
    },
    link: '/booking/confirmation/{booking_id}',
    sendEmail: true
  },

  // 5. Pre-Arrival Reminder
  pre_arrival_reminder: {
    icon: '🏕️',
    color: 'blue',
    title: {
      vi: 'Sắp đến ngày nhận phòng',
      en: 'Check-in Tomorrow'
    },
    message: {
      vi: 'Ngày mai ({checkin_date}) bạn sẽ nhận phòng tại {campsite_name}. Chúc bạn có chuyến đi vui vẻ!',
      en: 'Your check-in is tomorrow ({checkin_date}) at {campsite_name}. Have a great trip!'
    },
    link: '/booking/confirmation/{booking_id}',
    sendEmail: true
  },

  // 6. Check-in Confirmed
  check_in_confirmed: {
    icon: '🎉',
    color: 'green',
    title: {
      vi: 'Đã nhận phòng',
      en: 'Checked In'
    },
    message: {
      vi: 'Bạn đã nhận phòng tại {campsite_name}. Chúc bạn có kỳ nghỉ tuyệt vời!',
      en: 'You have checked in at {campsite_name}. Enjoy your stay!'
    },
    link: '/booking/confirmation/{booking_id}',
    sendEmail: false
  },

  // 7. Check-out Confirmed
  check_out_confirmed: {
    icon: '👋',
    color: 'blue',
    title: {
      vi: 'Đã trả phòng',
      en: 'Checked Out'
    },
    message: {
      vi: 'Cảm ơn bạn đã lưu trú tại {campsite_name}. Hẹn gặp lại!',
      en: 'Thank you for staying at {campsite_name}. See you again!'
    },
    link: '/booking/confirmation/{booking_id}',
    sendEmail: false
  },

  // 8. Booking Cancelled
  booking_cancelled: {
    icon: '❌',
    color: 'red',
    title: {
      vi: 'Đặt chỗ đã hủy',
      en: 'Booking Cancelled'
    },
    message: {
      vi: 'Đơn đặt chỗ {booking_reference} đã được hủy. {refund_message}',
      en: 'Booking {booking_reference} has been cancelled. {refund_message}'
    },
    link: '/booking/confirmation/{booking_id}',
    sendEmail: true
  },

  // 9. Review Request
  review_request: {
    icon: '⭐',
    color: 'purple',
    title: {
      vi: 'Đánh giá chuyến đi',
      en: 'Rate Your Stay'
    },
    message: {
      vi: 'Cảm ơn bạn đã lưu trú tại {campsite_name}. Hãy chia sẻ trải nghiệm của bạn!',
      en: 'Thank you for staying at {campsite_name}. Share your experience!'
    },
    link: '/booking/confirmation/{booking_id}/review',
    sendEmail: false
  },

  // 10. Menu Selection Reminder
  menu_selection_reminder: {
    icon: '🍽️',
    color: 'orange',
    title: {
      vi: 'Nhắc nhở chọn món ăn',
      en: 'Menu Selection Reminder'
    },
    message: {
      vi: 'Đừng quên chọn món ăn cho chuyến đi! Bạn chỉ có thể chỉnh sửa đến 24h trước check-in.',
      en: 'Don\'t forget to select your meals! You can only edit until 24h before check-in.'
    },
    link: '/glamping/booking/confirmation/{booking_code}',
    sendEmail: true
  },

  // 11. Late Payment for Expired Booking
  late_payment_expired: {
    icon: '⚠️',
    color: 'orange',
    title: {
      vi: 'Thanh toán muộn',
      en: 'Late Payment Received'
    },
    message: {
      vi: 'Chúng tôi đã nhận {amount} cho đơn {booking_reference} đã hết hạn. Admin sẽ liên hệ để hỗ trợ.',
      en: 'We received {amount} for expired booking {booking_reference}. Admin will contact you for assistance.'
    },
    link: '/',
    sendEmail: true
  }
} as const;

// =============================================================================
// STAFF NOTIFICATION TEMPLATES (7 types)
// =============================================================================

export const STAFF_NOTIFICATION_TEMPLATES = {
  // 1. New Booking Created (sent immediately when customer creates booking)
  new_booking_created: {
    icon: '🆕',
    color: 'blue',
    title: {
      vi: 'Đơn đặt chỗ mới',
      en: 'New Booking Created'
    },
    message: {
      vi: 'Khách hàng {customer_name} vừa đặt #{booking_reference} - {pitch_name} ({check_in_date} → {check_out_date}). Tổng: {total_amount}',
      en: 'Customer {customer_name} booked #{booking_reference} - {pitch_name} ({check_in_date} → {check_out_date}). Total: {total_amount}'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: false, // Email is sent directly by sendGlampingBookingNotificationToStaff with full guest details
    roles: ['admin', 'sale', 'operations']
  },

  // 2. New Booking Pending Confirmation (after payment received)
  new_booking_pending: {
    icon: '🔔',
    color: 'orange',
    title: {
      vi: 'Đơn mới cần duyệt',
      en: 'New Booking Pending'
    },
    message: {
      vi: 'Đơn #{booking_reference} đã thanh toán {amount} và đang chờ xác nhận.',
      en: 'Booking #{booking_reference} paid {amount} and awaiting confirmation.'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: true,
    roles: ['admin', 'operations']
  },

  // 2. Payment Failed
  payment_failed: {
    icon: '⚠️',
    color: 'red',
    title: {
      vi: 'Thanh toán thất bại',
      en: 'Payment Failed'
    },
    message: {
      vi: 'Thanh toán cho đơn #{booking_reference} bị lỗi. Cần kiểm tra.',
      en: 'Payment failed for booking #{booking_reference}. Requires attention.'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: true,
    roles: ['admin']
  },

  // 3. Low Availability Alert
  low_availability: {
    icon: '📉',
    color: 'orange',
    title: {
      vi: 'Sắp hết phòng',
      en: 'Low Availability'
    },
    message: {
      vi: '{campsite_name} chỉ còn {available_count} pitch trống trong 30 ngày tới.',
      en: '{campsite_name} has only {available_count} pitches available in next 30 days.'
    },
    link: '/admin-camping/calendar?campsite={campsite_id}',
    sendEmail: false,
    roles: ['admin']
  },

  // 4. Pricing Changed (by another admin)
  pricing_changed: {
    icon: '💲',
    color: 'blue',
    title: {
      vi: 'Giá đã thay đổi',
      en: 'Pricing Updated'
    },
    message: {
      vi: '{admin_name} đã cập nhật giá cho {pitch_name}.',
      en: '{admin_name} updated pricing for {pitch_name}.'
    },
    link: '/admin-camping/pricing',
    sendEmail: false,
    roles: ['admin']
  },

  // 5. Review Submitted
  review_submitted: {
    icon: '⭐',
    color: 'blue',
    title: {
      vi: 'Đánh giá mới',
      en: 'New Review'
    },
    message: {
      vi: '{customer_name} đã đánh giá {rating}⭐ cho {campsite_name}.',
      en: '{customer_name} rated {rating}⭐ for {campsite_name}.'
    },
    link: '/admin-camping/reviews/{review_id}',
    sendEmail: false,
    roles: ['admin', 'sale']
  },

  // 6. Low Stock Alert
  low_stock: {
    icon: '📦',
    color: 'orange',
    title: {
      vi: 'Sắp hết hàng',
      en: 'Low Stock Alert'
    },
    message: {
      vi: 'Sản phẩm "{product_name}" chỉ còn {quantity} trong kho.',
      en: 'Product "{product_name}" has only {quantity} in stock.'
    },
    link: '/admin-camping/products/{product_id}',
    sendEmail: false,
    roles: ['admin', 'operations']
  },

  // 7. Booking Products - Initial Order (on booking creation)
  booking_products_initial: {
    icon: '🛒',
    color: 'blue',
    title: {
      vi: 'Đơn mới có sản phẩm',
      en: 'New Booking with Products'
    },
    message: {
      vi: 'Đơn {booking_reference} - {customer_name} đặt {product_count} sản phẩm: {product_list}',
      en: 'Booking {booking_reference} - {customer_name} ordered {product_count} products: {product_list}'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: false,
    roles: ['admin', 'operations', 'owner']
  },

  // 8. Booking Products - Added (post-booking)
  booking_products_added: {
    icon: '➕',
    color: 'green',
    title: {
      vi: 'Đã thêm sản phẩm',
      en: 'Product Added'
    },
    message: {
      vi: 'Đơn {booking_reference} - Đã thêm: {product_list}',
      en: 'Booking {booking_reference} - Added: {product_list}'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: false,
    roles: ['admin', 'operations', 'owner']
  },

  // 9. Booking Products - Quantity Updated
  booking_products_updated: {
    icon: '🔄',
    color: 'blue',
    title: {
      vi: 'Đã cập nhật số lượng',
      en: 'Quantity Updated'
    },
    message: {
      vi: 'Đơn {booking_reference} - {product_name}: {old_quantity} → {new_quantity}',
      en: 'Booking {booking_reference} - {product_name}: {old_quantity} → {new_quantity}'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: false,
    roles: ['admin', 'operations', 'owner']
  },

  // 10. Booking Products - Cancelled
  booking_products_cancelled: {
    icon: '🗑️',
    color: 'red',
    title: {
      vi: 'Đã hủy sản phẩm',
      en: 'Product Cancelled'
    },
    message: {
      vi: 'Đơn {booking_reference} - Đã hủy: {product_name} (x{quantity}). Lý do: {reason}',
      en: 'Booking {booking_reference} - Cancelled: {product_name} (x{quantity}). Reason: {reason}'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: false,
    roles: ['admin', 'operations', 'owner']
  },

  // 7. Owner: Check-in Confirmed (with email for remote tracking)
  owner_check_in: {
    icon: '🎉',
    color: 'green',
    title: {
      vi: 'Khách đã nhận phòng',
      en: 'Guest Checked In'
    },
    message: {
      vi: 'Khách {guest_name} đã nhận phòng tại {campsite_name} cho đơn #{booking_reference}.',
      en: 'Guest {guest_name} has checked in at {campsite_name} for booking #{booking_reference}.'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: true,
    roles: ['admin', 'operations', 'owner']
  },

  // 8. Owner: Check-out Confirmed (with email for remote tracking)
  owner_check_out: {
    icon: '👋',
    color: 'blue',
    title: {
      vi: 'Khách đã trả phòng',
      en: 'Guest Checked Out'
    },
    message: {
      vi: 'Khách {guest_name} đã trả phòng tại {campsite_name} cho đơn #{booking_reference}.',
      en: 'Guest {guest_name} has checked out from {campsite_name} for booking #{booking_reference}.'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: true,
    roles: ['admin', 'operations', 'owner']
  },

  // 9. Payment Status Updated (for owners to track revenue)
  payment_status_updated: {
    icon: '💳',
    color: 'green',
    title: {
      vi: 'Trạng thái thanh toán đã cập nhật',
      en: 'Payment Status Updated'
    },
    message: {
      vi: 'Đơn #{booking_reference} - Trạng thái thanh toán: {payment_status}. Số tiền: {amount}',
      en: 'Booking #{booking_reference} - Payment status: {payment_status}. Amount: {amount}'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: true,
    roles: ['admin', 'operations', 'owner']
  },

  // 10. Payment Record Added (manual payment by admin)
  payment_record_added: {
    icon: '💰',
    color: 'green',
    title: {
      vi: 'Đã ghi nhận thanh toán',
      en: 'Payment Record Added'
    },
    message: {
      vi: 'Đơn #{booking_reference} - Đã nhận thanh toán {amount} qua {payment_method}.',
      en: 'Booking #{booking_reference} - Received payment {amount} via {payment_method}.'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: true,
    roles: ['admin', 'operations', 'owner']
  },

  // 11. Owner: Booking Confirmed (staff version with email)
  owner_booking_confirmed: {
    icon: '✅',
    color: 'green',
    title: {
      vi: 'Đơn đặt chỗ đã xác nhận',
      en: 'Booking Confirmed'
    },
    message: {
      vi: 'Đơn #{booking_reference} tại {campsite_name} đã được xác nhận (Check-in: {checkin_date}).',
      en: 'Booking #{booking_reference} at {campsite_name} has been confirmed (Check-in: {checkin_date}).'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: true,
    roles: ['admin', 'operations', 'owner']
  },

  // 12. Owner: Booking Cancelled (staff version with email)
  owner_booking_cancelled: {
    icon: '❌',
    color: 'red',
    title: {
      vi: 'Đơn đặt chỗ đã hủy',
      en: 'Booking Cancelled'
    },
    message: {
      vi: 'Đơn #{booking_reference} tại {campsite_name} đã bị hủy. {refund_message}',
      en: 'Booking #{booking_reference} at {campsite_name} has been cancelled. {refund_message}'
    },
    link: '/admin-camping/bookings?id={booking_id}',
    sendEmail: true,
    roles: ['admin', 'operations', 'owner']
  },

  // 13. Late Payment Received (for expired booking)
  late_payment_received: {
    icon: '⚠️',
    color: 'red',
    title: {
      vi: 'Thanh toán muộn - Cần xử lý',
      en: 'Late Payment - Action Required'
    },
    message: {
      vi: 'Nhận {amount} cho đơn #{booking_reference} ĐÃ HẾT HẠN. Cần xử lý hoàn tiền.',
      en: 'Received {amount} for EXPIRED booking #{booking_reference}. Refund required.'
    },
    link: '/admin-camping/sepay-transactions?status=late_payment',
    sendEmail: true,
    roles: ['admin', 'operations']
  },

  // 14. Webhook Failure Alert
  webhook_failure_alert: {
    icon: '🚨',
    color: 'red',
    title: {
      vi: 'Cảnh báo Webhook lỗi',
      en: 'Webhook Failure Alert'
    },
    message: {
      vi: 'Webhook {webhook_type} đang có {failure_count} lỗi trong {time_window}. Cần kiểm tra ngay!',
      en: 'Webhook {webhook_type} has {failure_count} failures in {time_window}. Immediate attention required!'
    },
    link: '/admin-camping/webhook-logs',
    sendEmail: false,
    roles: ['admin', 'operations']
  }
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CustomerNotificationType = keyof typeof CUSTOMER_NOTIFICATION_TEMPLATES;
export type StaffNotificationType = keyof typeof STAFF_NOTIFICATION_TEMPLATES;
export type NotificationType = CustomerNotificationType | StaffNotificationType;

// Helper to get all customer notification types
export const CUSTOMER_NOTIFICATION_TYPES = Object.keys(
  CUSTOMER_NOTIFICATION_TEMPLATES
) as CustomerNotificationType[];

// Helper to get all staff notification types
export const STAFF_NOTIFICATION_TYPES = Object.keys(
  STAFF_NOTIFICATION_TEMPLATES
) as StaffNotificationType[];

// Email template mapping for notifications that send emails
// GlampingHub project - all templates use 'glamping-' prefix
export const EMAIL_TEMPLATE_MAP: Record<string, string> = {
  // Customer emails
  payment_received: 'glamping-payment-confirmation',
  booking_confirmed: 'glamping-booking-confirmed',
  balance_reminder: 'glamping-payment-reminder',
  pre_arrival_reminder: 'glamping-pre-arrival-reminder',
  booking_cancelled: 'glamping-booking-cancellation',
  menu_selection_reminder: 'glamping-menu-selection-reminder',
  late_payment_expired: 'glamping-late-payment-customer',

  // Admin/Staff emails
  new_booking_created: 'glamping-admin-new-booking-created',
  new_booking_pending: 'glamping-admin-new-booking-pending',
  late_payment_received: 'glamping-admin-late-payment'
};

// =============================================================================
// LINK TRANSFORMATION FOR GLAMPING
// =============================================================================

/**
 * Transform notification links for GlampingHub context
 * Converts camping routes to glamping routes
 *
 * @param link - Original link from template (camping format)
 * @param userType - 'customer' or 'staff'
 * @param data - Template data (for variable replacement)
 * @returns Transformed link pointing to glamping routes
 *
 * @example
 * // Staff link transformation
 * transformLinkForGlamping('/admin-camping/bookings?id={booking_id}', 'staff', { booking_id: '123' })
 * // Returns: '/admin/glamping/bookings?id=123'
 *
 * // Customer link transformation
 * transformLinkForGlamping('/booking/confirmation/{booking_id}', 'customer', { booking_code: 'GH26000001' })
 * // Returns: '/glamping/booking/confirmation/GH26000001'
 */
export function transformLinkForGlamping(
  link: string,
  userType: 'customer' | 'staff',
  data?: Record<string, any>
): string {
  if (userType === 'staff') {
    // Transform: /admin-camping/* => /admin/glamping/*
    return link.replace('/admin-camping/', '/admin/glamping/');
  } else {
    // Transform: /booking/* => /glamping/booking/*
    let transformed = link.replace('/booking/', '/glamping/booking/');

    // Replace {booking_id} with actual booking_code for glamping
    if (data?.booking_code && transformed.includes('{booking_id}')) {
      transformed = transformed.replace('{booking_id}', data.booking_code);
    }

    return transformed;
  }
}
