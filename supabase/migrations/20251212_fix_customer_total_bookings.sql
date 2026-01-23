-- Migration: Fix customer total_bookings count
-- Date: 2025-12-12
-- Description: Recalculate total_bookings for all customers to exclude cancelled bookings
--
-- Background:
-- - The total_bookings field was incremented when bookings were created
-- - But it was NOT decremented when bookings were cancelled
-- - This resulted in inflated booking counts that included cancelled bookings
--
-- This migration:
-- 1. Recalculates total_bookings to count only non-cancelled bookings
-- 2. Updates last_booking_date to reflect only non-cancelled bookings
--
-- Note: Run this AFTER deploying the code fix that decrements total_bookings on cancellation

-- Recalculate total_bookings for all customers
-- Only count non-cancelled bookings
UPDATE customers c
SET total_bookings = (
  SELECT COUNT(*)
  FROM bookings b
  WHERE b.customer_id = c.id
    AND b.status != 'cancelled'
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM bookings WHERE customer_id = c.id
);

-- Update last_booking_date to only consider non-cancelled bookings
UPDATE customers c
SET last_booking_date = (
  SELECT MAX(b.created_at)::date
  FROM bookings b
  WHERE b.customer_id = c.id
    AND b.status != 'cancelled'
)
WHERE EXISTS (
  SELECT 1 FROM bookings WHERE customer_id = c.id AND status != 'cancelled'
);

-- For customers who only have cancelled bookings, set last_booking_date to NULL
UPDATE customers c
SET last_booking_date = NULL
WHERE EXISTS (
  SELECT 1 FROM bookings WHERE customer_id = c.id
)
AND NOT EXISTS (
  SELECT 1 FROM bookings WHERE customer_id = c.id AND status != 'cancelled'
);

-- Log the results
DO $$
DECLARE
  total_customers INT;
  affected_customers INT;
BEGIN
  SELECT COUNT(*) INTO total_customers FROM customers WHERE EXISTS (SELECT 1 FROM bookings WHERE customer_id = customers.id);
  SELECT COUNT(*) INTO affected_customers FROM customers WHERE total_bookings > 0;

  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  - Total customers with bookings: %', total_customers;
  RAISE NOTICE '  - Customers with active bookings: %', affected_customers;
END $$;
