-- Remove tax_type column from campsite_products table
-- This field was never used in business logic and only caused confusion
-- Tax is always calculated as exclusive (added on top of price)

ALTER TABLE campsite_products
DROP COLUMN IF EXISTS tax_type;

-- Add comment to document why we only have tax_rate
COMMENT ON COLUMN campsite_products.tax_rate IS
  'Tax rate percentage (e.g., 10.00 for 10% VAT). Tax is always calculated as exclusive (added on top of price).';
