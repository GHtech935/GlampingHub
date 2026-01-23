-- Add application_type column to glamping_discounts
ALTER TABLE glamping_discounts
ADD COLUMN application_type VARCHAR(20) DEFAULT 'tent'
CHECK (application_type IN ('tent', 'menu'));

-- Add index for filtering
CREATE INDEX idx_glamping_discounts_application_type
ON glamping_discounts(application_type);

-- Comment
COMMENT ON COLUMN glamping_discounts.application_type IS
'Type of items this discount applies to: tent or menu';

-- Update existing records to 'tent' (backward compatibility)
UPDATE glamping_discounts SET application_type = 'tent' WHERE application_type IS NULL;
