-- Add is_tent_category column to glamping_categories table
-- Categories with is_tent_category = true will appear on Items (Lều) page
-- Categories with is_tent_category = false will appear on Common Items page

ALTER TABLE glamping_categories
ADD COLUMN IF NOT EXISTS is_tent_category BOOLEAN DEFAULT true;

-- Set existing categories to be tent categories by default
UPDATE glamping_categories
SET is_tent_category = true
WHERE is_tent_category IS NULL;
