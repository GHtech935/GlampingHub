-- Create tables for managing pitch templates (features, restrictions)
-- These templates will be used in dropdowns when creating pitches

-- ==============================================
-- FEATURE TEMPLATES
-- ==============================================

CREATE TABLE feature_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,              -- Multilingual: {"vi": "...", "en": "..."}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_templates_active ON feature_templates(is_active);
CREATE INDEX idx_feature_templates_sort ON feature_templates(sort_order);

-- Comments
COMMENT ON TABLE feature_templates IS 'Global catalog of feature templates for pitch creation';
COMMENT ON COLUMN feature_templates.name IS 'Multilingual name: {"vi": "Điện 10 amp", "en": "Electric: 10 amp"}';

-- ==============================================
-- RESTRICTION TEMPLATES
-- ==============================================

CREATE TABLE restriction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restriction JSONB NOT NULL,       -- Multilingual: {"vi": "...", "en": "..."}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_restriction_templates_active ON restriction_templates(is_active);
CREATE INDEX idx_restriction_templates_sort ON restriction_templates(sort_order);

-- Comments
COMMENT ON TABLE restriction_templates IS 'Global catalog of restriction templates for pitch creation';
COMMENT ON COLUMN restriction_templates.restriction IS 'Multilingual restriction: {"vi": "Không được dùng mái hiên", "en": "Awnings not allowed"}';

-- ==============================================
-- SEED DATA - Migrate existing hardcoded features
-- ==============================================

INSERT INTO feature_templates (name, is_active, sort_order) VALUES
  ('{"vi": "Điện 10 amp", "en": "Electric: 10 amp"}'::jsonb, true, 1),
  ('{"vi": "Điện 16 amp", "en": "Electric: 16 amp"}'::jsonb, true, 2),
  ('{"vi": "Chỗ đậu xe", "en": "Car parking"}'::jsonb, true, 3),
  ('{"vi": "Chó được phép", "en": "Dog(s) allowed"}'::jsonb, true, 4),
  ('{"vi": "Kết nối nước", "en": "Water hookup"}'::jsonb, true, 5),
  ('{"vi": "Xử lý rác thải", "en": "Waste disposal"}'::jsonb, true, 6);

-- Sample restriction templates
INSERT INTO restriction_templates (restriction, is_active, sort_order) VALUES
  ('{"vi": "Không được phép dùng mái hiên", "en": "Awnings not allowed"}'::jsonb, true, 1),
  ('{"vi": "Không được đốt lửa trại", "en": "No campfires"}'::jsonb, true, 2),
  ('{"vi": "Không được mang thú cưng", "en": "No pets allowed"}'::jsonb, true, 3),
  ('{"vi": "Giờ yên tĩnh: 22:00 - 07:00", "en": "Quiet hours: 10 PM - 7 AM"}'::jsonb, true, 4);
