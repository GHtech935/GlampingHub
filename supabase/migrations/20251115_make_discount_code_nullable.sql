-- Migration: Make discount code nullable for DISCOUNT type
-- Only VOUCHERS require code (customer input)
-- DISCOUNTS auto-apply and don't need code

-- Make code column nullable
ALTER TABLE discounts
ALTER COLUMN code DROP NOT NULL;

-- Add check constraint: if category is 'vouchers', code must not be null
-- This will be enforced at application level for now
-- Future enhancement: add database constraint based on category

-- Update existing discounts that might have empty codes
UPDATE discounts
SET code = NULL
WHERE code = '' OR code IS NULL;

-- Drop the existing unique constraint if it exists
ALTER TABLE discounts DROP CONSTRAINT IF EXISTS discounts_code_key;

-- Create unique index on code (excluding NULL values)
-- This allows multiple NULL codes but ensures unique non-NULL codes
DROP INDEX IF EXISTS idx_discounts_code;
DROP INDEX IF EXISTS idx_discounts_code_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_discounts_code_unique
ON discounts (code)
WHERE code IS NOT NULL;
