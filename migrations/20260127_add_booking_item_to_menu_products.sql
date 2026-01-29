-- Migration: Link menu products to specific booking items
-- Created: 2026-01-27
-- Description: Adds booking_item_id column to glamping_booking_menu_products table
-- to support per-item product allocation in multi-tent bookings

-- Add booking_item_id column with foreign key constraint
ALTER TABLE glamping_booking_menu_products
ADD COLUMN booking_item_id UUID REFERENCES glamping_booking_items(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_booking_menu_products_item_id
ON glamping_booking_menu_products(booking_item_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN glamping_booking_menu_products.booking_item_id IS
'Links menu product to specific booking item (tent/room). NULL means booking-level product (shared across all items).';

-- Optional: Add check constraint to ensure logical consistency
-- A product can either be linked to a specific item OR be shared (NULL), but not both
-- This is implicitly handled by the column being nullable, so no additional constraint needed
