-- ============================================
-- Add pricing_mode column to glamping_pricing
-- Allows per_person (default) or per_group pricing
-- Date: 2026-02-01
-- ============================================

ALTER TABLE glamping_pricing
ADD COLUMN pricing_mode VARCHAR(20) DEFAULT 'per_person'
CHECK (pricing_mode IN ('per_person', 'per_group'));

-- Add comment for documentation
COMMENT ON COLUMN glamping_pricing.pricing_mode IS 'Pricing calculation mode: per_person = price × quantity, per_group = fixed price for entire group';
