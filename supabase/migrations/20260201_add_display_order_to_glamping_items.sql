-- Add display_order column to glamping_items table
ALTER TABLE glamping_items ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for efficient sorting by zone and display_order
CREATE INDEX idx_glamping_items_display_order ON glamping_items(zone_id, display_order);

-- Set existing items sequentially by created_at within each zone
UPDATE glamping_items SET display_order = subq.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY zone_id ORDER BY created_at ASC) as row_num
  FROM glamping_items
) subq
WHERE glamping_items.id = subq.id;
