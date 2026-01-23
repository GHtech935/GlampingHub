-- Add zone settings columns to glamping_zones table
-- Adds deposit settings, cancellation policy, and house rules

ALTER TABLE glamping_zones
  ADD COLUMN IF NOT EXISTS deposit_type deposit_type DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS deposit_value DECIMAL(10,2) DEFAULT 15,
  ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN IF NOT EXISTS house_rules JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb;

-- Add check constraint for deposit validation
ALTER TABLE glamping_zones
  ADD CONSTRAINT glamping_zones_deposit_check CHECK (
    (deposit_type = 'percentage' AND deposit_value >= 0 AND deposit_value <= 100) OR
    (deposit_type = 'fixed_amount' AND deposit_value >= 0)
  );

-- Add comments for documentation
COMMENT ON COLUMN glamping_zones.deposit_type IS 'Type of deposit: percentage or fixed_amount';
COMMENT ON COLUMN glamping_zones.deposit_value IS 'Deposit value (percentage 0-100 or fixed amount >= 0)';
COMMENT ON COLUMN glamping_zones.cancellation_policy IS 'Multilingual cancellation policy (vi/en) in rich text format';
COMMENT ON COLUMN glamping_zones.house_rules IS 'Multilingual house rules (vi/en) in rich text format';
