-- Migration: Create glamping_booking_additional_costs table
-- This table stores additional charges (damages, extra services, custom charges) for bookings

CREATE TABLE IF NOT EXISTS glamping_booking_additional_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,          -- Tên hạng mục
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,  -- Đơn giá
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
        CASE WHEN tax_rate > 0 THEN ROUND(quantity * unit_price * tax_rate / 100, 0) ELSE 0 END
    ) STORED,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by booking
CREATE INDEX IF NOT EXISTS idx_additional_costs_booking ON glamping_booking_additional_costs(booking_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_additional_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_additional_costs_updated_at ON glamping_booking_additional_costs;
CREATE TRIGGER trigger_update_additional_costs_updated_at
    BEFORE UPDATE ON glamping_booking_additional_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_additional_costs_updated_at();

-- Enable RLS
ALTER TABLE glamping_booking_additional_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (staff can read/write, customers can read their own)
CREATE POLICY "Staff can manage additional costs"
    ON glamping_booking_additional_costs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('superadmin', 'admin', 'staff', 'owner')
        )
    );

CREATE POLICY "Customers can view their own additional costs"
    ON glamping_booking_additional_costs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM glamping_bookings gb
            WHERE gb.id = booking_id
            AND gb.customer_id = auth.uid()
        )
    );
