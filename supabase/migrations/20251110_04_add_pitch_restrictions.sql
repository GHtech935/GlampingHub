-- Migration: Add Pitch Restrictions System
-- Created: 2025-11-10
-- Description: Adds restrictions system (awnings not allowed, gazebos not allowed, etc.)

-- Create pitch_restrictions table
CREATE TABLE pitch_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,

  -- Restriction text (multilingual)
  -- Example: {"vi": "Không được dùng mái hiên", "en": "Awnings not allowed"}
  restriction JSONB NOT NULL,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_restriction_not_empty CHECK (jsonb_typeof(restriction) = 'object')
);

-- Create indexes
CREATE INDEX idx_pitch_restrictions_pitch ON pitch_restrictions(pitch_id);
CREATE INDEX idx_pitch_restrictions_sort ON pitch_restrictions(pitch_id, sort_order);

-- Add comments
COMMENT ON TABLE pitch_restrictions IS 'Restrictions for each pitch (e.g., no awnings, no gazebos)';
COMMENT ON COLUMN pitch_restrictions.restriction IS 'Multilingual restriction text: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_restrictions.sort_order IS 'Display order of restrictions';
