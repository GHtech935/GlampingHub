-- Drop package-related tables
-- These tables will cascade delete their foreign key constraints

DROP TABLE IF EXISTS glamping_package_settings CASCADE;
DROP TABLE IF EXISTS glamping_item_addons CASCADE;

-- Optional: Drop addon_item_id column from booking_items if not needed for historical data
-- Keeping it for now to preserve historical booking data
-- ALTER TABLE glamping_booking_items DROP COLUMN IF EXISTS addon_item_id;

-- Add comment for future reference
COMMENT ON TABLE glamping_booking_items IS 'Note: addon_item_id column kept for historical data preservation';
