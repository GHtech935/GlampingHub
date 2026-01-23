-- ==========================================
-- COMPLETE EMAIL SYSTEM - PART 2
-- Description: Add missing email automation tables and complete templates
-- Date: 2025-11-18
-- ==========================================

-- Add created_by column to email_templates (if not exists)
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Automation Rules
CREATE TABLE IF NOT EXISTS email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template to use
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,

  -- Trigger configuration
  trigger_event VARCHAR(100) NOT NULL, -- booking_created, booking_confirmed, payment_received, pre_arrival, post_stay, etc.
  trigger_conditions JSONB DEFAULT '{}', -- Additional conditions: {"booking_status": "confirmed", "min_nights": 2}

  -- Timing
  trigger_timing VARCHAR(50) DEFAULT 'immediate', -- immediate, scheduled
  trigger_offset_days INTEGER DEFAULT 0, -- For scheduled: -1 = 1 day before, +1 = 1 day after
  trigger_offset_hours INTEGER DEFAULT 0,
  trigger_time TIME, -- For scheduled: send at specific time (e.g., 09:00:00)

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Statistics
  total_sent INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Log (Communication History)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  automation_rule_id UUID REFERENCES email_automation_rules(id) ON DELETE SET NULL,

  -- Email details
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,

  -- Sending status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, bounced
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  -- Email provider response
  provider VARCHAR(50), -- resend, sendgrid, mailgun, smtp
  provider_message_id VARCHAR(255),
  provider_response JSONB,

  -- Engagement tracking
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Emails Queue
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  automation_rule_id UUID REFERENCES email_automation_rules(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id),

  -- Email details
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, sent, failed, cancelled
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Processing
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_trigger ON email_automation_rules(trigger_event, is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_booking ON email_logs(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for, status);

-- Insert/Update default email templates (5 comprehensive templates)
INSERT INTO email_templates (name, slug, subject, body, type, is_default, available_variables, description)
VALUES
(
  'Booking Confirmation',
  'booking-confirmation',
  'Xác nhận đặt phòng #{booking_reference} - GlampingHub',
  E'Xin chào {guest_name},\n\nCảm ơn bạn đã đặt phòng tại GlampingHub!\n\n**Thông tin đặt phòng:**\n- Mã đặt phòng: {booking_reference}\n- Campsite: {campsite_name}\n- Pitch: {pitch_name}\n- Check-in: {check_in_date} lúc {check_in_time}\n- Check-out: {check_out_date} lúc {check_out_time}\n- Số đêm: {nights}\n- Số khách: {adults} người lớn, {children} trẻ em\n\n**Chi phí:**\n- Tổng tiền: {total_amount}\n- Đã thanh toán: {deposit_amount}\n- Còn lại: {balance_amount}\n\nChúng tôi rất mong được đón tiếp bạn!\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'booking_confirmation',
  true,
  '["booking_reference", "guest_name", "campsite_name", "pitch_name", "check_in_date", "check_in_time", "check_out_date", "check_out_time", "nights", "adults", "children", "total_amount", "deposit_amount", "balance_amount"]'::jsonb,
  'Email xác nhận đặt phòng gửi ngay sau khi khách hoàn tất booking'
),
(
  'Pre-Arrival Reminder',
  'pre-arrival-reminder',
  'Nhắc nhở: Chuyến đi của bạn sắp bắt đầu - {campsite_name}',
  E'Xin chào {guest_name},\n\nChuyến đi của bạn tại {campsite_name} sắp bắt đầu rồi!\n\n**Thông tin quan trọng:**\n- Check-in: {check_in_date} lúc {check_in_time}\n- Địa chỉ: {campsite_address}\n- Liên hệ: {campsite_phone}\n\n**Thời tiết dự báo:**\nDự báo thời tiết trong những ngày bạn ở lại: {weather_forecast}\n\n**Gợi ý chuẩn bị:**\n✓ Giấy tờ tùy thân\n✓ Email xác nhận đặt phòng\n✓ Thanh toán số tiền còn lại: {balance_amount}\n\n**Hướng dẫn đường đi:**\n{directions}\n\n**Quy định:**\n{house_rules}\n\nNếu có bất kỳ câu hỏi nào, vui lòng liên hệ: {campsite_phone}\n\nHẹn gặp bạn sớm!\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'pre_arrival',
  true,
  '["guest_name", "campsite_name", "check_in_date", "check_in_time", "campsite_address", "campsite_phone", "balance_amount", "weather_forecast", "directions", "house_rules"]'::jsonb,
  'Email nhắc nhở gửi 24 giờ trước check-in'
),
(
  'Post-Stay Thank You',
  'post-stay-thank-you',
  'Cảm ơn bạn đã lựa chọn {campsite_name}!',
  E'Xin chào {guest_name},\n\nCảm ơn bạn đã lựa chọn {campsite_name} cho chuyến đi của mình!\n\nChúng tôi hy vọng bạn đã có những trải nghiệm tuyệt vời tại đây.\n\n**Đánh giá trải nghiệm của bạn:**\nPhản hồi của bạn rất quan trọng với chúng tôi. Vui lòng dành vài phút để đánh giá:\n\n👉 [Đánh giá ngay]({review_link})\n\n**Ưu đãi cho lần đặt phòng tiếp theo:**\nĐặc biệt cho bạn: Giảm {discount_percentage}% cho lần đặt phòng tiếp theo!\nMã giảm giá: {discount_code}\nHiệu lực đến: {discount_expiry}\n\n**Chia sẻ trải nghiệm:**\nNếu bạn thích chuyến đi, hãy chia sẻ với bạn bè trên mạng xã hội:\n- Facebook: [Link]\n- Instagram: [Link]\n\nMong được đón tiếp bạn trở lại!\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'post_stay',
  true,
  '["guest_name", "campsite_name", "review_link", "discount_percentage", "discount_code", "discount_expiry"]'::jsonb,
  'Email cảm ơn và yêu cầu đánh giá gửi sau check-out 1 ngày'
),
(
  'Payment Reminder',
  'payment-reminder',
  'Nhắc nhở thanh toán - Booking #{booking_reference}',
  E'Xin chào {guest_name},\n\nĐây là email nhắc nhở thanh toán cho booking #{booking_reference}.\n\n**Thông tin thanh toán:**\n- Tổng tiền: {total_amount}\n- Đã thanh toán: {paid_amount}\n- **Còn lại: {balance_amount}**\n- Hạn thanh toán: {payment_due_date}\n\n**Thông tin chuyến đi:**\n- Campsite: {campsite_name}\n- Check-in: {check_in_date}\n- Check-out: {check_out_date}\n\n**Phương thức thanh toán:**\n👉 [Thanh toán ngay]({payment_link})\n\nLưu ý: Nếu không thanh toán đúng hạn, booking của bạn có thể bị hủy.\n\nNếu bạn đã thanh toán, vui lòng bỏ qua email này.\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'payment_reminder',
  true,
  '["guest_name", "booking_reference", "total_amount", "paid_amount", "balance_amount", "payment_due_date", "campsite_name", "check_in_date", "check_out_date", "payment_link"]'::jsonb,
  'Email nhắc nhở thanh toán số tiền còn lại'
),
(
  'Booking Cancellation',
  'booking-cancellation',
  'Xác nhận hủy booking #{booking_reference}',
  E'Xin chào {guest_name},\n\nĐặt phòng #{booking_reference} của bạn đã được hủy.\n\n**Thông tin booking đã hủy:**\n- Campsite: {campsite_name}\n- Check-in: {check_in_date}\n- Check-out: {check_out_date}\n- Tổng tiền: {total_amount}\n\n**Thông tin hoàn tiền:**\n{refund_info}\n\nNếu đây không phải là yêu cầu của bạn, vui lòng liên hệ ngay: {support_email}\n\nChúng tôi hy vọng được phục vụ bạn trong tương lai.\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'cancellation',
  true,
  '["guest_name", "booking_reference", "campsite_name", "check_in_date", "check_out_date", "total_amount", "refund_info", "support_email"]'::jsonb,
  'Email xác nhận khi booking bị hủy'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  type = EXCLUDED.type,
  is_default = EXCLUDED.is_default,
  available_variables = EXCLUDED.available_variables,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert default automation rules (3 rules)
INSERT INTO email_automation_rules (name, description, template_id, trigger_event, trigger_timing, is_active)
SELECT
  'Auto-send Booking Confirmation',
  'Tự động gửi email xác nhận ngay khi booking được tạo',
  id,
  'booking_created',
  'immediate',
  true
FROM email_templates WHERE slug = 'booking-confirmation'
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_rules (name, description, template_id, trigger_event, trigger_timing, trigger_offset_days, trigger_time, is_active)
SELECT
  'Auto-send Pre-Arrival Reminder',
  'Tự động gửi email nhắc nhở 1 ngày trước check-in lúc 9:00 sáng',
  id,
  'pre_arrival',
  'scheduled',
  -1, -- 1 day before
  '09:00:00',
  true
FROM email_templates WHERE slug = 'pre-arrival-reminder'
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_rules (name, description, template_id, trigger_event, trigger_timing, trigger_offset_days, trigger_time, is_active)
SELECT
  'Auto-send Post-Stay Thank You',
  'Tự động gửi email cảm ơn 1 ngày sau check-out lúc 10:00 sáng',
  id,
  'post_stay',
  'scheduled',
  1, -- 1 day after
  '10:00:00',
  true
FROM email_templates WHERE slug = 'post-stay-thank-you'
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE email_automation_rules IS 'Quy tắc tự động gửi email dựa trên sự kiện';
COMMENT ON TABLE email_logs IS 'Lịch sử gửi email và tracking engagement';
COMMENT ON TABLE email_queue IS 'Hàng đợi email được lên lịch gửi';
