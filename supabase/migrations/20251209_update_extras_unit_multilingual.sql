-- Migration: Update extras.unit to multilingual (JSONB)
-- Created: 2024-12-09
-- Description: Convert unit field from VARCHAR to JSONB for multilingual support

-- 1. Drop default value first
ALTER TABLE extras ALTER COLUMN unit DROP DEFAULT;

-- 2. Convert extras.unit from VARCHAR to JSONB
ALTER TABLE extras
ALTER COLUMN unit TYPE JSONB
USING jsonb_build_object('vi', COALESCE(unit, ''), 'en', COALESCE(unit, ''));

-- 3. Set new default value for JSONB
ALTER TABLE extras ALTER COLUMN unit SET DEFAULT '{"vi": "", "en": ""}'::jsonb;

-- 4. Add custom_unit column to pitch_extras for pitch-level override
ALTER TABLE pitch_extras
ADD COLUMN IF NOT EXISTS custom_unit JSONB DEFAULT NULL;

-- 5. Add comment
COMMENT ON COLUMN pitch_extras.custom_unit IS 'Pitch-specific unit override: {"vi": "...", "en": "..."}';
