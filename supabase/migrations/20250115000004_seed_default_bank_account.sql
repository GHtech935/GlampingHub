-- Migration: Seed default bank account from ENV variables
-- Date: 2025-01-15
-- Description: Create default bank account using existing SEPAY_* environment variables

-- Insert default bank account
-- Note: Update these values to match your ENV variables before running migration
INSERT INTO bank_accounts (
  bank_name,
  bank_id,
  account_number,
  account_holder,
  is_default,
  is_active,
  notes
) VALUES (
  'ACB',                    -- SEPAY_BANK_NAME
  'ACB',                    -- SEPAY_BANK_ID
  '21288187',               -- SEPAY_BANK_ACCOUNT
  'TRAN HOANG NAM',         -- SEPAY_ACCOUNT_HOLDER
  true,                     -- Set as default
  true,                     -- Active
  'Default account created during multi-banking accounts migration. Source: ENV variables.'
)
ON CONFLICT DO NOTHING;  -- Prevent duplicate if re-running migration

-- Verify default account created
DO $$
DECLARE
  default_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO default_count FROM bank_accounts WHERE is_default = true;

  IF default_count = 0 THEN
    RAISE EXCEPTION 'Default bank account was not created. Please check the INSERT statement.';
  ELSIF default_count > 1 THEN
    RAISE EXCEPTION 'Multiple default bank accounts found. Only one default is allowed.';
  ELSE
    RAISE NOTICE 'Default bank account created successfully.';
  END IF;
END $$;
