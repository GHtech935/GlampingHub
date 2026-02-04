-- Re-create glamping_item_addons table (previously dropped in 20260118_drop_glamping_packages.sql)
CREATE TABLE IF NOT EXISTS glamping_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    addon_item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    price_percentage INTEGER DEFAULT 100,
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id, addon_item_id)
);

-- Re-create glamping_package_settings table
CREATE TABLE IF NOT EXISTS glamping_package_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE UNIQUE,
    show_starting_price BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_glamping_item_addons_item_id ON glamping_item_addons(item_id);
CREATE INDEX IF NOT EXISTS idx_glamping_item_addons_addon_item_id ON glamping_item_addons(addon_item_id);
CREATE INDEX IF NOT EXISTS idx_glamping_package_settings_item_id ON glamping_package_settings(item_id);
