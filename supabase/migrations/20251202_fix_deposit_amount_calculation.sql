-- Fix deposit_amount calculation to support both percentage and fixed_amount types
-- Previously: deposit_amount = total_amount * deposit_percentage / 100 (always percentage)
-- Now: depends on deposit_type

-- First, drop the existing generated columns (they depend on each other)
ALTER TABLE bookings DROP COLUMN IF EXISTS balance_amount;
ALTER TABLE bookings DROP COLUMN IF EXISTS deposit_amount;

-- Re-add deposit_amount with correct formula
ALTER TABLE bookings ADD COLUMN deposit_amount numeric(10,2) GENERATED ALWAYS AS (
  CASE
    WHEN deposit_type = 'fixed_amount' THEN LEAST(COALESCE(deposit_value, 0), (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount))
    ELSE ((accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) * COALESCE(deposit_percentage, 15)::numeric / 100::numeric)
  END
) STORED;

-- Re-add balance_amount with correct formula
ALTER TABLE bookings ADD COLUMN balance_amount numeric(10,2) GENERATED ALWAYS AS (
  (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) - (
    CASE
      WHEN deposit_type = 'fixed_amount' THEN LEAST(COALESCE(deposit_value, 0), (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount))
      ELSE ((accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) * COALESCE(deposit_percentage, 15)::numeric / 100::numeric)
    END
  )
) STORED;
