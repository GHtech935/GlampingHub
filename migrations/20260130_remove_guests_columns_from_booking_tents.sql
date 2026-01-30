-- Remove hardcoded guest columns from glamping_booking_tents
-- Guest data should come from glamping_booking_parameters instead

ALTER TABLE glamping_booking_tents DROP COLUMN IF EXISTS total_guests;
ALTER TABLE glamping_booking_tents DROP COLUMN IF EXISTS adults;
ALTER TABLE glamping_booking_tents DROP COLUMN IF EXISTS children;
