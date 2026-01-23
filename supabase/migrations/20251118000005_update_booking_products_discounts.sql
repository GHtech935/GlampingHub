-- Migration: Update booking_products table to support individual product discounts
-- Purpose: Allow products to have auto-discounts and voucher codes with original price tracking
-- Created: 2025-11-18

-- Add discount-related columns to booking_products
ALTER TABLE booking_products
  ADD COLUMN IF NOT EXISTS original_unit_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS discount_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discount_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Add validation constraints
ALTER TABLE booking_products
  ADD CONSTRAINT valid_original_unit_price CHECK (original_unit_price IS NULL OR original_unit_price >= 0),
  ADD CONSTRAINT valid_product_discount_amount CHECK (discount_amount >= 0),
  ADD CONSTRAINT valid_product_discount_value CHECK (discount_value IS NULL OR discount_value >= 0),
  ADD CONSTRAINT valid_product_discount_type CHECK (
    discount_type IS NULL OR discount_type IN ('percentage', 'fixed_amount')
  ),
  ADD CONSTRAINT valid_product_discount_category CHECK (
    discount_category IS NULL OR discount_category IN ('discounts', 'vouchers')
  );

-- Backfill original_unit_price for existing records (use current unit_price as original)
UPDATE booking_products
SET original_unit_price = unit_price
WHERE original_unit_price IS NULL;

-- Make original_unit_price NOT NULL after backfill
ALTER TABLE booking_products
  ALTER COLUMN original_unit_price SET NOT NULL;

-- Drop the existing unit_price constraint if it exists
ALTER TABLE booking_products
  DROP CONSTRAINT IF EXISTS booking_products_unit_price_check;

-- Update unit_price to be calculated from original_unit_price - discount_amount
-- Note: We keep unit_price as a regular column (not generated) for backward compatibility
-- The application logic will calculate: unit_price = original_unit_price - discount_amount

-- Add total_price recalculation (already exists as generated column, but ensure it accounts for discounts)
-- Current formula should be: (unit_price * quantity) + tax_amount
-- This will automatically reflect discounted prices since unit_price = original - discount

-- Add index for discount lookups
CREATE INDEX IF NOT EXISTS idx_booking_products_discount_id
  ON booking_products(discount_id);

-- Add comments for documentation
COMMENT ON COLUMN booking_products.original_unit_price IS 'Original price per unit before any discounts (snapshot at booking time)';
COMMENT ON COLUMN booking_products.discount_id IS 'Reference to the discount rule applied (nullable if discount deleted later)';
COMMENT ON COLUMN booking_products.discount_name IS 'Snapshot of discount name at booking time';
COMMENT ON COLUMN booking_products.discount_code IS 'Voucher code if applicable, NULL for auto-discounts';
COMMENT ON COLUMN booking_products.discount_category IS 'Whether this is an auto-discount or voucher code';
COMMENT ON COLUMN booking_products.discount_type IS 'Type of discount: percentage or fixed_amount';
COMMENT ON COLUMN booking_products.discount_value IS 'Discount value (e.g., 20 for 20%, or 50000 for 50k VND)';
COMMENT ON COLUMN booking_products.discount_amount IS 'Actual discount amount applied to each unit';

-- Note: The application should ensure unit_price = original_unit_price - discount_amount when inserting/updating
