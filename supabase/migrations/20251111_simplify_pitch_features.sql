-- Simplify pitch_features table
-- Remove: category, description, is_included, max_allowed
-- Add: warning (JSONB)

-- Step 1: Drop the feature_category enum type
DROP TYPE IF EXISTS feature_category CASCADE;

-- Step 2: Alter pitch_features table
ALTER TABLE pitch_features
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS is_included,
  DROP COLUMN IF EXISTS max_allowed;

-- Step 3: Add warning column (JSONB for multilingual support)
ALTER TABLE pitch_features
  ADD COLUMN IF NOT EXISTS warning JSONB;

-- Step 4: Add comment to describe the structure
COMMENT ON COLUMN pitch_features.name IS 'Multilingual name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_features.value IS 'Multilingual value/quantity: {"vi": "2 bao gồm, 2 tối đa", "en": "2 included, 2 max"}';
COMMENT ON COLUMN pitch_features.warning IS 'Multilingual warning: {"vi": "...", "en": "..."}';
