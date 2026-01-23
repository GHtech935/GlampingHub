-- =====================================================
-- Migration: Add Ground Type Templates System
-- Date: 2025-11-16
-- Description:
--   - Create ground_type_templates table for managing ground types
--   - Create pitch_ground_types junction table (many-to-many)
--   - Seed common ground types
-- =====================================================

-- Create ground_type_templates table
CREATE TABLE IF NOT EXISTS ground_type_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,              -- {"vi": "Cỏ", "en": "Grass"}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE ground_type_templates IS 'Templates for ground types (grass, soil, rock, etc.)';
COMMENT ON COLUMN ground_type_templates.name IS 'Multilingual ground type name: {"vi": "...", "en": "..."}';

-- Create junction table for pitch-to-ground-type relationship (many-to-many)
CREATE TABLE IF NOT EXISTS pitch_ground_types (
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  ground_type_id UUID NOT NULL REFERENCES ground_type_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pitch_id, ground_type_id)
);

-- Add comments
COMMENT ON TABLE pitch_ground_types IS 'Junction table linking pitches to ground type templates';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pitch_ground_types_pitch_id ON pitch_ground_types(pitch_id);
CREATE INDEX IF NOT EXISTS idx_pitch_ground_types_ground_type_id ON pitch_ground_types(ground_type_id);
CREATE INDEX IF NOT EXISTS idx_ground_type_templates_active ON ground_type_templates(is_active) WHERE is_active = true;

-- Seed common ground types
INSERT INTO ground_type_templates (name, is_active, sort_order) VALUES
  ('{"vi": "Cỏ", "en": "Grass"}'::jsonb, true, 1),
  ('{"vi": "Đất", "en": "Soil"}'::jsonb, true, 2),
  ('{"vi": "Đá/Sỏi", "en": "Rock/Gravel"}'::jsonb, true, 3),
  ('{"vi": "Bê tông/Nền cứng", "en": "Concrete/Hardstanding"}'::jsonb, true, 4),
  ('{"vi": "Hỗn hợp", "en": "Mixed"}'::jsonb, true, 5),
  ('{"vi": "Cát", "en": "Sand"}'::jsonb, true, 6),
  ('{"vi": "Gỗ/Sàn gỗ", "en": "Wood/Decking"}'::jsonb, true, 7)
ON CONFLICT DO NOTHING;

-- Optional: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ground_type_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ground_type_templates_updated_at
  BEFORE UPDATE ON ground_type_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_ground_type_templates_updated_at();

-- =====================================================
-- Note: The existing pitches.ground_type column (JSONB) is kept for backward compatibility
-- New pitches should use the pitch_ground_types junction table instead
-- =====================================================
