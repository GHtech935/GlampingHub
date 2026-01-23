-- ==========================================
-- ADD GLAMPING BOOKING REFERENCE TO SEPAY TRANSACTIONS
-- Date: 2026-01-19
-- Allows tracking payments for glamping bookings
-- ==========================================

-- Add glamping_booking_id to sepay_transactions for glamping payment tracking
ALTER TABLE sepay_transactions
ADD COLUMN IF NOT EXISTS glamping_booking_id UUID REFERENCES glamping_bookings(id) ON DELETE SET NULL;

-- Index for performance (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_sepay_transactions_glamping_booking
ON sepay_transactions(glamping_booking_id) WHERE glamping_booking_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN sepay_transactions.glamping_booking_id IS 'Reference to glamping booking for glamping payment tracking';
