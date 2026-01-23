-- Migration: Drop unused email_queue table
-- Date: 2024-12-27
-- Reason: Table was created but never implemented in the application

-- Drop the index first
DROP INDEX IF EXISTS idx_email_queue_scheduled;

-- Drop the table
DROP TABLE IF EXISTS email_queue;
