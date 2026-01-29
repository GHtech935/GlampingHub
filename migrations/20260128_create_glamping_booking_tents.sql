-- Migration: Create glamping_booking_tents table
-- Purpose: Store per-tent booking data as an intermediate layer between bookings and child tables

-- 1. Create glamping_booking_tents table
CREATE TABLE glamping_booking_tents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES glamping_items(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
    adults INTEGER NOT NULL DEFAULT 0,
    children INTEGER NOT NULL DEFAULT 0,
    total_guests INTEGER GENERATED ALWAYS AS (adults + children) STORED,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    special_requests TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_tents_booking ON glamping_booking_tents(booking_id);
CREATE INDEX idx_booking_tents_item ON glamping_booking_tents(item_id);
CREATE INDEX idx_booking_tents_dates ON glamping_booking_tents(check_in_date, check_out_date);

-- 2. Add booking_tent_id to child tables
ALTER TABLE glamping_booking_items
ADD COLUMN booking_tent_id UUID REFERENCES glamping_booking_tents(id) ON DELETE CASCADE;

ALTER TABLE glamping_booking_parameters
ADD COLUMN booking_tent_id UUID REFERENCES glamping_booking_tents(id) ON DELETE CASCADE;

ALTER TABLE glamping_booking_menu_products
ADD COLUMN booking_tent_id UUID REFERENCES glamping_booking_tents(id) ON DELETE CASCADE;

-- 3. Indexes for new FK columns
CREATE INDEX idx_booking_items_tent ON glamping_booking_items(booking_tent_id);
CREATE INDEX idx_booking_params_tent ON glamping_booking_parameters(booking_tent_id);
CREATE INDEX idx_booking_menu_tent ON glamping_booking_menu_products(booking_tent_id);
