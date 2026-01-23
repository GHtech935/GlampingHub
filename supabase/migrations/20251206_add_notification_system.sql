-- Notification System Migration
-- Creates the notifications table for in-app notification center

-- Drop table if exists (for re-running)
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference (no FK as it references 2 different tables)
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'staff')),

  -- Notification content (bilingual JSONB)
  type TEXT NOT NULL,
  title JSONB NOT NULL DEFAULT '{"vi": "", "en": ""}'::jsonb,
  message JSONB NOT NULL DEFAULT '{"vi": "", "en": ""}'::jsonb,

  -- Additional data & navigation
  data JSONB,          -- { booking_id, amount, etc. }
  link TEXT,           -- Deep link: /bookings/123, /admin/bookings/456

  -- State
  is_read BOOLEAN DEFAULT false,
  send_email BOOLEAN DEFAULT false,  -- Did we send email?

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE notifications IS 'In-app notification center for customers and staff';
COMMENT ON COLUMN notifications.user_id IS 'References customers.id (customer) or users.id (staff)';
COMMENT ON COLUMN notifications.user_type IS 'customer or staff - determines which table user_id references';
COMMENT ON COLUMN notifications.type IS 'Notification type: booking_created, payment_received, etc.';
COMMENT ON COLUMN notifications.title IS 'Bilingual title JSONB: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN notifications.message IS 'Bilingual message JSONB: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN notifications.data IS 'Additional metadata specific to notification type';
COMMENT ON COLUMN notifications.link IS 'Relative path for navigation: /bookings/123';
COMMENT ON COLUMN notifications.send_email IS 'Whether email was sent alongside in-app notification';

-- Indexes for performance
CREATE INDEX idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Grant permissions (if using RLS)
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
