-- Create junction table to link glamping items with menu products (food/beverages)
CREATE TABLE glamping_item_menu_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES glamping_items(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES glamping_menu_items(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, menu_item_id)
);

-- Create indexes for performance
CREATE INDEX idx_item_menu_products_item ON glamping_item_menu_products(item_id);
CREATE INDEX idx_item_menu_products_menu_item ON glamping_item_menu_products(menu_item_id);
CREATE INDEX idx_item_menu_products_order ON glamping_item_menu_products(item_id, display_order);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_glamping_item_menu_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_glamping_item_menu_products_updated_at
    BEFORE UPDATE ON glamping_item_menu_products
    FOR EACH ROW
    EXECUTE FUNCTION update_glamping_item_menu_products_updated_at();

-- Add table comments for documentation
COMMENT ON TABLE glamping_item_menu_products IS 'Junction table linking glamping items with menu products (food/beverages)';
COMMENT ON COLUMN glamping_item_menu_products.item_id IS 'Reference to the glamping item';
COMMENT ON COLUMN glamping_item_menu_products.menu_item_id IS 'Reference to the menu item (food/beverage)';
COMMENT ON COLUMN glamping_item_menu_products.is_required IS 'Whether this menu item is required (true) or optional (false) for the glamping item';
COMMENT ON COLUMN glamping_item_menu_products.display_order IS 'Order in which menu items are displayed';
