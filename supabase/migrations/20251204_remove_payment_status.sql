-- Migration: Remove redundant payment_status column
-- Date: 2025-12-04
-- Description: Remove payment_status column that was incorrectly added back by Sepay integration.
-- The unified_status column is the single source of truth for booking status.

-- Drop index first
DROP INDEX IF EXISTS idx_bookings_payment_status;

-- Drop the column
ALTER TABLE bookings DROP COLUMN IF EXISTS payment_status;

-- Add comment to clarify unified_status is the only status column
COMMENT ON COLUMN bookings.unified_status IS
'Single source of truth for booking status. 11 possible values:
- pending_payment, payment_expired
- pending_confirmation_deposit, pending_confirmation_fully_paid
- confirmed_deposit_paid, confirmed_fully_paid
- checked_in, checked_out
- cancelled_refund_pending, cancelled_refunded, cancelled_no_refund';
