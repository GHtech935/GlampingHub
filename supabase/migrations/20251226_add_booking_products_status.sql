-- Migration: Add status and cancellation tracking to booking_products
-- Purpose: Allow admin to cancel products after booking is created with proper audit trail
-- Created: 2025-12-26

-- 1. Add status and cancellation tracking columns
ALTER TABLE booking_products
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID,
  ADD COLUMN IF NOT EXISTS cancelled_by_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Add constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_booking_product_status'
  ) THEN
    ALTER TABLE booking_products
      ADD CONSTRAINT valid_booking_product_status
      CHECK (status IN ('active', 'cancelled'));
  END IF;
END$$;

-- 3. Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_booking_products_status
  ON booking_products(booking_id, status);

-- 4. Create index for cancelled products audit
CREATE INDEX IF NOT EXISTS idx_booking_products_cancelled_at
  ON booking_products(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- 5. Add comments for documentation
COMMENT ON COLUMN booking_products.status IS 'Product status: active (default) or cancelled';
COMMENT ON COLUMN booking_products.cancelled_at IS 'Timestamp when product was cancelled';
COMMENT ON COLUMN booking_products.cancelled_by IS 'UUID of admin/user who cancelled the product';
COMMENT ON COLUMN booking_products.cancelled_by_name IS 'Name of admin/user who cancelled (for display)';
COMMENT ON COLUMN booking_products.cancellation_reason IS 'Reason for cancellation (required when cancelling)';
