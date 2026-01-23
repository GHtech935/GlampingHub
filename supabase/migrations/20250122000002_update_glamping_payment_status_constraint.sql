-- Update payment_status CHECK constraint for glamping_bookings table
-- To align exactly with regular bookings table (camping)

-- Drop old constraint
ALTER TABLE glamping_bookings
  DROP CONSTRAINT IF EXISTS glamping_bookings_payment_status_check;

-- Add new constraint with same values as bookings table
ALTER TABLE glamping_bookings
  ADD CONSTRAINT glamping_bookings_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'expired',
    'deposit_paid',
    'fully_paid',
    'refund_pending',
    'refunded',
    'no_refund'
  ));

-- Update any legacy statuses to match new constraint
UPDATE glamping_bookings
SET payment_status = 'deposit_paid'
WHERE payment_status = 'partial';

UPDATE glamping_bookings
SET payment_status = 'fully_paid'
WHERE payment_status = 'paid';

COMMENT ON CONSTRAINT glamping_bookings_payment_status_check ON glamping_bookings
IS 'Valid payment statuses (matches bookings table): pending, expired, deposit_paid, fully_paid, refund_pending, refunded, no_refund';
