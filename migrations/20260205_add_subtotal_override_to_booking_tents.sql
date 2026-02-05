-- Migration: Add subtotal_override column to glamping_booking_tents
-- Purpose: Store manual price override separately from calculated subtotal
-- This allows the system to track when an admin has manually overridden the tent price

ALTER TABLE glamping_booking_tents
  ADD COLUMN IF NOT EXISTS subtotal_override DECIMAL(12,2) DEFAULT NULL;

COMMENT ON COLUMN glamping_booking_tents.subtotal_override
  IS 'Manual override for tent total price. When set, this value is used instead of calculated subtotal.';

-- Create index for efficient lookups of overridden tents
CREATE INDEX IF NOT EXISTS idx_glamping_booking_tents_subtotal_override
  ON glamping_booking_tents (subtotal_override)
  WHERE subtotal_override IS NOT NULL;
