-- Migration: Add bank_account_id to campsites table
-- Date: 2025-01-15
-- Description: Link each campsite to a specific bank account (or NULL for default)

-- Add bank_account_id column to campsites
ALTER TABLE campsites
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_campsites_bank_account_id ON campsites(bank_account_id);

-- Comment
COMMENT ON COLUMN campsites.bank_account_id IS 'Bank account for this campsite. NULL = use default account.';

-- Note: All existing campsites will have bank_account_id = NULL (use default)
