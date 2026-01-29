-- Add counted_for_menu column to glamping_parameters table
-- This column indicates whether guests with this parameter should be counted for menu product selection

ALTER TABLE glamping_parameters
ADD COLUMN IF NOT EXISTS counted_for_menu BOOLEAN DEFAULT false;

-- Add index for better query performance when filtering by counted_for_menu
CREATE INDEX IF NOT EXISTS idx_glamping_parameters_counted_for_menu
ON glamping_parameters(counted_for_menu) WHERE counted_for_menu = true;

-- Add column comment for documentation
COMMENT ON COLUMN glamping_parameters.counted_for_menu IS
'Whether this parameter counts toward menu product selection. When true, guests with this parameter will be included in the total count that must be covered by menu combos.';
