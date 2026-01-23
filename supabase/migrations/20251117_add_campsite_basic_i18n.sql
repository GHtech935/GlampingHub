-- Migration: Add Multilingual Support to Campsite Basic Info
-- Created: 2025-11-17
-- Description: Converts TEXT fields to JSONB for multilingual support (vi/en) for name, description, and short_description

-- Step 1: Add new JSONB columns (keep old columns temporarily)
ALTER TABLE campsites
  ADD COLUMN name_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN description_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN short_description_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb;

-- Step 2: Migrate existing data to new JSONB columns
-- Copy existing name to Vietnamese locale
UPDATE campsites
SET name_i18n = jsonb_build_object('vi', COALESCE(name, ''), 'en', '')
WHERE name IS NOT NULL OR name IS NULL;

-- Copy existing description to Vietnamese locale
UPDATE campsites
SET description_i18n = jsonb_build_object('vi', COALESCE(description, ''), 'en', '')
WHERE description IS NOT NULL OR description IS NULL;

-- Copy existing short_description to Vietnamese locale
UPDATE campsites
SET short_description_i18n = jsonb_build_object('vi', COALESCE(short_description, ''), 'en', '')
WHERE short_description IS NOT NULL OR short_description IS NULL;

-- Step 3: Drop old columns
ALTER TABLE campsites
  DROP COLUMN name,
  DROP COLUMN description,
  DROP COLUMN short_description;

-- Step 4: Rename new columns to original names
ALTER TABLE campsites
  RENAME COLUMN name_i18n TO name;

ALTER TABLE campsites
  RENAME COLUMN description_i18n TO description;

ALTER TABLE campsites
  RENAME COLUMN short_description_i18n TO short_description;

-- Add comments
COMMENT ON COLUMN campsites.name IS 'Multilingual campsite name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN campsites.description IS 'Multilingual full description (rich text HTML): {"vi": "...", "en": "..."}';
COMMENT ON COLUMN campsites.short_description IS 'Multilingual short description: {"vi": "...", "en": "..."}';
