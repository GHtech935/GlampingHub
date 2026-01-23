-- Add value and warning fields to feature_templates table
-- These fields store default multilingual content for when admin creates feature templates

ALTER TABLE feature_templates
  ADD COLUMN IF NOT EXISTS value JSONB,
  ADD COLUMN IF NOT EXISTS warning JSONB;

-- Comments
COMMENT ON COLUMN feature_templates.value IS 'Multilingual default value: {"vi": "Đã có 2, Tối đa 3", "en": "Included: 2, Max: 3"}';
COMMENT ON COLUMN feature_templates.warning IS 'Multilingual default warning: {"vi": "Cảnh báo...", "en": "Warning..."}';
