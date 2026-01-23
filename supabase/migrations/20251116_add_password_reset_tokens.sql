-- Migration: Add Password Reset Tokens
-- Description: Add columns for password reset functionality to customers table
-- Date: 2025-11-16

-- Add password reset token columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_customers_password_reset_token
ON customers(password_reset_token)
WHERE password_reset_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN customers.password_reset_token IS 'UUID token for password reset, single-use';
COMMENT ON COLUMN customers.password_reset_token_expires IS 'Expiry timestamp for reset token (typically 1 hour from generation)';
