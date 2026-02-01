-- Create customer_glamping_wishlists table
-- Allows customers to save glamping items to their wishlist

CREATE TABLE IF NOT EXISTS customer_glamping_wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES glamping_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, item_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_glamping_wishlists_customer
  ON customer_glamping_wishlists(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_glamping_wishlists_item
  ON customer_glamping_wishlists(item_id);

-- Add comments
COMMENT ON TABLE customer_glamping_wishlists IS 'Customer wishlist for glamping items';
COMMENT ON COLUMN customer_glamping_wishlists.customer_id IS 'Reference to the customer';
COMMENT ON COLUMN customer_glamping_wishlists.item_id IS 'Reference to the glamping item saved to wishlist';
