BEGIN;

-- =========================================================================
-- CREATE GLAMPING_NOTIFICATIONS TABLE
-- =========================================================================
-- Creates a separate notification system for GlampingHub
-- Same structure as notifications table for consistency
-- =========================================================================

CREATE TABLE glamping_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'staff')),
  type TEXT NOT NULL,
  title JSONB NOT NULL,
  message JSONB NOT NULL,
  data JSONB,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  send_email BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- INDEXES FOR PERFORMANCE
-- =========================================================================

-- Main query index: user + time ordering
CREATE INDEX idx_glamping_notifications_user
  ON glamping_notifications(user_id, user_type, created_at DESC);

-- Unread badge query optimization
CREATE INDEX idx_glamping_notifications_unread
  ON glamping_notifications(user_id, user_type, is_read)
  WHERE is_read = false;

-- Admin analytics
CREATE INDEX idx_glamping_notifications_type
  ON glamping_notifications(type, created_at DESC);

-- =========================================================================
-- CLEANUP OLD GLAMPING NOTIFICATIONS
-- =========================================================================
-- Delete old glamping notifications from shared table (clean slate)
-- Identifies glamping notifications by presence of glamping_booking_id

DELETE FROM notifications
WHERE data->>'glamping_booking_id' IS NOT NULL;

-- =========================================================================
-- TABLE COMMENT
-- =========================================================================

COMMENT ON TABLE glamping_notifications IS
  'Notification system for GlampingHub app. Separate from camping notifications for data isolation.';

COMMIT;
