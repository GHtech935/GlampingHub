-- Migration: Add tax_invoice_required field to bookings table
-- Date: 2025-11-20
-- Description: Adds flag to indicate whether customer requires red invoice (VAT invoice)
--              This implements the new tax calculation logic where tax is optional

BEGIN;

-- Add column tax_invoice_required to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tax_invoice_required BOOLEAN DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN bookings.tax_invoice_required IS
'Indicates whether customer requires red invoice (VAT invoice).
- TRUE: Customer requests VAT invoice, tax is calculated and included in grand_total
- FALSE: No VAT invoice needed, grand_total excludes tax (customer pays less)
Default: false (customer does not pay tax unless they explicitly request invoice)';

-- Add index for filtering bookings by tax invoice status
CREATE INDEX IF NOT EXISTS idx_bookings_tax_invoice_required
ON bookings(tax_invoice_required);

-- Update existing bookings to maintain backward compatibility
-- Old system always included tax, so set existing bookings to TRUE
-- This ensures historical data remains accurate
UPDATE bookings
SET tax_invoice_required = true
WHERE created_at < '2025-11-20 00:00:00+07'
  AND tax_invoice_required IS NULL OR tax_invoice_required = false;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: tax_invoice_required field added to bookings table';
  RAISE NOTICE 'Updated % existing bookings to tax_invoice_required=true for backward compatibility',
    (SELECT COUNT(*) FROM bookings WHERE created_at < '2025-11-20 00:00:00+07');
END $$;

COMMIT;
