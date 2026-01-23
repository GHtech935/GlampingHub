-- Migration: Unified Booking Status System
-- Date: 2025-01-17
-- Description: Replace dual status system (status + payment_status) with single unified_status field

-- =============================================================================
-- STEP 1: Add new unified_status column
-- =============================================================================

ALTER TABLE bookings
ADD COLUMN unified_status VARCHAR(50);

COMMENT ON COLUMN bookings.unified_status IS 'Unified booking status combining booking state and payment state';

-- =============================================================================
-- STEP 2: Delete all existing booking data (as per requirement)
-- =============================================================================

-- First, delete related records in other tables that reference bookings (skip if tables don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_extras') THEN
    DELETE FROM booking_extras WHERE booking_id IN (SELECT id FROM bookings);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
    DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings);
  END IF;
END $$;

-- Delete all bookings
DELETE FROM bookings;

COMMENT ON TABLE bookings IS 'Booking data cleared during migration to unified status system';

-- =============================================================================
-- STEP 3: Add new timestamp columns
-- =============================================================================

ALTER TABLE bookings
ADD COLUMN checked_in_at TIMESTAMP,
ADD COLUMN checked_out_at TIMESTAMP;

COMMENT ON COLUMN bookings.checked_in_at IS 'Timestamp when guest checked in';
COMMENT ON COLUMN bookings.checked_out_at IS 'Timestamp when guest checked out';

-- =============================================================================
-- STEP 4: Set unified_status as NOT NULL with default value
-- =============================================================================

ALTER TABLE bookings
ALTER COLUMN unified_status SET NOT NULL,
ALTER COLUMN unified_status SET DEFAULT 'pending_payment';

-- =============================================================================
-- STEP 5: Add check constraint for valid status values
-- =============================================================================

ALTER TABLE bookings
ADD CONSTRAINT valid_unified_status CHECK (
  unified_status IN (
    -- Payment flow
    'pending_payment',
    'payment_expired',
    -- Confirmation flow
    'pending_confirmation_deposit',
    'pending_confirmation_fully_paid',
    -- Active bookings
    'confirmed_deposit_paid',
    'confirmed_fully_paid',
    'checked_in',
    'checked_out',
    -- Cancellations
    'cancelled_refund_pending',
    'cancelled_refunded',
    'cancelled_no_refund'
  )
);

-- =============================================================================
-- STEP 6: Create indexes for performance
-- =============================================================================

CREATE INDEX idx_bookings_unified_status ON bookings(unified_status);
CREATE INDEX idx_bookings_checked_in_at ON bookings(checked_in_at);
CREATE INDEX idx_bookings_checked_out_at ON bookings(checked_out_at);

-- Add composite index for common queries
CREATE INDEX idx_bookings_status_dates ON bookings(unified_status, check_in_date, check_out_date);

-- =============================================================================
-- STEP 7: Drop old status columns and their indexes
-- =============================================================================

-- Drop old indexes first
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_payment_status;

-- Drop old columns
ALTER TABLE bookings
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS payment_status;

-- =============================================================================
-- STEP 8: Update default values for bookings table
-- =============================================================================

-- Ensure nights is calculated correctly (not null)
-- Skip if nights column doesn't exist or is generated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'nights'
    AND is_generated = 'NEVER'
  ) THEN
    ALTER TABLE bookings ALTER COLUMN nights SET NOT NULL;
  END IF;
END $$;

-- Set default for numeric fields (only if they exist)
DO $$
BEGIN
  -- Children
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'children') THEN
    ALTER TABLE bookings ALTER COLUMN children SET DEFAULT 0;
  END IF;
  -- Infants
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'infants') THEN
    ALTER TABLE bookings ALTER COLUMN infants SET DEFAULT 0;
  END IF;
  -- Vehicles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'vehicles') THEN
    ALTER TABLE bookings ALTER COLUMN vehicles SET DEFAULT 0;
  END IF;
  -- Dogs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'dogs') THEN
    ALTER TABLE bookings ALTER COLUMN dogs SET DEFAULT 0;
  END IF;
  -- Products cost
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'products_cost') THEN
    ALTER TABLE bookings ALTER COLUMN products_cost SET DEFAULT 0;
  END IF;
  -- Products tax
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'products_tax') THEN
    ALTER TABLE bookings ALTER COLUMN products_tax SET DEFAULT 0;
  END IF;
  -- Discount amount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'discount_amount') THEN
    ALTER TABLE bookings ALTER COLUMN discount_amount SET DEFAULT 0;
  END IF;
  -- Tax amount (may not exist in older schemas)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'tax_amount') THEN
    ALTER TABLE bookings ALTER COLUMN tax_amount SET DEFAULT 0;
  END IF;
END $$;

-- =============================================================================
-- STEP 9: Create helper function to auto-update updated_at timestamp
-- =============================================================================

-- This function is used by trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 10: Create helper function to auto-set timestamps based on status
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_set_booking_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set confirmed_at when status changes to any confirmed state
  IF (OLD.unified_status IS NULL OR
      OLD.unified_status NOT IN ('confirmed_deposit_paid', 'confirmed_fully_paid', 'checked_in', 'checked_out'))
     AND NEW.unified_status IN ('confirmed_deposit_paid', 'confirmed_fully_paid')
     AND NEW.confirmed_at IS NULL
  THEN
    NEW.confirmed_at = NOW();
  END IF;

  -- Set checked_in_at when status changes to checked_in
  IF NEW.unified_status = 'checked_in' AND OLD.unified_status != 'checked_in' AND NEW.checked_in_at IS NULL THEN
    NEW.checked_in_at = NOW();
  END IF;

  -- Set checked_out_at when status changes to checked_out
  IF NEW.unified_status = 'checked_out' AND OLD.unified_status != 'checked_out' AND NEW.checked_out_at IS NULL THEN
    NEW.checked_out_at = NOW();
  END IF;

  -- Set cancelled_at when status changes to any cancelled state
  IF NEW.unified_status LIKE 'cancelled_%'
     AND (OLD.unified_status IS NULL OR OLD.unified_status NOT LIKE 'cancelled_%')
     AND NEW.cancelled_at IS NULL
  THEN
    NEW.cancelled_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS auto_set_booking_timestamps_trigger ON bookings;

-- Create trigger to auto-set timestamps
CREATE TRIGGER auto_set_booking_timestamps_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_booking_timestamps();

-- =============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- =============================================================================

-- Verify column exists
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'bookings' AND column_name = 'unified_status';

-- Verify constraint exists
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'valid_unified_status';

-- Verify indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'bookings' AND indexname LIKE '%status%';

-- Count remaining bookings (should be 0)
-- SELECT COUNT(*) FROM bookings;

-- =============================================================================
-- ROLLBACK (if needed - DANGEROUS, only for testing)
-- =============================================================================

-- DO NOT RUN IN PRODUCTION
-- This is for reference only if rollback is absolutely necessary

/*
-- Re-add old columns
ALTER TABLE bookings
ADD COLUMN status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';

-- Drop new column
ALTER TABLE bookings
DROP COLUMN IF EXISTS unified_status,
DROP COLUMN IF EXISTS checked_in_at,
DROP COLUMN IF EXISTS checked_out_at;

-- Drop new indexes
DROP INDEX IF EXISTS idx_bookings_unified_status;
DROP INDEX IF EXISTS idx_bookings_checked_in_at;
DROP INDEX IF EXISTS idx_bookings_checked_out_at;
DROP INDEX IF EXISTS idx_bookings_status_dates;

-- Drop constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_unified_status;

-- Drop triggers
DROP TRIGGER IF EXISTS auto_set_booking_timestamps_trigger ON bookings;
DROP FUNCTION IF EXISTS auto_set_booking_timestamps();
*/

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
