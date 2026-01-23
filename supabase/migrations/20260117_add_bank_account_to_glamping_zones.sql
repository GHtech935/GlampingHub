-- Add bank_account_id column to glamping_zones table
ALTER TABLE glamping_zones
ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_glamping_zones_bank_account_id
ON glamping_zones(bank_account_id);

-- Add comment
COMMENT ON COLUMN glamping_zones.bank_account_id IS 'Bank account used for payments from this zone. NULL means use system default.';
