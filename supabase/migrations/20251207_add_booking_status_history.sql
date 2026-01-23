-- Migration: Add booking_status_history table
-- Purpose: Track all booking changes from creation to completion
-- Date: 2025-12-07

-- Create booking_status_history table
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Action type: created, payment_received, status_changed, payment_status_changed, updated, cancelled, note_added
  action VARCHAR(50) NOT NULL,

  -- Status changes
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  old_payment_status VARCHAR(20),
  new_payment_status VARCHAR(20),

  -- Payment info (for payment_received action)
  payment_amount DECIMAL(12,2),
  payment_method VARCHAR(50),

  -- Who made the change
  actor_type VARCHAR(20) NOT NULL, -- 'customer', 'admin', 'system'
  actor_id UUID,
  actor_name VARCHAR(255),
  actor_email VARCHAR(255),

  -- Details
  description TEXT, -- Human-readable description
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_booking_history_booking ON booking_status_history(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_history_action ON booking_status_history(action);
CREATE INDEX IF NOT EXISTS idx_booking_history_actor ON booking_status_history(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_created ON booking_status_history(created_at DESC);

-- Add comment
COMMENT ON TABLE booking_status_history IS 'Tracks all booking changes from creation to completion';
COMMENT ON COLUMN booking_status_history.action IS 'Type of action: created, payment_received, status_changed, payment_status_changed, updated, cancelled, note_added';
COMMENT ON COLUMN booking_status_history.actor_type IS 'Who made the change: customer, admin, system';
