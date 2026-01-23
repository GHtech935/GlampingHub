-- Migration: Remove Extras System Completely
-- Date: 2025-12-11
-- Description: Drops extras and pitch_extras tables, removes all extras from booking_products
-- Author: Generated with Claude Code

-- =============================================================================
-- STEP 1: Delete all extras records from booking_products table
-- =============================================================================

-- IMPORTANT: This deletes ALL extras from ALL bookings (including historical)
-- Use TWO conditions to ensure we only delete extras, not products:
-- 1. product_category = 'extra'
-- 2. campsite_product_id IS NULL

DO $$
BEGIN
  -- Only delete if booking_products table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_products') THEN
    DELETE FROM booking_products
    WHERE product_category = 'extra'
      AND campsite_product_id IS NULL;

    RAISE NOTICE 'Deleted extras from booking_products';
  ELSE
    RAISE NOTICE 'booking_products table does not exist, skipping deletion';
  END IF;

  -- Add comment if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_products') THEN
    COMMENT ON TABLE booking_products IS 'All extras records have been permanently deleted (2025-12-11)';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Drop indexes related to pitch_extras and extras
-- =============================================================================

-- pitch_extras indexes
DROP INDEX IF EXISTS idx_pitch_extras_pitch;
DROP INDEX IF EXISTS idx_pitch_extras_extra;
DROP INDEX IF EXISTS idx_pitch_extras_available;
DROP INDEX IF EXISTS idx_pitch_extras_sort;

-- extras indexes
DROP INDEX IF EXISTS idx_extras_active;
DROP INDEX IF EXISTS idx_extras_category;
DROP INDEX IF EXISTS idx_extras_sort;

-- =============================================================================
-- STEP 3: Drop triggers related to extras
-- =============================================================================

-- Drop trigger only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extras') THEN
    DROP TRIGGER IF EXISTS trigger_update_extras_updated_at ON extras;
    RAISE NOTICE 'Dropped trigger on extras table';
  ELSE
    RAISE NOTICE 'extras table does not exist, skipping trigger drop';
  END IF;
END $$;

DROP FUNCTION IF EXISTS update_extras_updated_at();

-- =============================================================================
-- STEP 4: Clean up RLS policies (BEFORE dropping tables!)
-- =============================================================================

-- Drop policies only if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extras') THEN
    DROP POLICY IF EXISTS "Public can view active extras" ON extras;
    DROP POLICY IF EXISTS "Staff can manage extras" ON extras;
    RAISE NOTICE 'Dropped policies on extras table';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pitch_extras') THEN
    DROP POLICY IF EXISTS "Public can view available pitch extras" ON pitch_extras;
    DROP POLICY IF EXISTS "Staff can manage pitch extras" ON pitch_extras;
    RAISE NOTICE 'Dropped policies on pitch_extras table';
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Drop pitch_extras table (CASCADE to handle foreign keys)
-- =============================================================================

DROP TABLE IF EXISTS pitch_extras CASCADE;

-- =============================================================================
-- STEP 6: Drop extras table (CASCADE to handle foreign keys)
-- =============================================================================

DROP TABLE IF EXISTS extras CASCADE;

-- =============================================================================
-- Verification
-- =============================================================================

-- Verify tables are dropped
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extras') THEN
    RAISE EXCEPTION 'extras table still exists!';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pitch_extras') THEN
    RAISE EXCEPTION 'pitch_extras table still exists!';
  END IF;
  RAISE NOTICE 'Extras system successfully removed from database';
END $$;
