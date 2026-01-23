-- ============================================================================
-- COMBINED MIGRATIONS SINCE COMMIT 3134a53
-- Run this file manually on Supabase SQL Editor
-- Date: 2025-12-03
-- ============================================================================

-- ============================================================================
-- 1. Migration: 20251117000001_add_pricing_history.sql
-- Description: Create pricing_history table to track all price changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the bulk operation (groups all changes made in one save action)
  bulk_operation_id UUID NOT NULL,

  -- What was changed
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Snapshot of pricing data BEFORE the change
  old_price_per_night DECIMAL(10,2),
  old_min_stay_nights INTEGER,
  old_max_stay_nights INTEGER,
  old_extra_person_child_price DECIMAL(10,2),
  old_extra_person_adult_price DECIMAL(10,2),
  old_min_advance_days INTEGER,
  old_max_advance_days INTEGER,
  old_price_type VARCHAR(50),
  old_notes TEXT,

  -- Snapshot of pricing data AFTER the change
  new_price_per_night DECIMAL(10,2),
  new_min_stay_nights INTEGER,
  new_max_stay_nights INTEGER,
  new_extra_person_child_price DECIMAL(10,2),
  new_extra_person_adult_price DECIMAL(10,2),
  new_min_advance_days INTEGER,
  new_max_advance_days INTEGER,
  new_price_type VARCHAR(50),
  new_notes TEXT,

  -- Who made the change
  changed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_user_name VARCHAR(255),
  changed_by_user_email VARCHAR(255),

  -- Type of operation
  operation_type VARCHAR(50) NOT NULL DEFAULT 'update',

  -- Request context for security audit
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pricing_history
CREATE INDEX IF NOT EXISTS idx_pricing_history_pitch_date ON pricing_history(pitch_id, date, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_bulk_operation ON pricing_history(bulk_operation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_admin ON pricing_history(changed_by_admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON pricing_history(created_at DESC);

-- Comments
COMMENT ON TABLE pricing_history IS 'Audit trail for all pricing changes with full snapshot history';
COMMENT ON COLUMN pricing_history.bulk_operation_id IS 'Groups all changes made in a single bulk update operation';
COMMENT ON COLUMN pricing_history.operation_type IS 'Type of operation: create, update, or revert';

-- ============================================================================
-- 2. Migration: 20251120_add_tax_invoice_required.sql
-- Description: Add tax_invoice_required field to bookings table
-- ============================================================================

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tax_invoice_required BOOLEAN DEFAULT false;

COMMENT ON COLUMN bookings.tax_invoice_required IS
'Indicates whether customer requires red invoice (VAT invoice).
- TRUE: Customer requests VAT invoice, tax is calculated and included in grand_total
- FALSE: No VAT invoice needed, grand_total excludes tax (customer pays less)
Default: false (customer does not pay tax unless they explicitly request invoice)';

CREATE INDEX IF NOT EXISTS idx_bookings_tax_invoice_required
ON bookings(tax_invoice_required);

-- Update existing bookings for backward compatibility
UPDATE bookings
SET tax_invoice_required = true
WHERE created_at < '2025-11-20 00:00:00+07'
  AND (tax_invoice_required IS NULL OR tax_invoice_required = false);

-- ============================================================================
-- 3. Migration: 20251202_add_admin_settings.sql
-- Description: Create admin_settings table for system-wide configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE admin_settings IS 'System-wide configuration settings manageable by admin';
COMMENT ON COLUMN admin_settings.key IS 'Unique setting key identifier';
COMMENT ON COLUMN admin_settings.value IS 'Setting value stored as JSONB (can be boolean, string, number, object)';
COMMENT ON COLUMN admin_settings.description IS 'Human-readable description of the setting';
COMMENT ON COLUMN admin_settings.updated_by IS 'Last admin who updated this setting';

CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- Insert default settings
INSERT INTO admin_settings (key, value, description) VALUES
  ('allow_pay_later', 'true', 'Cho phép khách hàng chọn option "Trả tiền khi checkout". Nếu tắt, khách phải thanh toán 100% trước khi booking được xác nhận.')
ON CONFLICT (key) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER trigger_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_updated_at();

-- ============================================================================
-- 4. Migration: 20251202_fix_deposit_amount_calculation.sql
-- Description: Fix deposit_amount to support both percentage and fixed_amount types
-- ============================================================================

-- Drop existing generated columns (they depend on each other)
ALTER TABLE bookings DROP COLUMN IF EXISTS balance_amount;
ALTER TABLE bookings DROP COLUMN IF EXISTS deposit_amount;

-- Re-add deposit_amount with correct formula
ALTER TABLE bookings ADD COLUMN deposit_amount numeric(10,2) GENERATED ALWAYS AS (
  CASE
    WHEN deposit_type = 'fixed_amount' THEN LEAST(COALESCE(deposit_value, 0), (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount))
    ELSE ((accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) * COALESCE(deposit_percentage, 15)::numeric / 100::numeric)
  END
) STORED;

-- Re-add balance_amount with correct formula
ALTER TABLE bookings ADD COLUMN balance_amount numeric(10,2) GENERATED ALWAYS AS (
  (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) - (
    CASE
      WHEN deposit_type = 'fixed_amount' THEN LEAST(COALESCE(deposit_value, 0), (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount))
      ELSE ((accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) * COALESCE(deposit_percentage, 15)::numeric / 100::numeric)
    END
  )
) STORED;

-- ============================================================================
-- END OF COMBINED MIGRATIONS
-- ============================================================================
