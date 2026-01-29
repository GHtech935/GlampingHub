-- Add 'per_booking' to the allowed rate_type values in glamping_pricing table
-- This is needed to support pricing that applies once per booking (not per night/day/hour)

-- Drop the old constraint
ALTER TABLE glamping_pricing DROP CONSTRAINT IF EXISTS glamping_pricing_rate_type_check;

-- Add new constraint with 'per_booking' included
ALTER TABLE glamping_pricing ADD CONSTRAINT glamping_pricing_rate_type_check
    CHECK (rate_type IN ('per_hour', 'per_timeslot', 'per_day', 'per_night', 'per_booking'));
