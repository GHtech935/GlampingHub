-- Add display_order column to glamping_item_event_items table
-- This allows prioritizing events when multiple events of the same type apply to an item

ALTER TABLE glamping_item_event_items
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Add index for better query performance when ordering by display_order
CREATE INDEX idx_glamping_item_event_items_display_order
ON glamping_item_event_items(item_id, display_order DESC);

-- Comment for documentation
COMMENT ON COLUMN glamping_item_event_items.display_order IS
'Display order for events when multiple events of the same type apply to the same item. Higher values have higher priority.';
