-- Migration: Drop unused media table
-- Date: 2024-12-27
-- Reason: Table was created but never implemented. System uses campsite_images and pitch_images instead.

-- Drop indexes first
DROP INDEX IF EXISTS idx_media_entity;

-- Drop the table
DROP TABLE IF EXISTS media;
