-- Fix: Drop trigger that incorrectly overwrites discount_amount
--
-- Problem: The trigger was setting discount_amount = accommodation_discount_total + products_discount_total
-- This is WRONG because:
-- 1. discount_amount should ONLY contain voucher discount
-- 2. Auto discounts are already reflected in accommodation_cost (e.g., 120k → 102k)
-- 3. Product discounts are already reflected in products_cost
--
-- The trigger caused double-discount bug:
-- - total_amount = accommodation_cost + products_cost - discount_amount
-- - With trigger: 102k + 1200k - 18k = 1284k (wrong!)
-- - Without trigger: 102k + 1200k - 0 = 1302k (correct!)
--
-- See docs/BOOKING_PRICING_LOGIC.md for full explanation

DROP TRIGGER IF EXISTS trigger_sync_booking_discount_amount ON bookings;
DROP FUNCTION IF EXISTS sync_booking_discount_amount();
