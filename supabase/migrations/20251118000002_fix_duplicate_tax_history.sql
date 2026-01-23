-- ============================================================================
-- Migration: Fix Duplicate Tax History Entries
-- Date: 2025-01-18
-- Description: Remove trigger that causes duplicate tax_history entries
--              Keep only manual logging from API endpoint
-- ============================================================================

-- Drop the trigger that auto-logs tax changes
-- This prevents duplicate entries since the API endpoint also logs changes
DROP TRIGGER IF EXISTS tax_change_trigger ON campsites;

-- Drop the trigger function (no longer needed)
DROP FUNCTION IF EXISTS log_tax_change();

-- ============================================================================
-- Rationale:
-- The tax_change_trigger was creating duplicate entries in tax_history because:
-- 1. Trigger auto-inserts on UPDATE campsites
-- 2. API endpoint (/api/admin/campsites/[id]/tax) also manually inserts
--
-- We keep only the manual API logging because it has access to:
-- - changed_by (session.userId)
-- - change_reason (from user input)
--
-- This provides better audit trail than the trigger's generic "Auto-logged by trigger"
-- ============================================================================
