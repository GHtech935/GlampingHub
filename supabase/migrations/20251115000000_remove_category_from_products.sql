-- Remove category column from pitch_products table
-- This simplifies the product structure by removing the category classification

ALTER TABLE pitch_products DROP COLUMN IF EXISTS category;
