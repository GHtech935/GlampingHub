-- Add is_tent_category column to glamping_menu_categories table
-- This allows distinguishing between tent-related categories (displayed on Menu page)
-- and common categories (displayed on Common Items page)

ALTER TABLE glamping_menu_categories
ADD COLUMN IF NOT EXISTS is_tent_category BOOLEAN DEFAULT true;

-- Update existing categories: default to tent category (true)
UPDATE glamping_menu_categories
SET is_tent_category = true
WHERE is_tent_category IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN glamping_menu_categories.is_tent_category IS 'If true, items in this category appear on the Menu page. If false, they appear on the Common Items page.';
