-- Add guest limit columns to glamping_menu_items table
-- These columns define the guest capacity for combo menu items

ALTER TABLE glamping_menu_items
ADD COLUMN IF NOT EXISTS min_guests INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT NULL;

-- Add constraint to ensure max_guests >= min_guests when both are set
ALTER TABLE glamping_menu_items
ADD CONSTRAINT check_menu_item_guest_limits
CHECK (
  (min_guests IS NULL OR max_guests IS NULL) OR (max_guests >= min_guests)
);

-- Add column comments for documentation
COMMENT ON COLUMN glamping_menu_items.min_guests IS
'Minimum number of guests for this combo menu item. NULL = no minimum limit (traditional single-item mode).';

COMMENT ON COLUMN glamping_menu_items.max_guests IS
'Maximum number of guests for this combo menu item. NULL = no maximum limit (traditional single-item mode). When min_guests = max_guests (fixed combo), the quantity field represents the number of times the combo is selected.';
