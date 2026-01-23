-- Migration: Convert Product Fields to Multilingual JSONB
-- Description: Convert name, description, unit from VARCHAR/TEXT to JSONB for i18n support

-- Convert name from VARCHAR to JSONB
-- Keep existing data by converting "Product Name" to {"vi": "Product Name", "en": "Product Name"}
ALTER TABLE pitch_products
ALTER COLUMN name TYPE JSONB
USING jsonb_build_object('vi', name, 'en', name);

-- Convert description from TEXT to JSONB
ALTER TABLE pitch_products
ALTER COLUMN description TYPE JSONB
USING CASE
  WHEN description IS NOT NULL AND description != ''
  THEN jsonb_build_object('vi', description, 'en', description)
  ELSE NULL
END;

-- Convert unit from VARCHAR to JSONB
-- First drop existing default, then convert type, then set new default
ALTER TABLE pitch_products ALTER COLUMN unit DROP DEFAULT;
ALTER TABLE pitch_products
ALTER COLUMN unit TYPE JSONB
USING jsonb_build_object('vi', COALESCE(unit, 'sản phẩm'), 'en', COALESCE(unit, 'item'));

-- Update default for unit column
ALTER TABLE pitch_products
ALTER COLUMN unit SET DEFAULT '{"vi": "sản phẩm", "en": "item"}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN pitch_products.name IS 'Product name in JSONB format: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_products.description IS 'Product description in JSONB format: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_products.unit IS 'Unit of measurement in JSONB format: {"vi": "...", "en": "..."}';
