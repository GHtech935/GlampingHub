-- Add glamping_booking_id column to email_logs table
-- This allows email logs to reference either camping bookings OR glamping bookings

-- Add column only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs'
    AND column_name = 'glamping_booking_id'
  ) THEN
    ALTER TABLE email_logs
    ADD COLUMN glamping_booking_id UUID REFERENCES glamping_bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_email_logs_glamping_booking_id ON email_logs(glamping_booking_id);

-- Add comment explaining the column
COMMENT ON COLUMN email_logs.glamping_booking_id IS 'Foreign key to glamping_bookings table. Use this OR booking_id, not both.';
