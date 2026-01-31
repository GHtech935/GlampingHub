-- Migration: Add is_active column to glamping_item_attributes
-- Purpose: Allow admin to mark items as inactive (hidden from public but visible in admin)

ALTER TABLE glamping_item_attributes
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index for filtering active items efficiently
CREATE INDEX IF NOT EXISTS idx_glamping_item_attributes_is_active
ON glamping_item_attributes(is_active);

-- Comment for documentation
COMMENT ON COLUMN glamping_item_attributes.is_active IS 'When false, item is hidden from public search and cannot be booked';
