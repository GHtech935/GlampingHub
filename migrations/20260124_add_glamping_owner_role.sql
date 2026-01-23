-- Migration: Add 'glamping_owner' role to users table
-- Date: 2026-01-24
-- Purpose: Create dedicated role for glamping zone owners (separate from camping 'owner' role)

BEGIN;

-- Drop existing role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with 'glamping_owner' role
-- Roles:
--   - admin: Full system access
--   - sale: Sales team access
--   - operations: Operations team access
--   - owner: Camping campsite owner (uses campsiteIds)
--   - glamping_owner: Glamping zone owner (uses glampingZoneIds) [NEW]
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'sale', 'operations', 'owner', 'glamping_owner'));

COMMIT;
