-- ============================================
-- GLAMPING EMAIL SYSTEM
-- Description: Add email system support for glamping bookings
-- Date: 2026-01-21
-- ============================================

-- 1. Add glamping_booking_id to email_logs table
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS glamping_booking_id UUID REFERENCES glamping_bookings(id) ON DELETE SET NULL;

-- 2. Add index for glamping email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_glamping_booking
ON email_logs(glamping_booking_id, created_at DESC)
WHERE glamping_booking_id IS NOT NULL;

-- 3. Create glamping_email_automation_rules table
CREATE TABLE IF NOT EXISTS glamping_email_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Template slug (references templates defined in code)
    template_slug VARCHAR(100) NOT NULL,

    -- Trigger configuration
    trigger_event VARCHAR(100) NOT NULL, -- booking_created, booking_confirmed, payment_received, pre_arrival, post_stay, etc.
    trigger_conditions JSONB DEFAULT '{}', -- Additional conditions

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

-- 4. Create glamping_email_queue table for scheduled emails
CREATE TABLE IF NOT EXISTS glamping_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Related entities
    glamping_booking_id UUID REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    automation_rule_id UUID REFERENCES glamping_email_automation_rules(id) ON DELETE CASCADE,
    template_slug VARCHAR(100) NOT NULL,

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

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_glamping_automation_rules_trigger
ON glamping_email_automation_rules(trigger_event, is_active);

CREATE INDEX IF NOT EXISTS idx_glamping_email_queue_scheduled
ON glamping_email_queue(scheduled_for, status);

CREATE INDEX IF NOT EXISTS idx_glamping_email_queue_booking
ON glamping_email_queue(glamping_booking_id);

-- 6. Insert default automation rules for glamping
INSERT INTO glamping_email_automation_rules (name, description, template_slug, trigger_event, trigger_timing, is_active)
VALUES
(
    'Auto-send Glamping Booking Confirmation',
    'Tự động gửi email xác nhận ngay khi booking glamping được tạo',
    'glamping-booking-confirmation',
    'booking_created',
    'immediate',
    true
),
(
    'Auto-send Glamping Pre-Arrival Reminder',
    'Tự động gửi email nhắc nhở 1 ngày trước check-in lúc 9:00 sáng',
    'glamping-pre-arrival-reminder',
    'pre_arrival',
    'scheduled',
    true
),
(
    'Auto-send Glamping Post-Stay Thank You',
    'Tự động gửi email cảm ơn 1 ngày sau check-out lúc 10:00 sáng',
    'glamping-post-stay-thank-you',
    'post_stay',
    'scheduled',
    true
)
ON CONFLICT DO NOTHING;

-- Update the offset and time for scheduled rules
UPDATE glamping_email_automation_rules
SET trigger_offset_days = -1, trigger_time = '09:00:00'
WHERE template_slug = 'glamping-pre-arrival-reminder';

UPDATE glamping_email_automation_rules
SET trigger_offset_days = 1, trigger_time = '10:00:00'
WHERE template_slug = 'glamping-post-stay-thank-you';

-- 7. Comments
COMMENT ON TABLE glamping_email_automation_rules IS 'Quy tắc tự động gửi email cho glamping bookings';
COMMENT ON TABLE glamping_email_queue IS 'Hàng đợi email glamping được lên lịch gửi';
COMMENT ON COLUMN email_logs.glamping_booking_id IS 'ID của glamping booking liên quan (nếu có)';
