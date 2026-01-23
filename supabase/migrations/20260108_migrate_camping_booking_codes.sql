-- ============================================
-- MIGRATE CAMPING BOOKING CODES: GH- to CH-
-- Date: 2026-01-08
-- Purpose: Change camping booking code prefix
--   - Old: GH-YYYYMMDD-NNNNNN
--   - New: CH-YYYYMMDD-NNNNNN
-- This frees up GH- prefix for glamping system
-- ============================================

-- Update all existing bookings
UPDATE bookings
SET booking_reference = REPLACE(booking_reference, 'GH', 'CH')
WHERE booking_reference LIKE 'GH%';

-- Verify migration
DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_old_count FROM bookings WHERE booking_reference LIKE 'GH%';
  SELECT COUNT(*) INTO v_new_count FROM bookings WHERE booking_reference LIKE 'CH%';
  SELECT COUNT(*) INTO v_total_count FROM bookings;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Camping Booking Code Migration Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total bookings: %', v_total_count;
  RAISE NOTICE 'Migrated to CH-: %', v_new_count;
  RAISE NOTICE 'Remaining GH-: %', v_old_count;

  IF v_old_count > 0 THEN
    RAISE WARNING 'Warning: % bookings still have GH- prefix!', v_old_count;
  ELSE
    RAISE NOTICE 'Success: All GH- codes migrated to CH-';
  END IF;

  RAISE NOTICE '==============================================';
END $$;
