-- Migration: Add Owner Role
-- This adds a new 'owner' role for campsite owners who can view their campsite data
-- and create manual bookings for their campsites
-- Model: 1 campsite has exactly 1 owner (one-to-one), 1 owner can have multiple campsites (one-to-many)

-- 1. Update role CHECK constraint to include 'owner'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'sale', 'operations', 'owner'));

-- 2. Add owner_id column to campsites table (1 campsite = 1 owner)
ALTER TABLE campsites ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN campsites.owner_id IS 'The owner of this campsite. Each campsite can have at most one owner. One owner can have multiple campsites.';

-- 3. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_campsites_owner ON campsites(owner_id);

-- 4. Add owner permission preset to permission_presets table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_presets') THEN
    INSERT INTO permission_presets (role, permissions, description, is_system)
    VALUES (
      'owner',
      '{
        "dashboard": {"view": true, "export": false},
        "campsites": {"view": true, "create": false, "edit": false, "delete": false},
        "pitches": {"view": true, "create": false, "edit": false, "delete": false},
        "bookings": {"view": true, "create": true, "edit": false, "delete": false, "cancel": false},
        "customers": {"view": false, "create": false, "edit": false, "delete": false},
        "calendar": {"view": true, "edit": false, "block_dates": false},
        "pricing": {"view": true, "edit": false},
        "products": {"view": true, "create": false, "edit": false, "delete": false},
        "discounts": {"view": true, "create": false, "edit": false, "delete": false},
        "analytics": {"view": true, "export": false},
        "email_templates": {"view": false, "create": false, "edit": false, "delete": false},
        "automation_rules": {"view": false, "create": false, "edit": false, "delete": false},
        "staff": {"view": true, "create": false, "edit": false, "delete": false},
        "settings": {"view": false, "edit": false}
      }'::jsonb,
      'Campsite owner - can view their campsite data and create manual bookings',
      true
    )
    ON CONFLICT (role) DO UPDATE SET
      permissions = EXCLUDED.permissions,
      description = EXCLUDED.description;
  END IF;
END $$;
