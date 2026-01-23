-- Add booking-confirmed email template
-- This is sent when admin confirms a booking (after payment is verified)
-- Different from booking-confirmation which is sent immediately after booking creation

INSERT INTO email_templates (
  name,
  slug,
  subject,
  body,
  type,
  is_default,
  available_variables,
  description,
  is_active
)
VALUES (
  'Booking Confirmed by Admin',
  'booking-confirmed',
  '✅ Đặt chỗ #{booking_reference} đã được xác nhận - GlampingHub',
  'HTML template is defined in code',
  'booking_confirmed',
  false,
  '["customer_name", "campsite_name", "booking_reference", "checkin_date", "checkout_date", "notification_link"]'::jsonb,
  'Email gửi cho khách khi admin xác nhận đặt chỗ (sau khi kiểm tra thanh toán)',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  available_variables = EXCLUDED.available_variables,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
