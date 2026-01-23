-- Migration: Remove Regions System, Add City/Province to Campsites
-- Date: 2025-11-10
-- Description: This migration removes the regions table and adds city/province fields to campsites

-- ==========================================
-- STEP 1: Add new location fields to campsites
-- ==========================================

ALTER TABLE campsites
ADD COLUMN IF NOT EXISTS city VARCHAR(255),
ADD COLUMN IF NOT EXISTS province VARCHAR(255);

COMMENT ON COLUMN campsites.city IS 'City name (e.g., "Đà Lạt", "Hà Nội")';
COMMENT ON COLUMN campsites.province IS 'Province name (e.g., "Lâm Đồng", "Hà Nội")';

-- ==========================================
-- STEP 2: Create indexes for city-based searches
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_campsites_city ON campsites(city, is_active);
CREATE INDEX IF NOT EXISTS idx_campsites_province ON campsites(province, is_active);

-- ==========================================
-- STEP 3: Enable PostGIS extensions for GPS proximity
-- ==========================================

CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

COMMENT ON EXTENSION cube IS 'Used for earthdistance calculations';
COMMENT ON EXTENSION earthdistance IS 'Calculate great-circle distances on Earth surface';

-- ==========================================
-- STEP 4: Remove region foreign key constraint
-- ==========================================

ALTER TABLE campsites
DROP CONSTRAINT IF EXISTS campsites_region_id_fkey;

-- ==========================================
-- STEP 5: Drop region_id column from campsites
-- ==========================================

ALTER TABLE campsites
DROP COLUMN IF EXISTS region_id;

-- ==========================================
-- STEP 6: Drop old region index
-- ==========================================

DROP INDEX IF EXISTS idx_campsites_region;

-- ==========================================
-- STEP 7: Drop regions table
-- ==========================================

DROP TABLE IF EXISTS regions CASCADE;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify campsites table structure
DO $$
BEGIN
  -- Check if city and province columns exist
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'campsites'
    AND column_name IN ('city', 'province')
  ) THEN
    RAISE NOTICE '✅ City and province columns added successfully';
  ELSE
    RAISE WARNING '❌ City and province columns not found';
  END IF;

  -- Check if region_id column removed
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'campsites'
    AND column_name = 'region_id'
  ) THEN
    RAISE NOTICE '✅ region_id column removed successfully';
  ELSE
    RAISE WARNING '❌ region_id column still exists';
  END IF;

  -- Check if regions table removed
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'regions'
  ) THEN
    RAISE NOTICE '✅ regions table removed successfully';
  ELSE
    RAISE WARNING '❌ regions table still exists';
  END IF;

  -- Check if extensions enabled
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname IN ('cube', 'earthdistance')
  ) THEN
    RAISE NOTICE '✅ PostGIS extensions enabled';
  ELSE
    RAISE WARNING '❌ PostGIS extensions not enabled';
  END IF;
END $$;

-- ==========================================
-- SAMPLE DATA UPDATE (Optional)
-- ==========================================

-- Update existing campsites with city/province if they have addresses
-- This is a manual step that should be done based on actual data

-- Example for existing campsites:
-- UPDATE campsites SET city = 'Đà Lạt', province = 'Lâm Đồng' WHERE slug = 'thong-vi-vu';
-- UPDATE campsites SET city = 'Sapa', province = 'Lào Cai' WHERE slug = 'sapa-mountain-view';
-- UPDATE campsites SET city = 'Phú Quốc', province = 'Kiên Giang' WHERE slug = 'phu-quoc-beach';

-- Migration completion notice
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'NOTE: Please manually update city/province for existing campsites';
  RAISE NOTICE '==========================================';
END $$;
