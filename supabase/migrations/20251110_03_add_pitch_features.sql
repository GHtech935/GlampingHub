-- Migration: Add Pitch Features System
-- Created: 2025-11-10
-- Description: Adds features system (electric, parking, pets, etc.) with multilingual support

-- Drop old pitch_features table if exists (from old schema)
DROP TABLE IF EXISTS pitch_features CASCADE;

-- Drop and recreate feature_category enum
DROP TYPE IF EXISTS feature_category CASCADE;
CREATE TYPE feature_category AS ENUM (
  'electric',     -- Electricity hookup
  'parking',      -- Car/vehicle parking
  'pets',         -- Pet allowance
  'water',        -- Water hookup
  'waste',        -- Waste disposal
  'amenities',    -- Other amenities
  'custom'        -- Custom/user-defined features
);

-- Create pitch_features table
CREATE TABLE pitch_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  category feature_category NOT NULL,

  -- Feature name/label (multilingual)
  -- Example: {"vi": "Điện 10 amp", "en": "Electric: 10 amp"}
  name JSONB NOT NULL,

  -- Description/details (multilingual)
  -- Example: {"vi": "Điện được bao gồm", "en": "Electricity included"}
  description JSONB,

  -- Value/specification (multilingual)
  -- Example: {"vi": "2 bao gồm, 2 tối đa", "en": "2 included, 2 max"}
  value JSONB,

  -- For pre-defined features
  is_included BOOLEAN DEFAULT true,
  max_allowed INTEGER,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_name_not_empty CHECK (jsonb_typeof(name) = 'object'),
  CONSTRAINT chk_max_allowed_positive CHECK (max_allowed IS NULL OR max_allowed >= 0)
);

-- Create indexes
CREATE INDEX idx_pitch_features_pitch ON pitch_features(pitch_id);
CREATE INDEX idx_pitch_features_category ON pitch_features(category);
CREATE INDEX idx_pitch_features_sort ON pitch_features(pitch_id, sort_order);

-- Add comments
COMMENT ON TABLE pitch_features IS 'Features available for each pitch (electric, parking, pets, etc.)';
COMMENT ON COLUMN pitch_features.name IS 'Multilingual feature name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_features.description IS 'Multilingual feature description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_features.value IS 'Multilingual feature value/specification: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_features.is_included IS 'Whether this feature is included (shown as checked) or additional cost';
COMMENT ON COLUMN pitch_features.max_allowed IS 'Maximum quantity allowed (e.g., 2 dogs max)';
COMMENT ON TYPE feature_category IS 'Categories of pitch features for organization and filtering';
