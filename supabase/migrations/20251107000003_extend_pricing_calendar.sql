-- Migration: Extend pricing_calendar and availability_calendar for advanced pricing features
-- Created: 2025-11-07
-- Description: Add fields for arrival/departure control and extra person pricing

-- Extend availability_calendar with arrival/departure controls
ALTER TABLE availability_calendar
ADD COLUMN arrival_allowed BOOLEAN DEFAULT true,
ADD COLUMN departure_allowed BOOLEAN DEFAULT true;

-- Extend pricing_calendar with extra person pricing
ALTER TABLE pricing_calendar
ADD COLUMN extra_person_child_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN extra_person_adult_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN max_stay_nights INTEGER DEFAULT NULL,
ADD COLUMN min_advance_days INTEGER DEFAULT 0,
ADD COLUMN max_advance_days INTEGER DEFAULT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pricing_calendar_date_range ON pricing_calendar(pitch_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_calendar_date_range ON availability_calendar(pitch_id, date);

-- Update existing records to have sensible defaults
UPDATE availability_calendar
SET arrival_allowed = true, departure_allowed = true
WHERE arrival_allowed IS NULL OR departure_allowed IS NULL;

UPDATE pricing_calendar
SET extra_person_child_price = 0, extra_person_adult_price = 0
WHERE extra_person_child_price IS NULL OR extra_person_adult_price IS NULL;

-- Comments for documentation
COMMENT ON COLUMN availability_calendar.arrival_allowed IS 'Whether guests can arrive on this date';
COMMENT ON COLUMN availability_calendar.departure_allowed IS 'Whether guests can depart on this date';
COMMENT ON COLUMN pricing_calendar.extra_person_child_price IS 'Additional price per child per night';
COMMENT ON COLUMN pricing_calendar.extra_person_adult_price IS 'Additional price per adult per night';
COMMENT ON COLUMN pricing_calendar.max_stay_nights IS 'Maximum nights allowed for bookings on this date';
COMMENT ON COLUMN pricing_calendar.min_advance_days IS 'Minimum days in advance required to book';
COMMENT ON COLUMN pricing_calendar.max_advance_days IS 'Maximum days in advance allowed to book';
