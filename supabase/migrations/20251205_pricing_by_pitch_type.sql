-- ============================================================================
-- Migration: Add Pricing by Pitch Type
-- Date: 2025-12-05
-- Description: Allow different prices for each pitch type (tent, campervan, etc.)
--              Each pitch can have multiple types with different prices per night.
-- ============================================================================

-- ============================================================================
-- PART 1: Add pitch_type column to pricing_calendar
-- ============================================================================

-- Step 1.1: Add pitch_type column (nullable initially for migration)
ALTER TABLE pricing_calendar
ADD COLUMN IF NOT EXISTS pitch_type pitch_type NULL;

-- Step 1.2: Create temporary index for migration performance
CREATE INDEX IF NOT EXISTS idx_pricing_calendar_migration_temp
ON pricing_calendar(pitch_id) WHERE pitch_type IS NULL;

-- ============================================================================
-- PART 2: Migrate existing pricing data
-- Duplicate each existing record for each pitch type the pitch supports
-- ============================================================================

-- Step 2.1: Insert new records with pitch_type for each pitch's types
INSERT INTO pricing_calendar (
  pitch_id,
  date,
  pitch_type,
  price_per_night,
  min_stay_nights,
  price_type,
  notes,
  created_at,
  updated_at,
  extra_person_child_price,
  extra_person_adult_price,
  max_stay_nights,
  min_advance_days,
  max_advance_days
)
SELECT
  pc.pitch_id,
  pc.date,
  pt.type as pitch_type,
  pc.price_per_night,
  pc.min_stay_nights,
  pc.price_type,
  pc.notes,
  pc.created_at,
  NOW() as updated_at,
  pc.extra_person_child_price,
  pc.extra_person_adult_price,
  pc.max_stay_nights,
  pc.min_advance_days,
  pc.max_advance_days
FROM pricing_calendar pc
JOIN pitch_types pt ON pt.pitch_id = pc.pitch_id
WHERE pc.pitch_type IS NULL
ON CONFLICT DO NOTHING;

-- Step 2.2: Delete old records that don't have pitch_type (after migration)
DELETE FROM pricing_calendar WHERE pitch_type IS NULL;

-- Step 2.3: Drop the temporary migration index
DROP INDEX IF EXISTS idx_pricing_calendar_migration_temp;

-- ============================================================================
-- PART 3: Update primary key to include pitch_type
-- ============================================================================

-- Step 3.1: Drop existing primary key constraint
ALTER TABLE pricing_calendar DROP CONSTRAINT IF EXISTS pricing_calendar_pkey;

-- Step 3.2: Make pitch_type NOT NULL (now that all records have a value)
ALTER TABLE pricing_calendar ALTER COLUMN pitch_type SET NOT NULL;

-- Step 3.3: Create new composite primary key
ALTER TABLE pricing_calendar
ADD CONSTRAINT pricing_calendar_pkey PRIMARY KEY (pitch_id, date, pitch_type);

-- Step 3.4: Update indexes for the new structure
DROP INDEX IF EXISTS idx_pricing_calendar_date_range;
DROP INDEX IF EXISTS idx_pricing_calendar_pitch_date;

CREATE INDEX idx_pricing_calendar_pitch_type
ON pricing_calendar(pitch_id, pitch_type, date);

CREATE INDEX idx_pricing_calendar_date_range
ON pricing_calendar(pitch_id, date);

-- ============================================================================
-- PART 4: Add selected_pitch_types to bookings table
-- ============================================================================

-- Step 4.1: Add selected_pitch_types column to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS selected_pitch_types JSONB DEFAULT '[]'::jsonb;

-- Step 4.2: Add constraint to ensure it's always an array
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS chk_selected_pitch_types_array;

ALTER TABLE bookings
ADD CONSTRAINT chk_selected_pitch_types_array
CHECK (jsonb_typeof(selected_pitch_types) = 'array');

-- Step 4.3: Add comment for documentation
COMMENT ON COLUMN bookings.selected_pitch_types IS
'Array of selected pitch types for this booking, e.g. ["tent", "campervan"]. Empty array for legacy bookings.';

-- ============================================================================
-- PART 5: Add pitch_type to pricing_history table
-- ============================================================================

-- Step 5.1: Add pitch_type column to pricing_history
ALTER TABLE pricing_history
ADD COLUMN IF NOT EXISTS pitch_type pitch_type NULL;

-- Step 5.2: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_pricing_history_pitch_type
ON pricing_history(pitch_id, pitch_type, date);

-- Step 5.3: Add comment
COMMENT ON COLUMN pricing_history.pitch_type IS
'The pitch type this pricing history entry is for (tent, campervan, etc.)';

-- ============================================================================
-- PART 6: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN pricing_calendar.pitch_type IS
'The pitch type this pricing is for (tent, roof_tent, trailer_tent, campervan, motorhome, touring_caravan)';

-- ============================================================================
-- End of migration
-- ============================================================================
