-- Migration: Add Multilingual Support to Pitches
-- Created: 2025-11-10
-- Description: Converts VARCHAR/TEXT fields to JSONB for multilingual support (vi/en)

-- Step 1: Add new JSONB columns (keep old columns temporarily)
ALTER TABLE pitches
  ADD COLUMN name_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN description_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN pitch_size JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN ground_type_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN suitable_for JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb;

-- Step 2: Migrate existing data to new JSONB columns
-- Copy existing name to Vietnamese locale
UPDATE pitches
SET name_i18n = jsonb_build_object('vi', name, 'en', name)
WHERE name IS NOT NULL;

-- Copy existing description to Vietnamese locale
UPDATE pitches
SET description_i18n = jsonb_build_object('vi', COALESCE(description, ''), 'en', COALESCE(description, ''))
WHERE description IS NOT NULL OR description IS NULL;

-- Copy existing ground_type to Vietnamese locale
UPDATE pitches
SET ground_type_i18n = jsonb_build_object(
  'vi',
  CASE ground_type
    WHEN 'grass' THEN 'Cỏ'
    WHEN 'gravel' THEN 'Sỏi'
    WHEN 'hardstanding' THEN 'Bê tông'
    WHEN 'mixed' THEN 'Hỗn hợp'
    ELSE COALESCE(ground_type, '')
  END,
  'en',
  CASE ground_type
    WHEN 'grass' THEN 'Grass'
    WHEN 'gravel' THEN 'Gravel'
    WHEN 'hardstanding' THEN 'Hardstanding'
    WHEN 'mixed' THEN 'Mixed'
    ELSE COALESCE(ground_type, '')
  END
)
WHERE ground_type IS NOT NULL OR ground_type IS NULL;

-- Step 3: Drop old columns
ALTER TABLE pitches
  DROP COLUMN name,
  DROP COLUMN description,
  DROP COLUMN ground_type;

-- Step 4: Rename new columns to original names
ALTER TABLE pitches
  RENAME COLUMN name_i18n TO name;

ALTER TABLE pitches
  RENAME COLUMN description_i18n TO description;

ALTER TABLE pitches
  RENAME COLUMN ground_type_i18n TO ground_type;

-- Step 5: Add NOT NULL constraint to name (required field)
ALTER TABLE pitches
  ALTER COLUMN name SET NOT NULL;

-- Add comments
COMMENT ON COLUMN pitches.name IS 'Multilingual pitch name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitches.description IS 'Multilingual pitch description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitches.pitch_size IS 'Multilingual pitch size description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitches.ground_type IS 'Multilingual ground type: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitches.suitable_for IS 'Multilingual suitable for description: {"vi": "...", "en": "..."}';
