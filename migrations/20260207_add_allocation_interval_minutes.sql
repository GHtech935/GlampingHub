-- Add allocation_interval_minutes column to glamping_item_attributes
-- This stores the time interval (10/15/20/30/60 minutes) for per_hour allocation type
-- Default 30 matches the UI default
ALTER TABLE glamping_item_attributes
ADD COLUMN IF NOT EXISTS allocation_interval_minutes INTEGER DEFAULT 30;
