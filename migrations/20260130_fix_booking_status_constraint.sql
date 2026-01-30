-- Update status CHECK constraint for glamping_bookings table
-- Add missing statuses: checked_in, checked_out, no_show

-- Drop old constraint
ALTER TABLE glamping_bookings
  DROP CONSTRAINT IF EXISTS glamping_bookings_status_check;

-- Add new constraint with all required statuses
ALTER TABLE glamping_bookings
  ADD CONSTRAINT glamping_bookings_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'in_progress',
    'checked_in',
    'checked_out',
    'completed',
    'cancelled',
    'no_show'
  ));

COMMENT ON CONSTRAINT glamping_bookings_status_check ON glamping_bookings
IS 'Valid booking statuses: pending, confirmed, in_progress, checked_in, checked_out, completed, cancelled, no_show';
