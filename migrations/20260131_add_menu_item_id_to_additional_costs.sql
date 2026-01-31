-- Add menu_item_id column to link additional costs with menu items
ALTER TABLE glamping_booking_additional_costs
ADD COLUMN menu_item_id UUID REFERENCES glamping_menu_items(id) ON DELETE SET NULL;

-- Create index for faster lookups by menu item
CREATE INDEX IF NOT EXISTS idx_additional_costs_menu_item ON glamping_booking_additional_costs(menu_item_id);

-- Add comment to explain the column
COMMENT ON COLUMN glamping_booking_additional_costs.menu_item_id IS
'Optional reference to menu item. When set, indicates this additional cost was added from a menu item selection (not custom entry). The cost is still tracked separately from menu products ordered during booking.';
