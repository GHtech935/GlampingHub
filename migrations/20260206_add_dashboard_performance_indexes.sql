-- Performance indexes for dashboard API
-- These indexes speed up the zone booking ID lookup that powers all dashboard queries

-- Composite index for the booking_items → items join used to find bookings in a zone
CREATE INDEX IF NOT EXISTS idx_glamping_booking_items_item_booking
  ON glamping_booking_items(item_id, booking_id);

-- Index on bookings created_at for daily/monthly aggregation queries
CREATE INDEX IF NOT EXISTS idx_glamping_bookings_created_at
  ON glamping_bookings(created_at);
