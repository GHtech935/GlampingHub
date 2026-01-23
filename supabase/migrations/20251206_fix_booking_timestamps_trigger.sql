-- Migration: Fix booking timestamps trigger after status split
-- Version: 1.0
-- Date: 2025-12-06
-- Description: Update auto_set_booking_timestamps() trigger to use new status + payment_status columns
--              instead of the old unified_status column

-- =============================================================================
-- UPDATE TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_set_booking_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set confirmed_at when booking becomes confirmed with payment
  -- OLD schema: unified_status IN ('confirmed_deposit_paid', 'confirmed_fully_paid')
  -- NEW schema: status = 'confirmed' AND payment_status IN ('deposit_paid', 'fully_paid')
  IF (OLD.status IS NULL OR OLD.status != 'confirmed' OR OLD.payment_status NOT IN ('deposit_paid', 'fully_paid'))
     AND NEW.status = 'confirmed'
     AND NEW.payment_status IN ('deposit_paid', 'fully_paid')
     AND NEW.confirmed_at IS NULL
  THEN
    NEW.confirmed_at = NOW();
  END IF;

  -- Set checked_in_at when status changes to checked_in
  IF NEW.status = 'checked_in' AND (OLD.status IS NULL OR OLD.status != 'checked_in') AND NEW.checked_in_at IS NULL THEN
    NEW.checked_in_at = NOW();
  END IF;

  -- Set checked_out_at when status changes to checked_out
  IF NEW.status = 'checked_out' AND (OLD.status IS NULL OR OLD.status != 'checked_out') AND NEW.checked_out_at IS NULL THEN
    NEW.checked_out_at = NOW();
  END IF;

  -- Set cancelled_at when status changes to cancelled
  IF NEW.status = 'cancelled'
     AND (OLD.status IS NULL OR OLD.status != 'cancelled')
     AND NEW.cancelled_at IS NULL
  THEN
    NEW.cancelled_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RECREATE TRIGGER (ensures it uses the updated function)
-- =============================================================================

DROP TRIGGER IF EXISTS auto_set_booking_timestamps_trigger ON bookings;

CREATE TRIGGER auto_set_booking_timestamps_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_booking_timestamps();

-- =============================================================================
-- DONE
-- =============================================================================
