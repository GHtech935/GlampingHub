-- Add display_order column to glamping_parameters table
-- This allows controlling the display priority of parameters
-- Lower numbers display first (0 = highest priority)

-- Add display_order column with default value
ALTER TABLE glamping_parameters
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX idx_glamping_parameters_zone_display_order
ON glamping_parameters(zone_id, display_order);

-- Populate existing records with sequential values based on alphabetical name order
-- This maintains current ordering while adding the new field
WITH numbered_params AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY zone_id ORDER BY name ASC) - 1 AS seq_order
  FROM glamping_parameters
)
UPDATE glamping_parameters
SET display_order = numbered_params.seq_order
FROM numbered_params
WHERE glamping_parameters.id = numbered_params.id;
