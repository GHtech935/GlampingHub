-- ============================================
-- Migration: Fix login_history column name
-- Created: 2025-11-19
-- Purpose: Rename admin_id to user_id in existing production database
-- ============================================

-- This migration fixes the column name mismatch caused by migration execution order
-- Migration 20251118_add_admin_activity_tracking.sql created the table with admin_id
-- but the code expects user_id (following the pattern from migration 005)

-- Rename column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'login_history'
    AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE login_history RENAME COLUMN admin_id TO user_id;
    RAISE NOTICE 'Column admin_id renamed to user_id in login_history table';
  ELSE
    RAISE NOTICE 'Column admin_id does not exist in login_history table - already fixed or using correct name';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN login_history.user_id IS 'Reference to the staff user (users table) who logged in';
