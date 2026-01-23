-- Add has_late_payment flag to bookings table
-- This flag is set to true when a customer makes a payment after the booking has expired

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS has_late_payment BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN bookings.has_late_payment IS 'True if customer made a payment after the booking expired (late payment)';
