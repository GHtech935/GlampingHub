-- Migration: Add Extras System (2-tier: Global Catalog + Pitch-Specific)
-- Created: 2025-11-10
-- Description: Adds extras system with global catalog and pitch-specific customization

-- Create global extras catalog table
CREATE TABLE extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Extra name (multilingual)
  -- Example: {"vi": "Mang mái hiên (tối đa 1)", "en": "Bring an awning (1 max)"}
  name JSONB NOT NULL,

  -- Default description (multilingual)
  -- Example: {"vi": "Mái hiên cắm trại tiêu chuẩn", "en": "Standard camping awning"}
  default_description JSONB,

  -- Default pricing
  default_price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'per night',

  -- Category for organization
  category VARCHAR(100),

  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_name_not_empty CHECK (jsonb_typeof(name) = 'object'),
  CONSTRAINT chk_default_price_positive CHECK (default_price >= 0)
);

-- Create pitch-specific extras table (junction with customization)
CREATE TABLE pitch_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES extras(id) ON DELETE CASCADE,

  -- Custom description for this specific pitch (multilingual)
  -- Overrides default_description from extras table
  -- Example: {"vi": "Mái hiên phải nhỏ hơn 3m x 3m", "en": "Awning must be smaller than 3m x 3m"}
  custom_description JSONB,

  -- Override price if different from default
  custom_price DECIMAL(10,2),

  max_quantity INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(pitch_id, extra_id),
  CONSTRAINT chk_custom_price_positive CHECK (custom_price IS NULL OR custom_price >= 0),
  CONSTRAINT chk_max_quantity_positive CHECK (max_quantity >= 1)
);

-- Create indexes
CREATE INDEX idx_extras_active ON extras(is_active);
CREATE INDEX idx_extras_category ON extras(category);
CREATE INDEX idx_extras_sort ON extras(sort_order);

CREATE INDEX idx_pitch_extras_pitch ON pitch_extras(pitch_id);
CREATE INDEX idx_pitch_extras_extra ON pitch_extras(extra_id);
CREATE INDEX idx_pitch_extras_available ON pitch_extras(pitch_id, is_available);
CREATE INDEX idx_pitch_extras_sort ON pitch_extras(pitch_id, sort_order);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_extras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_extras_updated_at
  BEFORE UPDATE ON extras
  FOR EACH ROW
  EXECUTE FUNCTION update_extras_updated_at();

-- Add comments
COMMENT ON TABLE extras IS 'Global catalog of extras available for pitches (awnings, dogs, extra cars, etc.)';
COMMENT ON COLUMN extras.name IS 'Multilingual extra name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN extras.default_description IS 'Default multilingual description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN extras.default_price IS 'Default price for this extra';
COMMENT ON COLUMN extras.unit IS 'Pricing unit (e.g., "per night", "per stay", "per item")';

COMMENT ON TABLE pitch_extras IS 'Links pitches to extras with pitch-specific customization';
COMMENT ON COLUMN pitch_extras.custom_description IS 'Pitch-specific description override: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_extras.custom_price IS 'Pitch-specific price override (NULL = use default)';
COMMENT ON COLUMN pitch_extras.max_quantity IS 'Maximum quantity bookable (must be >= 1)';
