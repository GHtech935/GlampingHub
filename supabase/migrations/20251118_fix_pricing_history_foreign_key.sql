-- Migration: Rename pricing_history user column and fix foreign key
-- Created: 2025-11-18
-- Description: Rename changed_by_user_id to changed_by_admin_id for clarity and add proper foreign key constraint

-- Step 1: Drop the existing foreign key constraint (if exists)
ALTER TABLE pricing_history
DROP CONSTRAINT IF EXISTS pricing_history_changed_by_user_id_fkey;

-- Step 2: Rename the column to be more accurate
-- Note: This migration assumes column already exists as changed_by_user_id from initial schema
-- If running fresh, the column might not exist yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_history' AND column_name = 'changed_by_user_id'
  ) THEN
    ALTER TABLE pricing_history
    RENAME COLUMN changed_by_user_id TO changed_by_admin_id;
  END IF;
END $$;

-- Step 3: Add foreign key constraint referencing users table (staff)
-- The column references users table because admins were migrated to users table
ALTER TABLE pricing_history
ADD CONSTRAINT pricing_history_changed_by_admin_id_fkey
  FOREIGN KEY (changed_by_admin_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Step 4: Drop and recreate the index with the new column name
DROP INDEX IF EXISTS idx_pricing_history_user;
CREATE INDEX IF NOT EXISTS idx_pricing_history_admin ON pricing_history(changed_by_admin_id, created_at DESC);

-- Step 5: Update the comment
COMMENT ON COLUMN pricing_history.changed_by_admin_id IS 'Staff/admin user who made the pricing change (nullable for system changes or when user is deleted)';
