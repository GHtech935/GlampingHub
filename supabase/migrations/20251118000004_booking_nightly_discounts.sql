-- Migration: Create booking_nightly_discounts table
-- Purpose: Store multiple stackable discounts applied to each night of a booking
-- Created: 2025-11-18

-- Create booking_nightly_discounts table
CREATE TABLE IF NOT EXISTS booking_nightly_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_nightly_pricing_id UUID NOT NULL REFERENCES booking_nightly_pricing(id) ON DELETE CASCADE,
  discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,

  -- Snapshot of discount details at booking time
  -- (Important: Store values because discount rules may change later)
  discount_name VARCHAR(255) NOT NULL,
  discount_code VARCHAR(100),  -- NULL for auto-discounts, value for vouchers
  discount_category VARCHAR(50) NOT NULL,  -- 'discounts' or 'vouchers'
  discount_type VARCHAR(50) NOT NULL,  -- 'percentage' or 'fixed_amount'
  discount_value DECIMAL(10,2) NOT NULL,  -- e.g., 20 for 20%, or 100000 for 100k VND

  -- Calculation for this specific night
  original_amount DECIMAL(10,2) NOT NULL,  -- Price before THIS discount applied
  discount_amount DECIMAL(10,2) NOT NULL,  -- Amount saved by THIS discount
  final_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    original_amount - discount_amount
  ) STORED,

  -- Ordering for display (multiple discounts applied sequentially)
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validation constraints
  CONSTRAINT valid_discount_value CHECK (discount_value >= 0),
  CONSTRAINT valid_original_amount CHECK (original_amount >= 0),
  CONSTRAINT valid_discount_amount CHECK (discount_amount >= 0),
  CONSTRAINT discount_not_exceed_original CHECK (discount_amount <= original_amount),
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed_amount')),
  CONSTRAINT valid_discount_category CHECK (discount_category IN ('discounts', 'vouchers'))
);

-- Create indexes for performance
CREATE INDEX idx_booking_nightly_discounts_pricing_id
  ON booking_nightly_discounts(booking_nightly_pricing_id);

CREATE INDEX idx_booking_nightly_discounts_discount_id
  ON booking_nightly_discounts(discount_id);

CREATE INDEX idx_booking_nightly_discounts_sort_order
  ON booking_nightly_discounts(booking_nightly_pricing_id, sort_order);

-- Add function to update total_discounts_amount in booking_nightly_pricing
-- This ensures the parent table stays in sync when discounts are added/removed/updated
CREATE OR REPLACE FUNCTION update_nightly_pricing_total_discounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total discounts for the affected booking_nightly_pricing row
  UPDATE booking_nightly_pricing
  SET total_discounts_amount = (
    SELECT COALESCE(SUM(discount_amount), 0)
    FROM booking_nightly_discounts
    WHERE booking_nightly_pricing_id = COALESCE(NEW.booking_nightly_pricing_id, OLD.booking_nightly_pricing_id)
  )
  WHERE id = COALESCE(NEW.booking_nightly_pricing_id, OLD.booking_nightly_pricing_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to keep total_discounts_amount in sync
CREATE TRIGGER trigger_update_nightly_discounts_on_insert
  AFTER INSERT ON booking_nightly_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_nightly_pricing_total_discounts();

CREATE TRIGGER trigger_update_nightly_discounts_on_update
  AFTER UPDATE ON booking_nightly_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_nightly_pricing_total_discounts();

CREATE TRIGGER trigger_update_nightly_discounts_on_delete
  AFTER DELETE ON booking_nightly_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_nightly_pricing_total_discounts();

-- Add comments for documentation
COMMENT ON TABLE booking_nightly_discounts IS 'Stores multiple stackable discounts applied to each night of a booking (e.g., early bird + weekend + member tier)';
COMMENT ON COLUMN booking_nightly_discounts.booking_nightly_pricing_id IS 'Reference to the specific night this discount applies to';
COMMENT ON COLUMN booking_nightly_discounts.discount_id IS 'Reference to the discount rule (nullable if discount deleted later)';
COMMENT ON COLUMN booking_nightly_discounts.discount_code IS 'Voucher code if applicable, NULL for auto-discounts';
COMMENT ON COLUMN booking_nightly_discounts.discount_category IS 'Whether this is an auto-discount or voucher code';
COMMENT ON COLUMN booking_nightly_discounts.original_amount IS 'Price before this discount was applied (may already include previous discounts if stacked)';
COMMENT ON COLUMN booking_nightly_discounts.discount_amount IS 'Amount saved by this specific discount';
COMMENT ON COLUMN booking_nightly_discounts.sort_order IS 'Order in which discounts were applied (important for percentage stacking)';
