-- Product Grouping: Parent-Child relationship table
CREATE TABLE glamping_product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_item_id UUID NOT NULL REFERENCES glamping_items(id) ON DELETE CASCADE,
    child_item_id UUID NOT NULL REFERENCES glamping_items(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_item_id, child_item_id)
);
CREATE INDEX idx_product_groups_parent ON glamping_product_groups(parent_item_id);
CREATE INDEX idx_product_groups_child ON glamping_product_groups(child_item_id);

-- Parent item settings
CREATE TABLE glamping_product_group_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES glamping_items(id) ON DELETE CASCADE UNIQUE,
    show_unavailable_children BOOLEAN DEFAULT FALSE,
    show_starting_price BOOLEAN DEFAULT FALSE,
    show_child_prices_in_dropdown BOOLEAN DEFAULT TRUE,
    display_price DECIMAL(12, 2) DEFAULT 0,
    default_calendar_status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
