-- Migration: Add enable_dinner_reminder_email column to glamping_zones
-- This controls whether booking confirmation emails include the dinner selection button

ALTER TABLE glamping_zones
ADD COLUMN IF NOT EXISTS enable_dinner_reminder_email BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN glamping_zones.enable_dinner_reminder_email IS
  'When true, booking confirmation emails include the dinner selection button';
