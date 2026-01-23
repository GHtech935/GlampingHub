-- Create glamping_menu_categories table
CREATE TABLE glamping_menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES glamping_zones(id) ON DELETE CASCADE,
  name JSONB NOT NULL, -- { "vi": "Đồ uống", "en": "Beverages" }
  description JSONB, -- { "vi": "...", "en": "..." }
  weight INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for zone_id
CREATE INDEX idx_glamping_menu_categories_zone_id ON glamping_menu_categories(zone_id);

-- Create index for status
CREATE INDEX idx_glamping_menu_categories_status ON glamping_menu_categories(status);

-- Add category_id to glamping_menu_items table
ALTER TABLE glamping_menu_items
ADD COLUMN category_id UUID REFERENCES glamping_menu_categories(id) ON DELETE SET NULL;

-- Create index for category_id in menu items
CREATE INDEX idx_glamping_menu_items_category_id ON glamping_menu_items(category_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_glamping_menu_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_glamping_menu_categories_updated_at
BEFORE UPDATE ON glamping_menu_categories
FOR EACH ROW
EXECUTE FUNCTION update_glamping_menu_categories_updated_at();
