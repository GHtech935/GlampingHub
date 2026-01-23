-- Add weekly_days column to glamping_discounts
ALTER TABLE glamping_discounts
ADD COLUMN IF NOT EXISTS weekly_days INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Comment on the column
COMMENT ON COLUMN glamping_discounts.weekly_days IS 'Array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday) for weekly recurring discounts';

-- Drop the old recurrence constraint
ALTER TABLE glamping_discounts
DROP CONSTRAINT IF EXISTS glamping_discounts_recurrence_check;

-- Add new recurrence constraint with 'weekly' option
ALTER TABLE glamping_discounts
ADD CONSTRAINT glamping_discounts_recurrence_check
CHECK (recurrence IN ('always', 'one_time', 'date_range', 'weekly'));
