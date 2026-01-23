-- Migration: Create booking_nightly_pricing table
-- Purpose: Store per-night pricing breakdown for bookings with detailed cost allocation
-- Created: 2025-11-18

-- Create booking_nightly_pricing table
CREATE TABLE IF NOT EXISTS booking_nightly_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Base pricing components for this specific night
  base_pitch_price DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Extra person charges for this night
  extra_adult_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  extra_adult_count INTEGER NOT NULL DEFAULT 0,
  extra_child_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  extra_child_count INTEGER NOT NULL DEFAULT 0,

  -- Calculated fields (stored for performance and auditability)
  night_subtotal_before_discounts DECIMAL(10,2) GENERATED ALWAYS AS (
    base_pitch_price +
    (extra_adult_price * extra_adult_count) +
    (extra_child_price * extra_child_count)
  ) STORED,

  total_discounts_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

  night_subtotal_after_discounts DECIMAL(10,2) GENERATED ALWAYS AS (
    base_pitch_price +
    (extra_adult_price * extra_adult_count) +
    (extra_child_price * extra_child_count) -
    total_discounts_amount
  ) STORED,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(booking_id, date),

  -- Validation constraints
  CONSTRAINT valid_base_price CHECK (base_pitch_price >= 0),
  CONSTRAINT valid_adult_price CHECK (extra_adult_price >= 0),
  CONSTRAINT valid_adult_count CHECK (extra_adult_count >= 0),
  CONSTRAINT valid_child_price CHECK (extra_child_price >= 0),
  CONSTRAINT valid_child_count CHECK (extra_child_count >= 0),
  CONSTRAINT valid_discount_amount CHECK (total_discounts_amount >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_booking_nightly_pricing_booking_id
  ON booking_nightly_pricing(booking_id);

CREATE INDEX idx_booking_nightly_pricing_date
  ON booking_nightly_pricing(date);

CREATE INDEX idx_booking_nightly_pricing_booking_date
  ON booking_nightly_pricing(booking_id, date);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_nightly_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_booking_nightly_pricing_updated_at
  BEFORE UPDATE ON booking_nightly_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_nightly_pricing_updated_at();

-- Add comments for documentation
COMMENT ON TABLE booking_nightly_pricing IS 'Stores detailed per-night pricing breakdown for bookings including base price, extra person charges, and discounts';
COMMENT ON COLUMN booking_nightly_pricing.base_pitch_price IS 'Base pitch rental price for this specific night (from pricing_calendar or default)';
COMMENT ON COLUMN booking_nightly_pricing.extra_adult_price IS 'Price per extra adult for this night (snapshot from pitch settings)';
COMMENT ON COLUMN booking_nightly_pricing.extra_child_price IS 'Price per extra child for this night (snapshot from pitch settings)';
COMMENT ON COLUMN booking_nightly_pricing.total_discounts_amount IS 'Total of all discounts applied to this specific night (sum from booking_nightly_discounts)';
COMMENT ON COLUMN booking_nightly_pricing.night_subtotal_before_discounts IS 'Calculated total before any discounts applied';
COMMENT ON COLUMN booking_nightly_pricing.night_subtotal_after_discounts IS 'Final price for this night after all discounts';
