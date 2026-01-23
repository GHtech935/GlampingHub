-- ============================================
-- GLAMPING INVENTORY SYSTEM
-- Prefix: glamping_ to separate from camping
-- Date: 2026-01-08
-- ============================================

-- 1. CATEGORIES
CREATE TABLE glamping_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    weight INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TAGS
CREATE TABLE glamping_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    weight INTEGER DEFAULT 0,
    visibility VARCHAR(20) DEFAULT 'staff' CHECK (visibility IN ('staff', 'everyone')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. ITEMS (Main inventory items)
CREATE TABLE glamping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES glamping_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. ITEM TAGS (Many-to-many)
CREATE TABLE glamping_item_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES glamping_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id, tag_id)
);

-- 5. ITEM ATTRIBUTES
CREATE TABLE glamping_item_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE UNIQUE,
    inventory_quantity INTEGER DEFAULT 1,
    unlimited_inventory BOOLEAN DEFAULT FALSE,
    allocation_type VARCHAR(20) DEFAULT 'per_night'
        CHECK (allocation_type IN ('per_day', 'per_night', 'per_hour', 'timeslots')),
    fixed_length_value INTEGER,
    fixed_length_unit VARCHAR(10) CHECK (fixed_length_unit IN ('days', 'nights', 'hours')),
    fixed_start_time TIME,
    default_length_hours INTEGER,
    visibility VARCHAR(20) DEFAULT 'everyone'
        CHECK (visibility IN ('everyone', 'staff_only', 'packages_only')),
    default_calendar_status VARCHAR(20) DEFAULT 'available'
        CHECK (default_calendar_status IN ('available', 'unavailable', 'disabled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. PARAMETERS (adults, children, etc.)
CREATE TABLE glamping_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    color_code VARCHAR(7),
    controls_inventory BOOLEAN DEFAULT FALSE,
    sets_pricing BOOLEAN DEFAULT TRUE,
    price_range BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) DEFAULT 'everyone' CHECK (visibility IN ('everyone', 'staff')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. ITEM PARAMETERS (Parameters attached to items)
CREATE TABLE glamping_item_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    parameter_id UUID REFERENCES glamping_parameters(id) ON DELETE CASCADE,
    min_quantity INTEGER DEFAULT 0,
    max_quantity INTEGER DEFAULT 10,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id, parameter_id)
);

-- 8. TIMESLOTS (For allocation_type = 'timeslots')
CREATE TABLE glamping_timeslots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. ITEM MEDIA (Images & Videos)
CREATE TABLE glamping_item_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('image', 'youtube')),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. RULE SETS
CREATE TABLE glamping_rule_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. RULES
CREATE TABLE glamping_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_id UUID REFERENCES glamping_rule_sets(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL,
    value INTEGER,
    unit VARCHAR(10) CHECK (unit IN ('days', 'hours', 'nights', 'items', 'amount')),
    apply_to_customer BOOLEAN DEFAULT TRUE,
    apply_to_staff BOOLEAN DEFAULT TRUE,
    is_strict BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. ITEM EVENTS (Seasonal, Special, Closure)
CREATE TABLE glamping_item_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('seasonal', 'special', 'closure')),
    start_date DATE,
    end_date DATE,
    recurrence VARCHAR(20) DEFAULT 'one_time'
        CHECK (recurrence IN ('one_time', 'weekly', 'monthly', 'yearly')),
    days_of_week INTEGER[],
    pricing_type VARCHAR(20) DEFAULT 'base_price'
        CHECK (pricing_type IN ('base_price', 'new_price', 'dynamic', 'yield')),
    rules_id UUID REFERENCES glamping_rule_sets(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. ITEM EVENT ITEMS (Many-to-many)
CREATE TABLE glamping_item_event_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES glamping_item_events(id) ON DELETE CASCADE,
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, item_id)
);

-- 14. PRICING
CREATE TABLE glamping_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    parameter_id UUID REFERENCES glamping_parameters(id) ON DELETE CASCADE,
    event_id UUID REFERENCES glamping_item_events(id) ON DELETE CASCADE,
    group_min INTEGER,
    group_max INTEGER,
    amount DECIMAL(12, 2) NOT NULL,
    rate_type VARCHAR(20) DEFAULT 'per_night'
        CHECK (rate_type IN ('per_hour', 'per_timeslot', 'per_day', 'per_night')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 15. TAXES
CREATE TABLE glamping_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'normal' CHECK (type IN ('normal', 'vat', 'service')),
    apply_to VARCHAR(20) DEFAULT 'all_customers' CHECK (apply_to IN ('all_customers', 'specific')),
    amount DECIMAL(10, 2) NOT NULL,
    is_percentage BOOLEAN DEFAULT TRUE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 16. ITEM TAXES
CREATE TABLE glamping_item_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    tax_id UUID REFERENCES glamping_taxes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id, tax_id)
);

-- 17. DEPOSIT SETTINGS
CREATE TABLE glamping_deposit_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE UNIQUE,
    type VARCHAR(20) DEFAULT 'percentage'
        CHECK (type IN ('percentage', 'fixed', 'per_day', 'per_quantity')),
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 18. ITEM ADD-ONS / PACKAGES
CREATE TABLE glamping_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    addon_item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    price_percentage INTEGER DEFAULT 100,
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id, addon_item_id)
);

-- 19. PACKAGE SETTINGS
CREATE TABLE glamping_package_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE UNIQUE,
    show_starting_price BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 20. DISCOUNTS
CREATE TABLE glamping_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    type VARCHAR(20) CHECK (type IN ('percentage', 'fixed')),
    amount DECIMAL(12, 2) NOT NULL,
    apply_type VARCHAR(20) DEFAULT 'per_booking'
        CHECK (apply_type IN ('per_booking', 'per_item')),
    apply_after_tax BOOLEAN DEFAULT FALSE,
    recurrence VARCHAR(20) DEFAULT 'always'
        CHECK (recurrence IN ('always', 'one_time', 'date_range')),
    start_date DATE,
    end_date DATE,
    rules_id UUID REFERENCES glamping_rule_sets(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 21. DISCOUNT ITEMS
CREATE TABLE glamping_discount_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_id UUID REFERENCES glamping_discounts(id) ON DELETE CASCADE,
    item_id UUID REFERENCES glamping_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(discount_id, item_id)
);

-- 22. BOOKINGS (Glamping-only, NO owner, NO commission)
CREATE TABLE glamping_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    payment_status VARCHAR(30) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'failed')),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
    guests JSONB DEFAULT '{}'::jsonb,
    total_guests INTEGER DEFAULT 1,
    subtotal_amount DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) GENERATED ALWAYS AS ((subtotal_amount + tax_amount) - discount_amount) STORED,
    deposit_due DECIMAL(12, 2),
    balance_due DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'VND',
    customer_notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

-- 23. BOOKING ITEMS
CREATE TABLE glamping_booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    item_id UUID REFERENCES glamping_items(id) ON DELETE SET NULL,
    parameter_id UUID REFERENCES glamping_parameters(id) ON DELETE SET NULL,
    addon_item_id UUID REFERENCES glamping_items(id) ON DELETE SET NULL,
    allocation_type VARCHAR(20),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 24. BOOKING PARAMETERS SNAPSHOT
CREATE TABLE glamping_booking_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    parameter_id UUID REFERENCES glamping_parameters(id) ON DELETE SET NULL,
    label VARCHAR(255) NOT NULL,
    min_quantity INTEGER,
    max_quantity INTEGER,
    booked_quantity INTEGER NOT NULL DEFAULT 0,
    controls_inventory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(booking_id, parameter_id)
);

-- 25. BOOKING PAYMENTS
CREATE TABLE glamping_booking_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'awaiting_confirmation', 'paid', 'failed', 'refunded')),
    transaction_reference VARCHAR(100),
    paid_at TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 26. BOOKING STATUS HISTORY
CREATE TABLE glamping_booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    previous_payment_status VARCHAR(30),
    new_payment_status VARCHAR(30),
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 27. BOOKING TAXES SNAPSHOT
CREATE TABLE glamping_booking_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES glamping_bookings(id) ON DELETE CASCADE,
    tax_id UUID REFERENCES glamping_taxes(id) ON DELETE SET NULL,
    tax_name VARCHAR(255),
    tax_rate DECIMAL(5, 2),
    tax_amount DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 28. DISCOUNT VOUCHERS
CREATE TABLE glamping_discount_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_id UUID REFERENCES glamping_discounts(id) ON DELETE CASCADE,
    code VARCHAR(100) UNIQUE NOT NULL,
    used_at TIMESTAMP,
    used_by_glamping_booking_id UUID REFERENCES glamping_bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 29. BOOKING SEQUENCES (for GH- codes)
CREATE TABLE glamping_booking_sequences (
    year INTEGER PRIMARY KEY,
    current_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DATABASE FUNCTION: Get Next Glamping Booking Number
-- ============================================
CREATE OR REPLACE FUNCTION get_next_glamping_booking_number(p_year INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  INSERT INTO glamping_booking_sequences (year, current_number, created_at, updated_at)
  VALUES (p_year, 1, NOW(), NOW())
  ON CONFLICT (year)
  DO UPDATE SET
    current_number = glamping_booking_sequences.current_number + 1,
    updated_at = NOW()
  RETURNING current_number INTO v_next_number;

  RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_glamping_items_category ON glamping_items(category_id);
CREATE INDEX idx_glamping_items_sku ON glamping_items(sku);
CREATE INDEX idx_glamping_item_tags_item ON glamping_item_tags(item_id);
CREATE INDEX idx_glamping_item_tags_tag ON glamping_item_tags(tag_id);
CREATE INDEX idx_glamping_item_parameters_item ON glamping_item_parameters(item_id);
CREATE INDEX idx_glamping_pricing_item ON glamping_pricing(item_id);
CREATE INDEX idx_glamping_pricing_event ON glamping_pricing(event_id);
CREATE INDEX idx_glamping_discounts_code ON glamping_discounts(code);
CREATE INDEX idx_glamping_discount_vouchers_code ON glamping_discount_vouchers(code);
CREATE INDEX idx_glamping_bookings_code ON glamping_bookings(booking_code);
CREATE INDEX idx_glamping_bookings_customer ON glamping_bookings(customer_id);
CREATE INDEX idx_glamping_bookings_status ON glamping_bookings(status);
CREATE INDEX idx_glamping_bookings_payment_status ON glamping_bookings(payment_status);
CREATE INDEX idx_glamping_bookings_dates ON glamping_bookings(check_in_date, check_out_date);
CREATE INDEX idx_glamping_booking_items_booking ON glamping_booking_items(booking_id);
CREATE INDEX idx_glamping_booking_payments_booking ON glamping_booking_payments(booking_id);
CREATE INDEX idx_glamping_booking_status_history_booking ON glamping_booking_status_history(booking_id);
