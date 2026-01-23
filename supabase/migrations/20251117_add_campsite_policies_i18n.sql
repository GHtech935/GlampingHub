-- Migration: Add Multilingual Support to Campsite Policies
-- Created: 2025-11-17
-- Description: Converts TEXT fields to JSONB for multilingual support (vi/en) for cancellation_policy and house_rules

-- Step 1: Add new JSONB columns (keep old columns temporarily)
ALTER TABLE campsites
  ADD COLUMN cancellation_policy_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN house_rules_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb;

-- Step 2: Migrate existing data to new JSONB columns
-- Copy existing cancellation_policy to Vietnamese locale
UPDATE campsites
SET cancellation_policy_i18n = jsonb_build_object('vi', COALESCE(cancellation_policy, ''), 'en', '')
WHERE cancellation_policy IS NOT NULL OR cancellation_policy IS NULL;

-- Copy existing house_rules to Vietnamese locale
UPDATE campsites
SET house_rules_i18n = jsonb_build_object('vi', COALESCE(house_rules, ''), 'en', '')
WHERE house_rules IS NOT NULL OR house_rules IS NULL;

-- Step 3: Drop old columns
ALTER TABLE campsites
  DROP COLUMN cancellation_policy,
  DROP COLUMN house_rules;

-- Step 4: Rename new columns to original names
ALTER TABLE campsites
  RENAME COLUMN cancellation_policy_i18n TO cancellation_policy;

ALTER TABLE campsites
  RENAME COLUMN house_rules_i18n TO house_rules;

-- Add comments
COMMENT ON COLUMN campsites.cancellation_policy IS 'Multilingual cancellation policy (rich text HTML): {"vi": "...", "en": "..."}';
COMMENT ON COLUMN campsites.house_rules IS 'Multilingual house rules (rich text HTML): {"vi": "...", "en": "..."}';
