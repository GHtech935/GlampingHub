-- Add bank account information fields for owners
-- These fields allow owners to provide their bank account details to receive commission payments

ALTER TABLE users
  ADD COLUMN owner_bank_name VARCHAR(100),          -- Bank name (e.g., Vietcombank, ACB, Techcombank)
  ADD COLUMN owner_bank_id VARCHAR(20),             -- Bank code for VietQR (e.g., VCB, ACB, TCB)
  ADD COLUMN owner_account_number VARCHAR(50),      -- Account number
  ADD COLUMN owner_account_holder VARCHAR(255),     -- Account holder name
  ADD COLUMN owner_bank_branch VARCHAR(255);        -- Bank branch (optional)

-- Add comment to explain the purpose
COMMENT ON COLUMN users.owner_bank_name IS 'Bank name where owner receives commission payments';
COMMENT ON COLUMN users.owner_bank_id IS 'Bank code for VietQR integration';
COMMENT ON COLUMN users.owner_account_number IS 'Owner bank account number for commission payments';
COMMENT ON COLUMN users.owner_account_holder IS 'Account holder full name';
COMMENT ON COLUMN users.owner_bank_branch IS 'Bank branch location (optional)';
