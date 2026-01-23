-- Migration: Add Deposit System for Campsites and Pitches
-- Description: Allows admin to configure deposit requirements (percentage or fixed amount) at campsite/pitch level
-- Date: 2025-11-17

-- Step 1: Create deposit_type ENUM
CREATE TYPE deposit_type AS ENUM ('percentage', 'fixed_amount');

-- Step 2: Add deposit columns to campsites table
ALTER TABLE campsites
ADD COLUMN deposit_type deposit_type DEFAULT 'percentage',
ADD COLUMN deposit_value DECIMAL(10,2) DEFAULT 15;

-- Add constraint for campsite deposits
ALTER TABLE campsites
ADD CONSTRAINT campsites_deposit_check CHECK (
  (deposit_type = 'percentage' AND deposit_value >= 0 AND deposit_value <= 100) OR
  (deposit_type = 'fixed_amount' AND deposit_value >= 0)
);

-- Add comment for campsite deposit columns
COMMENT ON COLUMN campsites.deposit_type IS 'Type of deposit: percentage (of total) or fixed_amount (in VND)';
COMMENT ON COLUMN campsites.deposit_value IS 'Deposit value: 0-100 for percentage, or fixed amount in VND';

-- Step 3: Add deposit columns to pitches table (nullable = inherit from campsite)
ALTER TABLE pitches
ADD COLUMN deposit_type deposit_type DEFAULT NULL,
ADD COLUMN deposit_value DECIMAL(10,2) DEFAULT NULL;

-- Add constraint for pitch deposits (NULL or valid values)
ALTER TABLE pitches
ADD CONSTRAINT pitches_deposit_check CHECK (
  (deposit_type IS NULL AND deposit_value IS NULL) OR
  (deposit_type = 'percentage' AND deposit_value >= 0 AND deposit_value <= 100) OR
  (deposit_type = 'fixed_amount' AND deposit_value >= 0)
);

-- Add comments for pitch deposit columns
COMMENT ON COLUMN pitches.deposit_type IS 'Override deposit type for this pitch. NULL = inherit from campsite';
COMMENT ON COLUMN pitches.deposit_value IS 'Override deposit value for this pitch. NULL = inherit from campsite';

-- Step 4: Add deposit tracking columns to bookings table
ALTER TABLE bookings
ADD COLUMN deposit_type deposit_type,
ADD COLUMN deposit_value DECIMAL(10,2);

-- Add comments for booking deposit columns
COMMENT ON COLUMN bookings.deposit_type IS 'The deposit type used when this booking was created (for audit trail)';
COMMENT ON COLUMN bookings.deposit_value IS 'The deposit value used when this booking was created (for audit trail)';

-- Note: The bookings table already has deposit_percentage, deposit_amount, and balance_amount columns
-- Those are kept for backward compatibility and for the auto-calculated amounts
-- The new deposit_type and deposit_value columns are for tracking what settings were used
