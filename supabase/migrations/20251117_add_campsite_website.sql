-- Migration: Add Website Field to Campsites
-- Created: 2025-11-17
-- Description: Adds optional website field to campsites table for contact information

ALTER TABLE campsites
  ADD COLUMN website VARCHAR(255);

-- Add comment
COMMENT ON COLUMN campsites.website IS 'Website URL for the campsite (optional)';
