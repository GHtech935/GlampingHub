-- Migration: Add constraint and documentation for campsite min_stay_nights
-- Date: 2026-01-12
-- Description: Enforce campsite-level min_stay_nights (1-10 range) and deprecate pricing_calendar.min_stay_nights

-- 1. Add CHECK constraint to campsites.min_stay_nights (range 1-10)
-- Drop constraint if exists to make migration idempotent
ALTER TABLE campsites
DROP CONSTRAINT IF EXISTS campsites_min_stay_nights_range;

ALTER TABLE campsites
ADD CONSTRAINT campsites_min_stay_nights_range
CHECK (min_stay_nights >= 1 AND min_stay_nights <= 10);

-- 2. Document deprecation of pricing_calendar.min_stay_nights
COMMENT ON COLUMN pricing_calendar.min_stay_nights IS
'DEPRECATED - Use campsites.min_stay_nights instead. No longer used in validation. This field is kept for backwards compatibility but will be ignored by the booking system.';

COMMENT ON COLUMN campsites.min_stay_nights IS
'Minimum consecutive nights required for booking (1-10). This is the authoritative source for minimum stay validation. Applied to all pitches within the campsite.';

-- 3. Validate and fix existing data to ensure it's within valid range
UPDATE campsites
SET min_stay_nights = GREATEST(1, LEAST(10, COALESCE(min_stay_nights, 1)))
WHERE min_stay_nights IS NULL OR min_stay_nights < 1 OR min_stay_nights > 10;

-- 4. Add index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_campsites_min_stay_nights
ON campsites(min_stay_nights)
WHERE min_stay_nights > 1;

-- 5. Log migration completion
-- This migration moves min_stay_nights validation from pricing_calendar (per-date) to campsites (site-wide)
-- Benefits: Simpler management, consistent rules, better UX
