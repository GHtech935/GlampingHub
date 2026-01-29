-- Add serving_date column to glamping_booking_menu_products
-- This enables per-night menu product storage instead of aggregated quantities

ALTER TABLE glamping_booking_menu_products
ADD COLUMN serving_date DATE;

COMMENT ON COLUMN glamping_booking_menu_products.serving_date IS
  'The specific night/date this menu product is for. NULL = legacy aggregated or shared product.';

CREATE INDEX idx_booking_menu_serving_date
ON glamping_booking_menu_products(booking_tent_id, serving_date);
