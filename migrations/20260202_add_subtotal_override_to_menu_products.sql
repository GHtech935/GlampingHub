-- Migration: Add subtotal_override to glamping_booking_menu_products
-- Purpose: Allow manual override of total price for menu products
-- When set, this value is used instead of quantity * unit_price

ALTER TABLE glamping_booking_menu_products
  ADD COLUMN IF NOT EXISTS subtotal_override DECIMAL(12,2) DEFAULT NULL;

COMMENT ON COLUMN glamping_booking_menu_products.subtotal_override
  IS 'Manual override for total price. When set, this value is used instead of quantity * unit_price';
