-- Add dates_setting column to glamping_item_addons
ALTER TABLE glamping_item_addons
ADD COLUMN IF NOT EXISTS dates_setting VARCHAR(50) DEFAULT 'inherit_parent';
