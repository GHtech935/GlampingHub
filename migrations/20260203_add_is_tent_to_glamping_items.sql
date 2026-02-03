-- Add is_tent field to glamping_items to identify tent items directly
-- This allows filtering tents even when they don't have a category assigned

ALTER TABLE glamping_items ADD COLUMN IF NOT EXISTS is_tent BOOLEAN DEFAULT true;

-- Update existing items based on their category's is_tent_category
UPDATE glamping_items i
SET is_tent = COALESCE(c.is_tent_category, true)
FROM glamping_categories c
WHERE i.category_id = c.id;

-- Items without category default to true (assumed to be tents on items page)
-- If they should be common items, they need to be edited
