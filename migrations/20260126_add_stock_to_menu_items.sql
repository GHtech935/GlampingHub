-- Add stock inventory column to glamping_menu_items table
-- NULL = unlimited stock (no limit)

ALTER TABLE glamping_menu_items
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;

COMMENT ON COLUMN glamping_menu_items.stock IS
'Current stock/inventory quantity. NULL = unlimited/no stock limit.';
