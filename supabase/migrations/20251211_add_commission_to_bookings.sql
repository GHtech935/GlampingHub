-- Migration: Add commission fields to bookings table
-- Created: 2025-12-11
-- Description: Add commission tracking fields for each booking

BEGIN;

-- Add commission columns to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_earnings DECIMAL(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN bookings.commission_percentage IS
'Snapshot of campsite commission rate at booking creation time.
This value NEVER changes after booking is created (snapshot principle).
Used to calculate commission_amount and owner_earnings.
Example: 10.00 means system takes 10%, owner receives 90%.';

COMMENT ON COLUMN bookings.commission_amount IS
'Commission amount that system receives from this booking.
Calculated dynamically based on payment_status:
- pending: 0 (no payment yet)
- deposit_paid: deposit_amount × (commission_percentage / 100)
- fully_paid: total_amount × (commission_percentage / 100)
- cancelled: 0 (no commission for cancelled bookings)
This field is recalculated when payment_status changes.';

COMMENT ON COLUMN bookings.owner_earnings IS
'Amount that owner receives from this booking.
Formula: owner_earnings = paid_amount - commission_amount
Where paid_amount is:
- deposit_amount (if payment_status = deposit_paid)
- total_amount (if payment_status = fully_paid)
- 0 (if pending or cancelled)
This field is recalculated when payment_status changes.';

-- Create indexes for reporting and analytics
CREATE INDEX IF NOT EXISTS idx_bookings_commission
ON bookings(campsite_id, status, payment_status, commission_amount)
WHERE commission_amount > 0;

CREATE INDEX IF NOT EXISTS idx_bookings_owner_earnings
ON bookings(campsite_id, created_at, owner_earnings)
WHERE owner_earnings > 0;

-- Create index for monthly payout generation (using created_at directly)
CREATE INDEX IF NOT EXISTS idx_bookings_commission_period
ON bookings(campsite_id, created_at, status, payment_status)
WHERE status != 'cancelled';

-- Add constraint to ensure commission_amount doesn't exceed paid amount
-- Note: This is a soft constraint, actual validation in application logic
COMMENT ON TABLE bookings IS
'Bookings table with commission tracking.
Commission fields (commission_percentage, commission_amount, owner_earnings)
are managed by application logic and recalculated when payment_status changes.';

COMMIT;

-- Verification queries (commented out, run manually if needed)
--
-- Check new columns exist:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'bookings'
--   AND column_name IN ('commission_percentage', 'commission_amount', 'owner_earnings');
--
-- Check indexes created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'bookings'
--   AND indexname LIKE '%commission%';
