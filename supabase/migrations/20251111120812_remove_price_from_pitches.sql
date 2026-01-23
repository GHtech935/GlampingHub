-- Remove price columns from pitches table
-- Pricing is now managed separately in the pricing table

ALTER TABLE pitches
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS weekend_price,
  DROP COLUMN IF EXISTS holiday_price;
