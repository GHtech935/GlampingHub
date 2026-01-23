-- Add active column to glamping_item_events table
ALTER TABLE glamping_item_events 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add index for faster queries filtering by active status
CREATE INDEX IF NOT EXISTS idx_glamping_item_events_active ON glamping_item_events(active);

-- Add comment
COMMENT ON COLUMN glamping_item_events.active IS 'Whether the event is active or disabled';
