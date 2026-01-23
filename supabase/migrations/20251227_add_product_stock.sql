-- Migration: Add stock/inventory tracking to campsite_products
-- Purpose: Allow products to have limited stock that decrements on booking
-- Created: 2025-12-27

-- 1. Add stock column (NULL = unlimited stock)
ALTER TABLE campsite_products
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;

-- 2. Add index for filtering products by stock
CREATE INDEX IF NOT EXISTS idx_campsite_products_stock
  ON campsite_products(stock) WHERE stock IS NOT NULL;

-- 3. Add documentation
COMMENT ON COLUMN campsite_products.stock IS 'Stock quantity. NULL = unlimited inventory, 0 = out of stock, >0 = available quantity';
