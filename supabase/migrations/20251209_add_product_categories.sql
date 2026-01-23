-- Migration: Add Product Categories System
-- Description: Create product_categories table and add category_id to pitch_products

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,              -- {vi: "Đồ ăn", en: "Food"}
  description JSONB,                -- {vi: "...", en: "..."}
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id to pitch_products
ALTER TABLE pitch_products
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pitch_products_category_id ON pitch_products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON product_categories(sort_order);

-- Note: RLS is not enabled for this table
-- Authentication and authorization are handled at the API level
-- The API routes check admin/staff permissions before allowing modifications

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_categories_updated_at ON product_categories;
CREATE TRIGGER trigger_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_product_categories_updated_at();

-- Insert some default categories
INSERT INTO product_categories (name, description, sort_order) VALUES
  ('{"vi": "Đồ ăn", "en": "Food"}', '{"vi": "Các món ăn và thức ăn", "en": "Food items and meals"}', 1),
  ('{"vi": "Đồ uống", "en": "Beverages"}', '{"vi": "Nước uống và thức uống", "en": "Drinks and beverages"}', 2),
  ('{"vi": "Dịch vụ", "en": "Services"}', '{"vi": "Các dịch vụ bổ sung", "en": "Additional services"}', 3),
  ('{"vi": "Cho thuê", "en": "Rentals"}', '{"vi": "Thiết bị và vật dụng cho thuê", "en": "Equipment and item rentals"}', 4),
  ('{"vi": "Khác", "en": "Others"}', '{"vi": "Các sản phẩm khác", "en": "Other products"}', 5)
ON CONFLICT DO NOTHING;
