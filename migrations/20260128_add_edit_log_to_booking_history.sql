-- Add action_type and description columns to glamping_booking_status_history
-- for logging edit/delete actions on booking items

ALTER TABLE glamping_booking_status_history
  ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT 'status_change',
  ADD COLUMN IF NOT EXISTS description TEXT;
