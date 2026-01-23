-- Drop the foreign key constraint that only allows glamping_items
-- This allows item_id to reference both glamping_items (tents) and glamping_menu_items (menu)
-- The application_type field in glamping_discounts determines which table the item_id references

ALTER TABLE glamping_discount_items
DROP CONSTRAINT IF EXISTS glamping_discount_items_item_id_fkey;

-- Add comment to clarify the design
COMMENT ON COLUMN glamping_discount_items.item_id IS
'References either glamping_items.id (for tent discounts) or glamping_menu_items.id (for menu discounts). Check glamping_discounts.application_type to determine which table.';
