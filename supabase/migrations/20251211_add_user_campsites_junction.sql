-- Migration: Add user_campsites junction table for multi-campsite support
-- Date: 2025-12-11
-- Purpose: Enable operations and owner roles to be assigned to multiple campsites

-- ============================================
-- 1. CREATE JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_campsites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campsite_id UUID NOT NULL REFERENCES campsites(id) ON DELETE CASCADE,

  -- Which role does this assignment apply to?
  -- This allows flexibility: operations can have assignments, owner can have assignments
  role VARCHAR(50) NOT NULL CHECK (role IN ('operations', 'owner')),

  -- Assignment metadata
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id), -- Admin who made the assignment
  notes TEXT, -- Optional notes about this assignment

  -- Prevent duplicate assignments
  UNIQUE(user_id, campsite_id, role),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_campsites_user ON user_campsites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_campsites_campsite ON user_campsites(campsite_id);
CREATE INDEX IF NOT EXISTS idx_user_campsites_role ON user_campsites(role);
CREATE INDEX IF NOT EXISTS idx_user_campsites_user_role ON user_campsites(user_id, role);

-- ============================================
-- 3. ADD TABLE COMMENT FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE user_campsites IS 'Many-to-many relationship between users and campsites. Supports both operations and owner roles with multiple campsite assignments.';
COMMENT ON COLUMN user_campsites.role IS 'The role type for this assignment (operations or owner). Used to filter assignments by role.';
COMMENT ON COLUMN user_campsites.assigned_by IS 'The admin user who created this assignment.';

-- ============================================
-- 4. MIGRATE EXISTING DATA
-- ============================================

-- 4.1 Migrate existing operations users (from users.campsite_id)
INSERT INTO user_campsites (user_id, campsite_id, role, assigned_at, notes)
SELECT
  id as user_id,
  campsite_id,
  'operations' as role,
  created_at as assigned_at,
  'Migrated from users.campsite_id column' as notes
FROM users
WHERE role = 'operations'
  AND campsite_id IS NOT NULL
ON CONFLICT (user_id, campsite_id, role) DO NOTHING;

-- 4.2 Migrate existing owner users (from campsites.owner_id)
INSERT INTO user_campsites (user_id, campsite_id, role, assigned_at, notes)
SELECT
  c.owner_id as user_id,
  c.id as campsite_id,
  'owner' as role,
  u.created_at as assigned_at,
  'Migrated from campsites.owner_id column' as notes
FROM campsites c
JOIN users u ON c.owner_id = u.id
WHERE c.owner_id IS NOT NULL
ON CONFLICT (user_id, campsite_id, role) DO NOTHING;

-- ============================================
-- 5. CREATE TRIGGER FOR BACKWARD COMPATIBILITY
-- ============================================

-- This trigger keeps users.campsite_id in sync with junction table
-- for backward compatibility with code that still reads users.campsite_id

CREATE OR REPLACE FUNCTION sync_user_campsite_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'operations' THEN
    -- When inserting operations assignment, update users.campsite_id if it's the first one
    UPDATE users
    SET campsite_id = NEW.campsite_id
    WHERE id = NEW.user_id
      AND role = 'operations'
      AND campsite_id IS NULL;

  ELSIF TG_OP = 'DELETE' AND OLD.role = 'operations' THEN
    -- When deleting, if this was the last operations assignment, clear campsite_id
    UPDATE users u
    SET campsite_id = NULL
    WHERE u.id = OLD.user_id
      AND u.role = 'operations'
      AND NOT EXISTS (
        SELECT 1 FROM user_campsites uc
        WHERE uc.user_id = OLD.user_id AND uc.role = 'operations'
      );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_user_campsite_id
AFTER INSERT OR DELETE ON user_campsites
FOR EACH ROW
EXECUTE FUNCTION sync_user_campsite_id();

-- ============================================
-- 6. CREATE HELPER FUNCTIONS (OPTIONAL)
-- ============================================

-- Function to get all campsite IDs for a user (any role)
CREATE OR REPLACE FUNCTION get_user_campsite_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT campsite_id
    FROM user_campsites
    WHERE user_id = p_user_id
    ORDER BY assigned_at
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all campsite IDs for a user with specific role
CREATE OR REPLACE FUNCTION get_user_campsite_ids_by_role(p_user_id UUID, p_role VARCHAR)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT campsite_id
    FROM user_campsites
    WHERE user_id = p_user_id AND role = p_role
    ORDER BY assigned_at
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify migration:
-- SELECT COUNT(*) as operations_assignments FROM user_campsites WHERE role = 'operations';
-- SELECT COUNT(*) as owner_assignments FROM user_campsites WHERE role = 'owner';
-- SELECT * FROM user_campsites ORDER BY created_at DESC LIMIT 10;

-- ============================================
-- END OF MIGRATION
-- ============================================
