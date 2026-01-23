-- Migration: Add commission fields to campsites table
-- Created: 2025-12-11
-- Description: Add commission_percentage and commission_type to campsites for commission system

BEGIN;

-- Add commission columns to campsites
ALTER TABLE campsites
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) DEFAULT 'percentage' NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN campsites.commission_percentage IS
'Percentage commission that system takes from bookings at this campsite.
Example: 10.00 means system takes 10%, owner receives 90%.
Range: 0.00 - 100.00';

COMMENT ON COLUMN campsites.commission_type IS
'Type of commission calculation:
- percentage: commission calculated as percentage of booking total
- fixed_amount: commission as fixed amount per booking (future expansion)
Current implementation uses percentage only.';

-- Set default 10% for existing campsites (if column was just added)
UPDATE campsites
SET commission_percentage = 10.00
WHERE commission_percentage IS NULL;

-- Add constraint to ensure valid percentage range
ALTER TABLE campsites
ADD CONSTRAINT check_commission_percentage_range
CHECK (commission_percentage >= 0.00 AND commission_percentage <= 100.00);

-- Create index for reporting queries
CREATE INDEX IF NOT EXISTS idx_campsites_commission
ON campsites(commission_percentage) WHERE commission_percentage > 0;

COMMIT;

-- Verification query (commented out, run manually if needed)
-- SELECT id, name, commission_percentage, commission_type
-- FROM campsites
-- ORDER BY commission_percentage DESC
-- LIMIT 5;
