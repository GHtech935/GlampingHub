-- Add new columns to glamping_parameters table for redesigned parameter form
-- Migration Date: 2026-01-09

-- Add new columns
ALTER TABLE glamping_parameters
ADD COLUMN IF NOT EXISTS default_value INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS link_to_guests BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT FALSE;

-- Update visibility constraint to include 'hidden' option
ALTER TABLE glamping_parameters
DROP CONSTRAINT IF EXISTS glamping_parameters_visibility_check;

ALTER TABLE glamping_parameters
ADD CONSTRAINT glamping_parameters_visibility_check
CHECK (visibility IN ('everyone', 'staff', 'hidden'));

-- Update existing records to have default values
UPDATE glamping_parameters
SET default_value = 1
WHERE default_value IS NULL;

UPDATE glamping_parameters
SET link_to_guests = FALSE
WHERE link_to_guests IS NULL;

UPDATE glamping_parameters
SET required = FALSE
WHERE required IS NULL;
