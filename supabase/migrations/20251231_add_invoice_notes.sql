-- Migration: Add invoice_notes column to bookings table
-- Created: 2025-12-31
-- Description: Adds a field for customers/admin to add notes for invoice generation

-- Add invoice_notes column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN bookings.invoice_notes IS 'Notes/requirements for invoice generation (HTML formatted from rich text editor)';

-- Create index for searching (optional, but useful if you need to search notes)
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_notes ON bookings(invoice_notes) WHERE invoice_notes IS NOT NULL;
