-- ============================================================================
-- Migration: Add Tax System for Accommodation
-- Date: 2025-01-18
-- Description: Add tax configuration at campsite level and tax tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add tax configuration to campsites table
-- ----------------------------------------------------------------------------
ALTER TABLE campsites
ADD COLUMN tax_enabled BOOLEAN DEFAULT false,
ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN tax_name JSONB DEFAULT '{"vi": "VAT", "en": "VAT"}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN campsites.tax_enabled IS 'Enable/disable tax for this campsite';
COMMENT ON COLUMN campsites.tax_rate IS 'Tax rate percentage (e.g., 10.00 for 10% VAT)';
COMMENT ON COLUMN campsites.tax_name IS 'Multilingual tax name: {"vi": "VAT", "en": "VAT"}';

-- ----------------------------------------------------------------------------
-- STEP 2: Add tax fields to bookings table
-- ----------------------------------------------------------------------------
ALTER TABLE bookings
ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN subtotal_before_tax DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN bookings.tax_rate IS 'Tax rate at time of booking (snapshot from campsite)';
COMMENT ON COLUMN bookings.tax_amount IS 'Calculated tax amount for this booking';
COMMENT ON COLUMN bookings.subtotal_before_tax IS 'Subtotal before applying accommodation tax';

-- ----------------------------------------------------------------------------
-- STEP 3: Update generated column for total_amount
-- ----------------------------------------------------------------------------
-- Must drop existing generated columns first
ALTER TABLE bookings
DROP COLUMN IF EXISTS total_amount,
DROP COLUMN IF EXISTS deposit_amount,
DROP COLUMN IF EXISTS balance_amount;

-- Recreate total_amount with tax included
ALTER TABLE bookings
ADD COLUMN total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
  accommodation_cost + products_cost + products_tax - discount_amount + tax_amount
) STORED;

-- Recreate deposit_amount (includes tax in calculation)
ALTER TABLE bookings
ADD COLUMN deposit_amount DECIMAL(10,2) GENERATED ALWAYS AS (
  (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) * deposit_percentage / 100
) STORED;

-- Recreate balance_amount (includes tax in calculation)
ALTER TABLE bookings
ADD COLUMN balance_amount DECIMAL(10,2) GENERATED ALWAYS AS (
  (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) -
  ((accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) * deposit_percentage / 100)
) STORED;

-- ----------------------------------------------------------------------------
-- STEP 4: Create tax_history table for tracking changes
-- ----------------------------------------------------------------------------
CREATE TABLE tax_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campsite_id UUID NOT NULL REFERENCES campsites(id) ON DELETE CASCADE,

  -- Old values
  old_tax_enabled BOOLEAN,
  old_tax_rate DECIMAL(5,2),
  old_tax_name JSONB,

  -- New values
  new_tax_enabled BOOLEAN,
  new_tax_rate DECIMAL(5,2),
  new_tax_name JSONB,

  -- Change tracking
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_tax_history_campsite ON tax_history(campsite_id);
CREATE INDEX idx_tax_history_date ON tax_history(changed_at DESC);
CREATE INDEX idx_tax_history_changed_by ON tax_history(changed_by);

-- Add comments
COMMENT ON TABLE tax_history IS 'Tracks all changes to campsite tax configuration';
COMMENT ON COLUMN tax_history.change_reason IS 'Reason for changing tax configuration (e.g., "Government regulation change")';

-- ----------------------------------------------------------------------------
-- STEP 5: Add trigger to automatically log tax changes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_tax_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if tax-related fields actually changed
  IF (OLD.tax_enabled IS DISTINCT FROM NEW.tax_enabled) OR
     (OLD.tax_rate IS DISTINCT FROM NEW.tax_rate) OR
     (OLD.tax_name IS DISTINCT FROM NEW.tax_name) THEN

    INSERT INTO tax_history (
      campsite_id,
      old_tax_enabled,
      old_tax_rate,
      old_tax_name,
      new_tax_enabled,
      new_tax_rate,
      new_tax_name,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.tax_enabled,
      OLD.tax_rate,
      OLD.tax_name,
      NEW.tax_enabled,
      NEW.tax_rate,
      NEW.tax_name,
      NULL,  -- Will be set by application
      'Auto-logged by trigger'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_change_trigger
AFTER UPDATE ON campsites
FOR EACH ROW
EXECUTE FUNCTION log_tax_change();

-- ============================================================================
-- End of migration
-- ============================================================================
