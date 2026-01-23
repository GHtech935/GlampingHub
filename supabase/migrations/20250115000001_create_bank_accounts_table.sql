-- Migration: Create bank_accounts table for multi-banking accounts feature
-- Date: 2025-01-15
-- Description: Allow multiple bank accounts, each campsite can choose one

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Bank Information
  bank_name VARCHAR(100) NOT NULL,           -- "ACB", "Vietcombank", "Techcombank"
  bank_id VARCHAR(20) NOT NULL,              -- "ACB", "VCB", "TCB" (for VietQR)
  account_number VARCHAR(50) NOT NULL,       -- Account number
  account_holder VARCHAR(255) NOT NULL,      -- Account holder name

  -- Status & Settings
  is_default BOOLEAN DEFAULT false,          -- Default account for system
  is_active BOOLEAN DEFAULT true,            -- Active/Inactive

  -- Metadata
  notes TEXT,                                -- Optional notes
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bank_accounts_is_default ON bank_accounts(is_default) WHERE is_default = true;
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);

-- Unique constraint: Only one active account per bank_id + account_number
CREATE UNIQUE INDEX idx_bank_accounts_account_number
  ON bank_accounts(account_number, bank_id)
  WHERE is_active = true;

-- Constraint: Only ONE default account at a time
CREATE UNIQUE INDEX idx_bank_accounts_single_default
  ON bank_accounts(is_default)
  WHERE is_default = true;

-- Comments
COMMENT ON TABLE bank_accounts IS 'Stores multiple bank accounts for payment receiving';
COMMENT ON COLUMN bank_accounts.bank_id IS 'VietQR bank code (VCB, ACB, TCB, etc.)';
COMMENT ON COLUMN bank_accounts.is_default IS 'Default account used when campsite has no specific account';

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_accounts_updated_at();
