-- Add password reset columns to users table for admin/staff password reset functionality
-- This allows admin/staff users to reset their passwords via email

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMPTZ;

-- Add index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
ON users (password_reset_token)
WHERE password_reset_token IS NOT NULL;

COMMENT ON COLUMN users.password_reset_token IS 'Token for password reset, valid for 1 hour';
COMMENT ON COLUMN users.password_reset_token_expires IS 'Expiration timestamp for password reset token';
