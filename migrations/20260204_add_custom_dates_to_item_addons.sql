-- Add custom_start_date and custom_end_date columns to glamping_item_addons
-- Used when dates_setting = 'custom'
ALTER TABLE glamping_item_addons
ADD COLUMN IF NOT EXISTS custom_start_date DATE,
ADD COLUMN IF NOT EXISTS custom_end_date DATE;
