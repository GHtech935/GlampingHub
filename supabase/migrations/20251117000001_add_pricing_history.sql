-- Migration: Add pricing history tracking for audit trail
-- Created: 2025-11-17
-- Description: Create pricing_history table to track all price changes with revert capability

-- Create pricing_history table to store snapshots of pricing changes
CREATE TABLE pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the bulk operation (groups all changes made in one save action)
  bulk_operation_id UUID NOT NULL,

  -- What was changed
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Snapshot of pricing data BEFORE the change
  -- We store the complete state so we can revert to it
  old_price_per_night DECIMAL(10,2),
  old_min_stay_nights INTEGER,
  old_max_stay_nights INTEGER,
  old_extra_person_child_price DECIMAL(10,2),
  old_extra_person_adult_price DECIMAL(10,2),
  old_min_advance_days INTEGER,
  old_max_advance_days INTEGER,
  old_price_type VARCHAR(50),
  old_notes TEXT,

  -- Snapshot of pricing data AFTER the change
  new_price_per_night DECIMAL(10,2),
  new_min_stay_nights INTEGER,
  new_max_stay_nights INTEGER,
  new_extra_person_child_price DECIMAL(10,2),
  new_extra_person_adult_price DECIMAL(10,2),
  new_min_advance_days INTEGER,
  new_max_advance_days INTEGER,
  new_price_type VARCHAR(50),
  new_notes TEXT,

  -- Who made the change
  changed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_user_name VARCHAR(255),
  changed_by_user_email VARCHAR(255),

  -- Type of operation
  operation_type VARCHAR(50) NOT NULL DEFAULT 'update', -- 'create', 'update', 'revert'

  -- Request context for security audit
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_pricing_history_pitch_date ON pricing_history(pitch_id, date, created_at DESC);
CREATE INDEX idx_pricing_history_bulk_operation ON pricing_history(bulk_operation_id, created_at DESC);
CREATE INDEX idx_pricing_history_admin ON pricing_history(changed_by_admin_id, created_at DESC);
CREATE INDEX idx_pricing_history_created_at ON pricing_history(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE pricing_history IS 'Audit trail for all pricing changes with full snapshot history';
COMMENT ON COLUMN pricing_history.bulk_operation_id IS 'Groups all changes made in a single bulk update operation';
COMMENT ON COLUMN pricing_history.operation_type IS 'Type of operation: create, update, or revert';
COMMENT ON COLUMN pricing_history.old_price_per_night IS 'Price before the change (NULL for new entries)';
COMMENT ON COLUMN pricing_history.new_price_per_night IS 'Price after the change';
COMMENT ON COLUMN pricing_history.changed_by_admin_id IS 'Staff/admin user who made the pricing change (nullable for system changes or when user is deleted)';
COMMENT ON COLUMN pricing_history.ip_address IS 'IP address of the request for security audit';
COMMENT ON COLUMN pricing_history.created_at IS 'Timestamp when the change was made';
