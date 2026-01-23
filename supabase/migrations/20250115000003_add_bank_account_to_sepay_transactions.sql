-- Migration: Add bank_account_id to sepay_transactions table
-- Date: 2025-01-15
-- Description: Track which bank account received each transaction

-- Add bank_account_id column to sepay_transactions
ALTER TABLE sepay_transactions
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Index for performance and reporting
CREATE INDEX IF NOT EXISTS idx_sepay_transactions_bank_account_id ON sepay_transactions(bank_account_id);

-- Comment
COMMENT ON COLUMN sepay_transactions.bank_account_id IS 'Which bank account received this transaction (for tracking and reporting).';

-- Note: Existing transactions will have bank_account_id = NULL
-- Webhook handler will populate this field for new transactions
