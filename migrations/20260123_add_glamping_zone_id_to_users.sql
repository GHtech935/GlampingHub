-- Migration: Add glamping_zone_id to users table
-- Date: 2026-01-23
-- Description: Add glamping_zone_id column to users table for GlampingHub zone assignment

-- Add glamping_zone_id column with foreign key to glamping_zones
ALTER TABLE users
ADD COLUMN IF NOT EXISTS glamping_zone_id UUID REFERENCES glamping_zones(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_glamping_zone_id ON users(glamping_zone_id);

-- Add comment to document the column
COMMENT ON COLUMN users.glamping_zone_id IS 'The glamping zone this user is assigned to. NULL means user is not zone-specific or has access to all zones.';
