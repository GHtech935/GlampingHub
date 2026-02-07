ALTER TABLE glamping_bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
