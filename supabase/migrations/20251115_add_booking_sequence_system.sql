-- Migration: Add Booking Sequence System
-- Description: Add sequential booking reference number system that resets each year
-- Date: 2025-11-15
-- Author: GlampingHub Development Team

-- ============================================================================
-- 1. Create booking_sequences table to track sequential numbers per year
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_sequences (
  year INTEGER PRIMARY KEY,
  current_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for fast lookups by year
CREATE INDEX IF NOT EXISTS idx_booking_sequences_year ON booking_sequences(year);

-- Add comment for documentation
COMMENT ON TABLE booking_sequences IS 'Tracks sequential booking numbers for each year. Numbers reset to 1 at the start of each new year.';
COMMENT ON COLUMN booking_sequences.year IS 'The year (e.g., 2025)';
COMMENT ON COLUMN booking_sequences.current_number IS 'The current/last used sequential number for this year';
COMMENT ON COLUMN booking_sequences.created_at IS 'Timestamp when this year record was created';
COMMENT ON COLUMN booking_sequences.updated_at IS 'Timestamp when the counter was last incremented';

-- ============================================================================
-- 2. Create function to get next booking number
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_booking_number(p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  -- Insert year if it doesn't exist (starting from 1),
  -- or increment the counter if it already exists
  INSERT INTO booking_sequences (year, current_number, created_at, updated_at)
  VALUES (p_year, 1, NOW(), NOW())
  ON CONFLICT (year)
  DO UPDATE SET
    current_number = booking_sequences.current_number + 1,
    updated_at = NOW()
  RETURNING current_number INTO v_next_number;

  RETURN v_next_number;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_next_booking_number(INTEGER) IS 'Gets the next sequential booking number for a given year. Creates the year record if it does not exist. This function is atomic and safe for concurrent use.';

-- ============================================================================
-- 3. Initialize current year (optional - will be created automatically on first use)
-- ============================================================================

-- Get current year and initialize the sequence
DO $$
DECLARE
  current_year INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

  -- Initialize current year with 0 (first booking will be 1)
  INSERT INTO booking_sequences (year, current_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;
END $$;

-- ============================================================================
-- 4. Grant necessary permissions (if using row-level security)
-- ============================================================================

-- Grant permissions to authenticated users to use the function
-- Uncomment if you're using Supabase RLS or similar
-- GRANT SELECT ON booking_sequences TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_next_booking_number(INTEGER) TO authenticated;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (for emergency use only)
-- ============================================================================

-- To rollback this migration:
-- 1. DROP FUNCTION get_next_booking_number(INTEGER);
-- 2. DROP TABLE booking_sequences;

-- Note: Rolling back will lose all sequence tracking data!
