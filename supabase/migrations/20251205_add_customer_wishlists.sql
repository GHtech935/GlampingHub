-- Create customer_wishlists table for storing favorite campsites
CREATE TABLE IF NOT EXISTS customer_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  campsite_id UUID NOT NULL REFERENCES campsites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, campsite_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON customer_wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_campsite ON customer_wishlists(campsite_id);

-- Add comment
COMMENT ON TABLE customer_wishlists IS 'Stores customer favorite campsites (wishlist)';
