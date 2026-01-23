-- Migration: Add applies_to_all_campsite_pitch field for VOUCHERs
-- This allows vouchers to apply to ALL campsites and pitches automatically
-- When TRUE: voucher applies to any campsite/pitch booking (excludes products/extras)
-- When FALSE: voucher uses normal applicability selection (campsites/pitches/products)

-- Add new column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'discounts'
        AND column_name = 'applies_to_all_campsite_pitch'
    ) THEN
        ALTER TABLE discounts
        ADD COLUMN applies_to_all_campsite_pitch BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN discounts.applies_to_all_campsite_pitch IS
'For VOUCHERs only: When TRUE, applies to all campsite and pitch bookings (excludes products/extras). When FALSE, uses normal applicable_* fields.';

-- Update existing vouchers to default FALSE (explicit)
UPDATE discounts d
SET applies_to_all_campsite_pitch = FALSE
WHERE d.category_id IN (
  SELECT id FROM discount_categories WHERE slug = 'vouchers'
);
