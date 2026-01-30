-- Add notes column to glamping_booking_payments table
ALTER TABLE glamping_booking_payments
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update status constraint to include 'deleted'
ALTER TABLE glamping_booking_payments
  DROP CONSTRAINT IF EXISTS glamping_booking_payments_status_check;

ALTER TABLE glamping_booking_payments
  ADD CONSTRAINT glamping_booking_payments_status_check
  CHECK (status IN ('pending', 'awaiting_confirmation', 'paid', 'failed', 'refunded', 'deleted'));
