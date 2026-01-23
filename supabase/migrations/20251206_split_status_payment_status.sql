-- Migration: Split unified_status into status + payment_status
-- Version: 3.1 (Idempotent - safe to run multiple times)
-- Date: 2025-12-06
-- Description: Tách unified_status (11 giá trị) thành 2 trường riêng:
--   - status (5 giá trị): pending, confirmed, checked_in, checked_out, cancelled
--   - payment_status (7 giá trị): pending, expired, deposit_paid, fully_paid, refund_pending, refunded, no_refund

-- =====================================================
-- STEP 1: Delete all existing bookings (as per user request)
-- =====================================================
DELETE FROM booking_products WHERE 1=1;
DELETE FROM payments WHERE 1=1;
DELETE FROM bookings WHERE 1=1;

-- Reset booking sequences
TRUNCATE TABLE booking_sequences RESTART IDENTITY;

-- =====================================================
-- STEP 2: Drop unified_status column and related constraints
-- =====================================================
DROP INDEX IF EXISTS idx_bookings_unified_status;
ALTER TABLE bookings DROP COLUMN IF EXISTS unified_status;

-- =====================================================
-- STEP 3: Add new status column (5 values) - IDEMPOTENT
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Drop and recreate constraint (idempotent)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_bookings_status;
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_status CHECK (
  status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')
);

-- Create index (idempotent)
DROP INDEX IF EXISTS idx_bookings_status;
CREATE INDEX idx_bookings_status ON bookings(status);

-- =====================================================
-- STEP 4: Add new payment_status column (7 values) - IDEMPOTENT
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Drop and recreate constraint (idempotent)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_bookings_payment_status;
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_payment_status CHECK (
  payment_status IN ('pending', 'expired', 'deposit_paid', 'fully_paid', 'refund_pending', 'refunded', 'no_refund')
);

-- Create index (idempotent)
DROP INDEX IF EXISTS idx_bookings_payment_status;
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);

-- =====================================================
-- STEP 5: Create composite index for common queries
-- =====================================================
DROP INDEX IF EXISTS idx_bookings_status_payment;
CREATE INDEX idx_bookings_status_payment ON bookings(status, payment_status);

-- =====================================================
-- STEP 6: Add comment for documentation
-- =====================================================
COMMENT ON COLUMN bookings.status IS 'Booking lifecycle status: pending, confirmed, checked_in, checked_out, cancelled';
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: pending, expired, deposit_paid, fully_paid, refund_pending, refunded, no_refund';

-- =====================================================
-- DONE
-- =====================================================
