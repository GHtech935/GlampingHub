-- Update glamping_item_events recurrence constraint to include 'always'
-- Drop old constraint
ALTER TABLE glamping_item_events
DROP CONSTRAINT IF EXISTS glamping_item_events_recurrence_check;

-- Add new constraint with 'always' option
ALTER TABLE glamping_item_events
ADD CONSTRAINT glamping_item_events_recurrence_check
CHECK (recurrence IN ('one_time', 'weekly', 'monthly', 'yearly', 'always'));

-- Add comment
COMMENT ON COLUMN glamping_item_events.recurrence IS 'Event recurrence: one_time, weekly, monthly, yearly, or always (no expiry)';
