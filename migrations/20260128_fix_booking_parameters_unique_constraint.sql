-- Migration: Fix glamping_booking_parameters unique constraint for multi-tent bookings
-- Problem: The original UNIQUE(booking_id, parameter_id) prevents the same parameter
--          from appearing in multiple tents within the same booking.
-- Fix: Replace with UNIQUE(booking_id, booking_tent_id, parameter_id)

-- Drop the old constraint
ALTER TABLE glamping_booking_parameters
DROP CONSTRAINT glamping_booking_parameters_booking_id_parameter_id_key;

-- Add the new constraint that includes booking_tent_id
ALTER TABLE glamping_booking_parameters
ADD CONSTRAINT glamping_booking_parameters_booking_tent_param_key
UNIQUE (booking_id, booking_tent_id, parameter_id);
