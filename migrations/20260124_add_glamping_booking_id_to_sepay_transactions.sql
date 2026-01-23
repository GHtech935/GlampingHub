-- Migration: Add glamping_booking_id to sepay_transactions
-- Date: 2026-01-24
-- Purpose: Support glamping bookings in SePay webhook

BEGIN;

-- Add glamping_booking_id column
ALTER TABLE sepay_transactions
ADD COLUMN IF NOT EXISTS glamping_booking_id UUID REFERENCES glamping_bookings(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_sepay_transactions_glamping_booking_id
ON sepay_transactions(glamping_booking_id);

-- Add comment
COMMENT ON COLUMN sepay_transactions.glamping_booking_id IS 'GlampingHub booking ID (null for CampingHub bookings)';

COMMIT;
