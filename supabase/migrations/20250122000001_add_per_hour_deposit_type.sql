-- Add 'per_hour' to deposit type CHECK constraint
-- This allows items to have hourly deposit rates

-- Drop existing constraint
ALTER TABLE glamping_deposit_settings
  DROP CONSTRAINT IF EXISTS glamping_deposit_settings_type_check;

-- Add updated constraint with 'per_hour' included
ALTER TABLE glamping_deposit_settings
  ADD CONSTRAINT glamping_deposit_settings_type_check
  CHECK (type IN ('percentage', 'fixed', 'per_day', 'per_hour', 'per_quantity'));

-- Optional: Update any existing 'per_day' records to 'per_hour' if needed
-- Uncomment the line below if you want to migrate existing data
-- UPDATE glamping_deposit_settings
-- SET type = 'per_hour'
-- WHERE type = 'per_day';
