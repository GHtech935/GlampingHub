-- Migration: Update bookings table for cancellation policy snapshot and discount breakdowns
-- Purpose: Store cancellation policy at booking time and separate accommodation vs product discounts
-- Created: 2025-11-18

-- Add new columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS accommodation_discount_total DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_discount_total DECIMAL(10,2) DEFAULT 0;

-- Add validation constraints
ALTER TABLE bookings
  ADD CONSTRAINT valid_accommodation_discount_total CHECK (accommodation_discount_total >= 0),
  ADD CONSTRAINT valid_products_discount_total CHECK (products_discount_total >= 0);

-- Migrate existing discount_amount to accommodation_discount_total
-- (Assumption: existing discount_amount was for accommodation only)
UPDATE bookings
SET accommodation_discount_total = discount_amount
WHERE accommodation_discount_total = 0 AND discount_amount > 0;

-- Add index for policy snapshot queries (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_policy
  ON bookings USING GIN (cancellation_policy_snapshot);

-- Add comments for documentation
COMMENT ON COLUMN bookings.cancellation_policy_snapshot IS 'Snapshot of campsite cancellation policy at the time of booking (JSONB). Format: {rules: [{hours_before: number, refund_percentage: number}], description: {vi: string, en: string}}';
COMMENT ON COLUMN bookings.accommodation_discount_total IS 'Total discount amount applied to accommodation (pitch rental + extra person charges)';
COMMENT ON COLUMN bookings.products_discount_total IS 'Total discount amount applied to products/extras';

-- Note: Keep existing discount_amount column for backward compatibility
-- New bookings should populate both accommodation_discount_total AND discount_amount
-- discount_amount can be calculated as: accommodation_discount_total + products_discount_total

-- Create function to ensure discount_amount stays in sync (optional, for safety)
CREATE OR REPLACE FUNCTION sync_booking_discount_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure discount_amount equals the sum of accommodation and products discounts
  NEW.discount_amount = COALESCE(NEW.accommodation_discount_total, 0) + COALESCE(NEW.products_discount_total, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to keep discount_amount synchronized
DROP TRIGGER IF EXISTS trigger_sync_booking_discount_amount ON bookings;
CREATE TRIGGER trigger_sync_booking_discount_amount
  BEFORE INSERT OR UPDATE OF accommodation_discount_total, products_discount_total ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_discount_amount();

-- Sample cancellation_policy_snapshot structure for reference:
-- {
--   "rules": [
--     {"hours_before_checkin": 168, "refund_percentage": 100},
--     {"hours_before_checkin": 72, "refund_percentage": 50},
--     {"hours_before_checkin": 24, "refund_percentage": 25},
--     {"hours_before_checkin": 0, "refund_percentage": 0}
--   ],
--   "description": {
--     "vi": "Hủy trước 7 ngày: Hoàn 100%. Hủy trước 3 ngày: Hoàn 50%. Hủy trước 1 ngày: Hoàn 25%. Hủy trong 24h: Không hoàn tiền.",
--     "en": "Cancel 7+ days before: 100% refund. Cancel 3+ days: 50% refund. Cancel 1+ day: 25% refund. Cancel within 24h: No refund."
--   },
--   "snapshot_at": "2025-11-18T10:30:00Z"
-- }
