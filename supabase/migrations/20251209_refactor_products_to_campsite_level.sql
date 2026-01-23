-- Migration: Refactor products from pitch-level to campsite-level
-- This migration moves products from pitch_products to campsite_products table
-- Products will now be managed at campsite level instead of individual pitches

-- 1. Create new campsite_products table
CREATE TABLE IF NOT EXISTS campsite_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campsite_id UUID NOT NULL REFERENCES campsites(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name JSONB NOT NULL DEFAULT '{"vi": "", "en": ""}'::jsonb,
  description JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  price DECIMAL(10,2) NOT NULL,
  unit JSONB DEFAULT '{"vi": "sản phẩm", "en": "item"}'::jsonb,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_type VARCHAR(50) DEFAULT 'inclusive',
  is_available BOOLEAN DEFAULT true,
  max_quantity INTEGER DEFAULT 10,
  requires_advance_booking BOOLEAN DEFAULT false,
  advance_hours INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campsite_products_campsite_id ON campsite_products(campsite_id);
CREATE INDEX IF NOT EXISTS idx_campsite_products_category_id ON campsite_products(category_id);
CREATE INDEX IF NOT EXISTS idx_campsite_products_is_available ON campsite_products(is_available);
CREATE INDEX IF NOT EXISTS idx_campsite_products_sort_order ON campsite_products(sort_order);

-- 3. Migrate data from pitch_products to campsite_products
-- Group by campsite and product name, take first occurrence
INSERT INTO campsite_products (
  campsite_id, category_id, name, description, price, unit,
  tax_rate, tax_type, is_available, max_quantity,
  requires_advance_booking, advance_hours, sort_order, created_at, updated_at
)
SELECT DISTINCT ON (p.campsite_id, pp.name)
  p.campsite_id,
  pp.category_id,
  pp.name,
  pp.description,
  pp.price,
  pp.unit,
  pp.tax_rate,
  pp.tax_type,
  pp.is_available,
  pp.max_quantity,
  pp.requires_advance_booking,
  pp.advance_hours,
  pp.sort_order,
  pp.created_at,
  pp.updated_at
FROM pitch_products pp
JOIN pitches p ON pp.pitch_id = p.id
ORDER BY p.campsite_id, pp.name, pp.created_at
ON CONFLICT DO NOTHING;

-- 4. Create temporary mapping table for ID migration
CREATE TEMP TABLE product_id_mapping AS
SELECT
  pp.id as old_id,
  cp.id as new_id
FROM pitch_products pp
JOIN pitches p ON pp.pitch_id = p.id
JOIN campsite_products cp ON cp.campsite_id = p.campsite_id AND cp.name = pp.name;

-- 5. Add campsite_product_id column to booking_products
ALTER TABLE booking_products
  ADD COLUMN IF NOT EXISTS campsite_product_id UUID REFERENCES campsite_products(id) ON DELETE SET NULL;

-- 6. Update booking_products to reference new table
UPDATE booking_products bp
SET campsite_product_id = m.new_id
FROM product_id_mapping m
WHERE bp.pitch_product_id = m.old_id
  AND bp.campsite_product_id IS NULL;

-- 7. Update discounts.applicable_products (JSONB array of UUIDs)
-- This updates the product UUIDs to point to new campsite_products IDs
UPDATE discounts d
SET applicable_products = (
  SELECT jsonb_agg(m.new_id)
  FROM jsonb_array_elements_text(d.applicable_products) AS old_product_id
  JOIN product_id_mapping m ON m.old_id::text = old_product_id
)
WHERE d.applicable_products IS NOT NULL
  AND jsonb_array_length(d.applicable_products) > 0;

-- 8. Create updated_at trigger for campsite_products
CREATE OR REPLACE FUNCTION update_campsite_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_campsite_products_updated_at ON campsite_products;
CREATE TRIGGER trigger_campsite_products_updated_at
  BEFORE UPDATE ON campsite_products
  FOR EACH ROW
  EXECUTE FUNCTION update_campsite_products_updated_at();

-- 9. Add comments for documentation
COMMENT ON TABLE campsite_products IS 'Products available at campsite level. All pitches in a campsite share the same products.';
COMMENT ON COLUMN campsite_products.campsite_id IS 'Foreign key to campsites table. Products belong to campsite, not individual pitches.';
COMMENT ON COLUMN campsite_products.name IS 'Multilingual product name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN campsite_products.description IS 'Multilingual product description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN campsite_products.unit IS 'Multilingual unit: {"vi": "sản phẩm", "en": "item"}';

-- NOTE: The following commands should be run AFTER verifying migration success
-- Uncomment after 1 week of production stability:
--
-- -- Drop old pitch_products table
-- DROP TABLE IF EXISTS pitch_products CASCADE;
--
-- -- Remove old column from booking_products
-- ALTER TABLE booking_products DROP COLUMN IF EXISTS pitch_product_id;
