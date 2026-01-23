-- Migration: Create user_glamping_zones junction table for multi-zone assignments
-- Date: 2026-01-24
-- Purpose: Enable glamping_owner role to manage multiple zones

BEGIN;

-- Create junction table for multi-zone assignments
CREATE TABLE IF NOT EXISTS user_glamping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES glamping_zones(id) ON DELETE CASCADE,

  -- Role for this assignment
  -- 'glamping_owner' for zone owners, 'operations' for zone staff
  role VARCHAR(50) NOT NULL CHECK (role IN ('glamping_owner', 'operations')),

  -- Metadata
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),  -- Admin who made assignment
  notes TEXT,

  -- Prevent duplicate assignments
  UNIQUE(user_id, zone_id, role)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_glamping_zones_user_id ON user_glamping_zones(user_id);
CREATE INDEX IF NOT EXISTS idx_user_glamping_zones_zone_id ON user_glamping_zones(zone_id);
CREATE INDEX IF NOT EXISTS idx_user_glamping_zones_role ON user_glamping_zones(role);

-- Helper function: Get zone IDs for a user
CREATE OR REPLACE FUNCTION get_user_glamping_zone_ids(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(DISTINCT zone_id)
  FROM user_glamping_zones
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Helper function: Get zone IDs by role
CREATE OR REPLACE FUNCTION get_user_glamping_zone_ids_by_role(p_user_id UUID, p_role VARCHAR)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(DISTINCT zone_id)
  FROM user_glamping_zones
  WHERE user_id = p_user_id AND role = p_role;
$$ LANGUAGE SQL STABLE;

-- Trigger to sync glamping_zone_id (backward compatibility)
-- When junction table changes, update users.glamping_zone_id to first zone
CREATE OR REPLACE FUNCTION sync_user_glamping_zone_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update users.glamping_zone_id to first zone with role='glamping_owner'
    UPDATE users
    SET glamping_zone_id = (
      SELECT zone_id
      FROM user_glamping_zones
      WHERE user_id = NEW.user_id AND role = 'glamping_owner'
      ORDER BY assigned_at ASC
      LIMIT 1
    )
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update to next zone or NULL
    UPDATE users
    SET glamping_zone_id = (
      SELECT zone_id
      FROM user_glamping_zones
      WHERE user_id = OLD.user_id AND role = 'glamping_owner'
      ORDER BY assigned_at ASC
      LIMIT 1
    )
    WHERE id = OLD.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_glamping_zone_id_trigger ON user_glamping_zones;
CREATE TRIGGER sync_glamping_zone_id_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_glamping_zones
FOR EACH ROW
EXECUTE FUNCTION sync_user_glamping_zone_id();

-- Migrate existing data
-- Move glamping_zone_id to junction table
-- NOTE: Only migrate users with role='glamping_owner' (not 'owner' which is for camping)
-- Since 'glamping_owner' is new, this will initially be empty, but handles future manual updates
INSERT INTO user_glamping_zones (user_id, zone_id, role, assigned_at)
SELECT id, glamping_zone_id, 'glamping_owner', created_at
FROM users
WHERE glamping_zone_id IS NOT NULL
  AND role = 'glamping_owner'
ON CONFLICT (user_id, zone_id, role) DO NOTHING;

COMMIT;
