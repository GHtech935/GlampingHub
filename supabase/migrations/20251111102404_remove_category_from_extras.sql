-- Remove category column from extras table
-- Category is not needed, each extra can be described via name and description

ALTER TABLE extras
  DROP COLUMN IF EXISTS category;
