-- Migration: Update bookings table - add party_names, remove type_of_visit and vehicle_registration
-- Date: 2025-11-18
-- Description: Add party_names field and remove unused fields from bookings table

-- Add party_names column
ALTER TABLE bookings
  ADD COLUMN party_names TEXT;

-- Drop unused columns
ALTER TABLE bookings
  DROP COLUMN IF EXISTS type_of_visit,
  DROP COLUMN IF EXISTS vehicle_registration;

-- Add comment
COMMENT ON COLUMN bookings.party_names IS 'Names of all people in the party (comma-separated or line-separated)';
