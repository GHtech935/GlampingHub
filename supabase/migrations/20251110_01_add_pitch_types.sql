-- Migration: Add Pitch Types System
-- Created: 2025-11-10
-- Description: Adds multi-select pitch type system (tent, campervan, motorhome, etc.)

-- Create pitch_type enum
CREATE TYPE pitch_type AS ENUM (
  'tent',
  'roof_tent',
  'trailer_tent',
  'campervan',
  'motorhome',
  'touring_caravan'
);

-- Create junction table for pitch-types (many-to-many)
CREATE TABLE pitch_types (
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  type pitch_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pitch_id, type)
);

-- Create indexes for better query performance
CREATE INDEX idx_pitch_types_pitch ON pitch_types(pitch_id);
CREATE INDEX idx_pitch_types_type ON pitch_types(type);

-- Add comment
COMMENT ON TABLE pitch_types IS 'Junction table for pitch-type relationships. A pitch can have multiple types (tent, campervan, etc.)';
COMMENT ON TYPE pitch_type IS 'Available pitch types for multi-select assignment';
