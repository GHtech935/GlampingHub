-- Migration: Create monthly_commission_payouts table
-- Created: 2025-12-11
-- Description: Track monthly commission payouts to campsite owners

BEGIN;

-- Create monthly_commission_payouts table
CREATE TABLE IF NOT EXISTS monthly_commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner & Campsite relationship
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campsite_id UUID REFERENCES campsites(id) ON DELETE SET NULL,

  -- Period (month/year)
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2025),

  -- Aggregated summary of bookings in this period
  total_bookings_count INTEGER DEFAULT 0 NOT NULL,
  total_paid_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  total_commission_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  total_owner_earnings DECIMAL(10,2) DEFAULT 0 NOT NULL,

  -- Payout status and tracking
  status VARCHAR(20) DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'processing', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  payment_method VARCHAR(50),
  payment_reference TEXT,

  -- Notes and comments
  notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure one payout record per owner+campsite+period
  UNIQUE(owner_id, campsite_id, period_month, period_year)
);

-- Add table comment
COMMENT ON TABLE monthly_commission_payouts IS
'Tracks monthly commission payouts to campsite owners.
Generated at end of each month by aggregating all owner_earnings from bookings.
Status flow: pending → processing → paid (or cancelled).
Unique constraint ensures one record per owner+campsite+period.';

-- Add column comments
COMMENT ON COLUMN monthly_commission_payouts.owner_id IS
'Reference to users table with role=owner. CASCADE delete if owner deleted.';

COMMENT ON COLUMN monthly_commission_payouts.campsite_id IS
'Reference to campsites table. SET NULL if campsite deleted (keep payout record for history).';

COMMENT ON COLUMN monthly_commission_payouts.period_month IS
'Month of payout period (1-12). Used with period_year to identify the period.';

COMMENT ON COLUMN monthly_commission_payouts.period_year IS
'Year of payout period (>= 2025). Used with period_month to identify the period.';

COMMENT ON COLUMN monthly_commission_payouts.total_bookings_count IS
'Count of bookings included in this payout (status != cancelled, owner_earnings > 0).';

COMMENT ON COLUMN monthly_commission_payouts.total_paid_amount IS
'Sum of paid amounts from all bookings in this period (deposit or full payment).';

COMMENT ON COLUMN monthly_commission_payouts.total_commission_amount IS
'Sum of system commission from all bookings in this period.';

COMMENT ON COLUMN monthly_commission_payouts.total_owner_earnings IS
'Sum of owner earnings from all bookings in this period (amount to be paid to owner).';

COMMENT ON COLUMN monthly_commission_payouts.status IS
'Payout status:
- pending: Generated, awaiting admin action
- processing: Admin is processing payment
- paid: Payment completed, paid_at timestamp recorded
- cancelled: Payout cancelled (e.g., dispute, error)';

COMMENT ON COLUMN monthly_commission_payouts.paid_at IS
'Timestamp when payout was marked as paid by admin.';

COMMENT ON COLUMN monthly_commission_payouts.paid_by IS
'Admin user who marked payout as paid (for audit trail).';

COMMENT ON COLUMN monthly_commission_payouts.payment_method IS
'Method used for payout: bank_transfer, cash, check, etc.';

COMMENT ON COLUMN monthly_commission_payouts.payment_reference IS
'Transaction reference number or tracking ID from payment system.';

COMMENT ON COLUMN monthly_commission_payouts.notes IS
'Public notes visible to owner (e.g., "Paid via bank transfer to account xxx").';

COMMENT ON COLUMN monthly_commission_payouts.admin_notes IS
'Internal admin notes not visible to owner (for admin reference only).';

-- Create indexes for efficient queries

-- Index for owner dashboard queries
CREATE INDEX IF NOT EXISTS idx_payouts_owner
ON monthly_commission_payouts(owner_id, period_year DESC, period_month DESC);

-- Index for admin filtering by status
CREATE INDEX IF NOT EXISTS idx_payouts_status
ON monthly_commission_payouts(status, period_year DESC, period_month DESC);

-- Index for campsite reports
CREATE INDEX IF NOT EXISTS idx_payouts_campsite
ON monthly_commission_payouts(campsite_id, period_year DESC, period_month DESC)
WHERE campsite_id IS NOT NULL;

-- Index for pending payouts (most common admin query)
CREATE INDEX IF NOT EXISTS idx_payouts_pending
ON monthly_commission_payouts(period_year DESC, period_month DESC, total_owner_earnings DESC)
WHERE status = 'pending';

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_monthly_payouts_updated_at
  BEFORE UPDATE ON monthly_commission_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_payouts_updated_at();

COMMIT;

-- Verification queries (commented out, run manually if needed)
--
-- Check table created:
-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_name = 'monthly_commission_payouts';
--
-- Check indexes created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'monthly_commission_payouts';
--
-- Check constraints:
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'monthly_commission_payouts';
