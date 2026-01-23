-- Add payment_expires_at column to glamping_bookings table
-- This stores the absolute expiration timestamp calculated at booking creation time

ALTER TABLE glamping_bookings
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance (querying expired bookings)
CREATE INDEX IF NOT EXISTS idx_glamping_bookings_payment_expires_at
ON glamping_bookings(payment_expires_at)
WHERE payment_expires_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN glamping_bookings.payment_expires_at IS
'Absolute timestamp when payment window expires. Calculated as booking creation time + SEPAY_PAYMENT_TIMEOUT_MINUTES. NULL if payment not required.';
