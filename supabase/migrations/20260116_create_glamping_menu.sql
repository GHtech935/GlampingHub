-- Create glamping_menu_items table for managing food and beverage items
-- This follows the simple CRUD pattern used by Categories/Tags/Events

CREATE TABLE glamping_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES glamping_zones(id) ON DELETE CASCADE,

    -- Multilingual JSONB fields (pattern from other tables)
    name JSONB NOT NULL DEFAULT '{"vi": "", "en": ""}'::jsonb,
    description JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
    category JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,  -- e.g., {"vi": "Khai vị", "en": "Appetizers"}
    unit JSONB DEFAULT '{"vi": "món", "en": "item"}'::jsonb,

    -- Pricing (from campsite_products pattern)
    price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,

    -- Availability
    is_available BOOLEAN DEFAULT true,
    max_quantity INTEGER DEFAULT 10,
    requires_advance_booking BOOLEAN DEFAULT false,
    advance_hours INTEGER DEFAULT 0,

    -- Media
    image_url TEXT,

    -- Display ordering
    sort_order INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_glamping_menu_items_zone ON glamping_menu_items(zone_id);
CREATE INDEX idx_glamping_menu_items_status ON glamping_menu_items(status);
CREATE INDEX idx_glamping_menu_items_available ON glamping_menu_items(is_available);
CREATE INDEX idx_glamping_menu_items_sort ON glamping_menu_items(sort_order);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_glamping_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_glamping_menu_items_updated_at
    BEFORE UPDATE ON glamping_menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_glamping_menu_items_updated_at();

-- Add table and column comments
COMMENT ON TABLE glamping_menu_items IS 'Menu items (food and beverages) for glamping zones';
COMMENT ON COLUMN glamping_menu_items.name IS 'Multilingual menu item name in JSONB format';
COMMENT ON COLUMN glamping_menu_items.description IS 'Multilingual description in JSONB format';
COMMENT ON COLUMN glamping_menu_items.category IS 'Multilingual category (e.g., Appetizers, Main Course) in JSONB format';
COMMENT ON COLUMN glamping_menu_items.unit IS 'Multilingual unit of measurement in JSONB format';
COMMENT ON COLUMN glamping_menu_items.price IS 'Price of the menu item';
COMMENT ON COLUMN glamping_menu_items.tax_rate IS 'Tax rate as percentage (e.g., 10.00 for 10%)';
COMMENT ON COLUMN glamping_menu_items.is_available IS 'Whether the item is currently available for ordering';
COMMENT ON COLUMN glamping_menu_items.max_quantity IS 'Maximum quantity that can be ordered';
COMMENT ON COLUMN glamping_menu_items.requires_advance_booking IS 'Whether the item requires advance booking';
COMMENT ON COLUMN glamping_menu_items.advance_hours IS 'Number of hours in advance required for booking';
COMMENT ON COLUMN glamping_menu_items.image_url IS 'URL to the menu item image';
COMMENT ON COLUMN glamping_menu_items.sort_order IS 'Sort order for display';
COMMENT ON COLUMN glamping_menu_items.weight IS 'Weight for sorting (higher weight = higher priority)';
COMMENT ON COLUMN glamping_menu_items.status IS 'Status of the menu item (active or hidden)';
