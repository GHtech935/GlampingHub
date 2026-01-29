-- Migration: Add discount_breakdown column to glamping_bookings
-- Date: 2026-01-25
-- Description: Add discount_breakdown JSONB column to store per-item voucher information for multi-item bookings

-- Add discount_breakdown column
ALTER TABLE glamping_bookings
ADD COLUMN IF NOT EXISTS discount_breakdown JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN glamping_bookings.discount_breakdown IS
'Per-item voucher breakdown for multi-item bookings. Structure: [{item_id, accommodation_voucher: {code, amount}, menu_voucher: {code, amount}}]';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_glamping_bookings_discount_breakdown
ON glamping_bookings USING gin(discount_breakdown);
