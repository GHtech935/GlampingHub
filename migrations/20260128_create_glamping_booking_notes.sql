-- Create glamping_booking_notes table for internal staff notes on bookings
CREATE TABLE IF NOT EXISTS glamping_booking_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES glamping_bookings(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by booking, ordered by newest first
CREATE INDEX IF NOT EXISTS idx_glamping_booking_notes_booking_created
  ON glamping_booking_notes (booking_id, created_at DESC);
