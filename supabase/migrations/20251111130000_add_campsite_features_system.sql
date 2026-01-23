-- Campsite Features System Migration
-- Creates tables for campsite-level features with categories and multilingual support

-- 1. Create campsite_feature_categories table
CREATE TABLE IF NOT EXISTS campsite_feature_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,  -- {"vi": "Tiện nghi", "en": "Amenities"}
  slug VARCHAR(100) UNIQUE NOT NULL,  -- for URL-friendly reference
  icon VARCHAR(50),  -- optional icon name (e.g., 'wifi', 'parking')
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create campsite_feature_templates table
CREATE TABLE IF NOT EXISTS campsite_feature_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES campsite_feature_categories(id) ON DELETE CASCADE,
  name JSONB NOT NULL,  -- {"vi": "Wifi miễn phí", "en": "Free wifi"}
  description JSONB,  -- optional detailed description
  icon VARCHAR(50),  -- optional icon name
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create campsite_features junction table (many-to-many: campsite <-> features)
CREATE TABLE IF NOT EXISTS campsite_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,
  feature_template_id UUID REFERENCES campsite_feature_templates(id) ON DELETE CASCADE,

  -- For custom features (when feature_template_id is NULL)
  custom_name JSONB,  -- {"vi": "Tính năng tùy chỉnh", "en": "Custom feature"}
  custom_category_id UUID REFERENCES campsite_feature_categories(id) ON DELETE SET NULL,

  -- Common fields
  is_available BOOLEAN DEFAULT true,  -- whether this feature is available at this campsite
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique feature per campsite (either template or custom)
  UNIQUE(campsite_id, feature_template_id)
);

-- Create indexes for performance
CREATE INDEX idx_campsite_feature_templates_category ON campsite_feature_templates(category_id);
CREATE INDEX idx_campsite_features_campsite ON campsite_features(campsite_id);
CREATE INDEX idx_campsite_features_template ON campsite_features(feature_template_id);
CREATE INDEX idx_campsite_features_custom_category ON campsite_features(custom_category_id);

-- Add comments for documentation
COMMENT ON TABLE campsite_feature_categories IS 'Categories for organizing campsite features (e.g., Leisure, Amenities, Rules)';
COMMENT ON TABLE campsite_feature_templates IS 'Predefined feature templates that can be reused across campsites';
COMMENT ON TABLE campsite_features IS 'Junction table linking campsites to features (template or custom)';
COMMENT ON COLUMN campsite_features.is_available IS 'Whether this feature is available (true=check icon, false=cancel icon)';
