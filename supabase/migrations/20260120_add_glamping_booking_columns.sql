-- Add missing columns to glamping_bookings table for invoice and tax features

-- Add invoice_notes column
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS invoice_notes TEXT;

-- Add special_requirements column
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS special_requirements TEXT;

-- Add tax_invoice_required column (default false - no VAT invoice)
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS tax_invoice_required BOOLEAN DEFAULT FALSE;

-- Add tax_rate column (default 10%)
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) DEFAULT 10;

-- Add party_names column
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS party_names TEXT;

-- Update total_amount to not be generated (so we can update it when toggling tax)
-- Note: This requires recreating the column since GENERATED columns can't be altered
-- We'll handle this by keeping the constraint logic in the application

COMMENT ON COLUMN glamping_bookings.invoice_notes IS 'Notes for invoice/billing purposes';
COMMENT ON COLUMN glamping_bookings.special_requirements IS 'Special requirements from the guest';
COMMENT ON COLUMN glamping_bookings.tax_invoice_required IS 'Whether customer requires VAT invoice';
COMMENT ON COLUMN glamping_bookings.tax_rate IS 'VAT rate percentage (default 10%)';
COMMENT ON COLUMN glamping_bookings.party_names IS 'Names of party members';
