-- ==========================================
-- ADD ADMIN NEW BOOKING EMAIL TEMPLATE
-- Description: Add email template for notifying staff when new booking is created
-- Date: 2025-12-05
-- ==========================================

-- Insert admin new booking created email template
INSERT INTO email_templates (name, slug, subject, body, type, is_default, available_variables, description)
VALUES
(
  'Admin: New Booking Created',
  'admin-new-booking-created',
  '[GlampingHub] Đơn đặt chỗ mới #{booking_reference}',
  E'Xin chào {customer_name},\n\nMột khách hàng vừa tạo đơn đặt chỗ mới trên hệ thống.\n\n**Thông tin đơn đặt chỗ:**\n- Mã đặt chỗ: #{booking_reference}\n- Khách hàng: {guest_name}\n- Email: {guest_email}\n- Pitch: {pitch_name}\n- Check-in: {check_in_date}\n- Check-out: {check_out_date}\n- Số khách: {number_of_guests}\n\n**Thông tin thanh toán:**\n- Tổng tiền: {total_amount}\n- Trạng thái: {payment_status}\n\nVui lòng kiểm tra và xử lý đơn đặt chỗ này.\n\nTrân trọng,\nHệ thống GlampingHub',
  'admin_notification',
  true,
  '["customer_name", "booking_reference", "guest_name", "guest_email", "pitch_name", "check_in_date", "check_out_date", "number_of_guests", "total_amount", "payment_status", "notification_link"]'::jsonb,
  'Email thông báo cho staff khi có đơn đặt chỗ mới được tạo'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  type = EXCLUDED.type,
  available_variables = EXCLUDED.available_variables,
  description = EXCLUDED.description,
  updated_at = NOW();
