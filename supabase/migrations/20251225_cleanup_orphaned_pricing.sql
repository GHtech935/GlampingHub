-- Cleanup orphaned pricing data for pitch types that no longer exist
-- This migration removes pricing records from pitch_type_prices
-- where the pitch_type is not in the current pitch_types table for that pitch

-- First, let's count how many orphaned records exist (for logging)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM pitch_type_prices ptp
  WHERE NOT EXISTS (
    SELECT 1 FROM pitch_types pt
    WHERE pt.pitch_id = ptp.pitch_id
    AND pt.type::text = ptp.pitch_type::text
  );

  RAISE NOTICE 'Found % orphaned pricing records to delete', orphan_count;
END $$;

-- Delete orphaned pricing data
DELETE FROM pitch_type_prices ptp
WHERE NOT EXISTS (
  SELECT 1 FROM pitch_types pt
  WHERE pt.pitch_id = ptp.pitch_id
  AND pt.type::text = ptp.pitch_type::text
);
