-- Migration: Add applicable_products field to discounts table
-- Date: 2025-11-15
-- Purpose: Support pitch product-specific discounts (auto-apply for selected pitch products only, NOT extras)

-- Add applicable_products JSONB field
ALTER TABLE discounts
ADD COLUMN applicable_products JSONB;

-- Add comment explaining usage
COMMENT ON COLUMN discounts.applicable_products IS
'JSONB array of pitch_product UUIDs (from pitch_products table ONLY, NOT extras table) that this discount applies to.
Only used for DISCOUNTS category (auto-apply) and VOUCHERS.
NULL = applies to all pitch products if category is DISCOUNTS.
Example: ["uuid1", "uuid2", "uuid3"]
Note: This field does NOT include extras from the extras table.';

-- Add GIN index for efficient JSONB queries
CREATE INDEX idx_discounts_applicable_products
ON discounts USING gin (applicable_products);

-- Update existing discounts to have NULL (explicit)
-- This ensures backward compatibility
UPDATE discounts
SET applicable_products = NULL
WHERE applicable_products IS NULL;

-- Verify migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'discounts'
  AND column_name = 'applicable_products';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: applicable_products field added to discounts table';
END $$;
