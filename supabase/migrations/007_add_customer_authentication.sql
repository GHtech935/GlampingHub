-- Migration 007: Add Customer Authentication Fields
-- Purpose: Enable customers to create accounts with passwords
-- Date: 2025-01-10

-- Add authentication fields to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Create index for performance on registered customers
CREATE INDEX IF NOT EXISTS idx_customers_registered ON customers(is_registered);
CREATE INDEX IF NOT EXISTS idx_customers_email_verified ON customers(email_verified);

-- Update existing customers to mark as guests (no password)
UPDATE customers
SET is_registered = false
WHERE password_hash IS NULL;

-- Add comment to document the schema
COMMENT ON COLUMN customers.password_hash IS 'NULL = guest customer, NOT NULL = registered customer with account';
COMMENT ON COLUMN customers.is_registered IS 'true = customer has registered account, false = guest from booking';
COMMENT ON COLUMN customers.email_verified IS 'Email verification status for security';
COMMENT ON COLUMN customers.last_login_at IS 'Timestamp of last successful login';

-- Update login_history table to support customer logins (skip if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'login_history') THEN
    -- Add columns
    ALTER TABLE login_history
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
    ADD COLUMN IF NOT EXISTS login_type VARCHAR(50) DEFAULT 'admin';

    -- Add check constraint for login_type
    ALTER TABLE login_history
    ADD CONSTRAINT check_login_type
    CHECK (login_type IN ('admin', 'customer'));

    -- Add comment for login_history
    COMMENT ON COLUMN login_history.customer_id IS 'Reference to customer if login_type = customer';
    COMMENT ON COLUMN login_history.login_type IS 'Type of login: admin (staff) or customer';

    -- Create index for customer login history
    CREATE INDEX IF NOT EXISTS idx_login_history_customer ON login_history(customer_id);
    CREATE INDEX IF NOT EXISTS idx_login_history_type ON login_history(login_type);
  END IF;
END $$;
