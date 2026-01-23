-- Rollback Migration: Remove glamping_zone_id from users table
-- Date: 2026-01-23
-- Description: Rollback the addition of glamping_zone_id column

-- Drop index first
DROP INDEX IF EXISTS idx_users_glamping_zone_id;

-- Remove the column
ALTER TABLE users
DROP COLUMN IF EXISTS glamping_zone_id;
