-- Create glamping_booking_menu_products table to store menu products ordered with bookings
CREATE TABLE IF NOT EXISTS glamping_booking_menu_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES glamping_menu_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_menu_products_booking ON glamping_booking_menu_products(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_menu_products_menu_item ON glamping_booking_menu_products(menu_item_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_glamping_booking_menu_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_glamping_booking_menu_products_updated_at ON glamping_booking_menu_products;
CREATE TRIGGER trigger_update_glamping_booking_menu_products_updated_at
    BEFORE UPDATE ON glamping_booking_menu_products
    FOR EACH ROW
    EXECUTE FUNCTION update_glamping_booking_menu_products_updated_at();

-- Add table comments
COMMENT ON TABLE glamping_booking_menu_products IS 'Menu products (food/beverages) ordered with glamping bookings';
COMMENT ON COLUMN glamping_booking_menu_products.booking_id IS 'Reference to the booking';
COMMENT ON COLUMN glamping_booking_menu_products.menu_item_id IS 'Reference to the menu item ordered';
COMMENT ON COLUMN glamping_booking_menu_products.quantity IS 'Quantity ordered';
COMMENT ON COLUMN glamping_booking_menu_products.unit_price IS 'Price per unit at time of booking';
COMMENT ON COLUMN glamping_booking_menu_products.total_price IS 'Total price (quantity * unit_price)';
