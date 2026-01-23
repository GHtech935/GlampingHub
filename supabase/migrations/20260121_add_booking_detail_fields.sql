-- Add separate columns for special requirements, party names, and invoice notes
ALTER TABLE glamping_bookings
ADD COLUMN IF NOT EXISTS special_requirements TEXT,
ADD COLUMN IF NOT EXISTS party_names TEXT,
ADD COLUMN IF NOT EXISTS invoice_notes TEXT;

-- Add comment to explain the fields
COMMENT ON COLUMN glamping_bookings.special_requirements IS 'Special requests from customer (e.g., dietary requirements, accessibility needs)';
COMMENT ON COLUMN glamping_bookings.party_names IS 'Names of all party members';
COMMENT ON COLUMN glamping_bookings.invoice_notes IS 'Notes for invoice generation';
