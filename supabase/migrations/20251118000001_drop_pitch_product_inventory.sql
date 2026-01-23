-- Drop unused pitch_product_inventory table
-- This table was created but never implemented in the codebase
-- The system uses max_quantity from pitch_products instead

DROP TABLE IF EXISTS pitch_product_inventory CASCADE;
