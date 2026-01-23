-- ==========================================
-- ADD ADMIN NEW BOOKING PENDING EMAIL TEMPLATE
-- Description: Add email template for notifying staff when payment is received and booking needs confirmation
-- Date: 2025-12-07
-- ==========================================

-- Insert admin new booking pending email template
INSERT INTO email_templates (name, slug, subject, body, type, is_default, available_variables, description)
VALUES
(
  'Admin: Payment Received - Booking Pending',
  'admin-new-booking-pending',
  '[GlampingHub] 💰 Đã nhận thanh toán - Đơn #{booking_reference} cần xác nhận',
  E'Xin chào {customer_name},\n\nĐơn đặt chỗ #{booking_reference} đã thanh toán và đang chờ xác nhận.\n\n**Thông tin thanh toán:**\n- Mã đặt chỗ: #{booking_reference}\n- Số tiền đã nhận: {amount}\n- Khách hàng: {guest_name}\n- Email: {guest_email}\n- Campsite: {campsite_name}\n- Pitch: {pitch_name}\n- Ngày: {check_in_date} → {check_out_date}\n\nVui lòng kiểm tra và xác nhận đơn đặt chỗ này.\n\nTrân trọng,\nHệ thống GlampingHub',
  'admin_notification',
  true,
  '["customer_name", "booking_reference", "amount", "guest_name", "guest_email", "campsite_name", "pitch_name", "check_in_date", "check_out_date", "notification_link"]'::jsonb,
  'Email thông báo cho staff khi đơn đặt chỗ đã thanh toán và cần xác nhận'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  type = EXCLUDED.type,
  available_variables = EXCLUDED.available_variables,
  description = EXCLUDED.description,
  updated_at = NOW();
