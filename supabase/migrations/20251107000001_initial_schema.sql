-- ==========================================
-- GLAMPINGHUB DATABASE SCHEMA
-- Complete schema from technical specification
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. LOCATION & CAMPSITE HIERARCHY
-- ==========================================

-- Regions (Vietnam provinces/areas)
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main campsites
CREATE TABLE campsites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES regions(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),

  -- Contact & Location
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),

  -- Policies
  check_in_time TIME DEFAULT '15:00:00',
  check_out_time TIME DEFAULT '11:00:00',
  min_stay_nights INTEGER DEFAULT 1,
  cancellation_policy TEXT,
  house_rules TEXT,

  -- Ratings & Status
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. SIMPLIFIED PITCH SYSTEM
-- ==========================================

-- Individual pitches - direct children of campsites
CREATE TABLE pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,

  -- Pitch identity
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,

  -- Capacity & specifications
  max_guests INTEGER NOT NULL,
  max_vehicles INTEGER DEFAULT 1,
  max_dogs INTEGER DEFAULT 0,

  -- Physical specifications
  pitch_size_width DECIMAL(5,2),
  pitch_size_depth DECIMAL(5,2),
  ground_type VARCHAR(100),

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  weekend_price DECIMAL(10,2),
  holiday_price DECIMAL(10,2),

  -- Status & ordering
  status VARCHAR(50) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(campsite_id, slug)
);

-- ==========================================
-- 3. PRODUCT SYSTEM WITHIN PITCHES
-- ==========================================

-- Products available at each pitch
CREATE TABLE pitch_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES pitches(id) ON DELETE CASCADE,

  -- Product details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'item',

  -- Tax configuration
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_type VARCHAR(50) DEFAULT 'inclusive',

  -- Availability
  is_available BOOLEAN DEFAULT true,
  max_quantity INTEGER DEFAULT 10,
  requires_advance_booking BOOLEAN DEFAULT false,
  advance_hours INTEGER DEFAULT 0,

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product inventory tracking
CREATE TABLE pitch_product_inventory (
  pitch_product_id UUID REFERENCES pitch_products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_quantity INTEGER NOT NULL,
  reserved_quantity INTEGER DEFAULT 0,
  notes TEXT,

  PRIMARY KEY (pitch_product_id, date)
);

-- ==========================================
-- 4. DISCOUNT & VOUCHER MANAGEMENT SYSTEM
-- ==========================================

-- Discount categories
CREATE TABLE discount_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Main discounts/vouchers table
CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES discount_categories(id),

  -- Basic information
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,

  -- Discount type and value
  discount_type VARCHAR(50) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,

  -- Applicability
  applies_to VARCHAR(50) DEFAULT 'total',
  max_discount_amount DECIMAL(10,2),
  min_order_amount DECIMAL(10,2),

  -- Usage limits
  usage_limit INTEGER,
  usage_limit_per_customer INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,

  -- Validity period
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,

  -- Conditions
  applicable_days JSONB,
  applicable_campsites JSONB,
  applicable_pitch_types JSONB,
  min_nights INTEGER,
  advance_booking_days INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_stackable BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. USER MANAGEMENT
-- ==========================================

-- Guest users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),

  -- Personal details
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Vietnam',

  -- Address
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  postal_code VARCHAR(20),

  -- Preferences
  marketing_consent BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin system
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,

  -- Role-based access
  role VARCHAR(50) DEFAULT 'admin',
  campsite_id UUID REFERENCES campsites(id),
  permissions JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 6. BOOKING SYSTEM
-- ==========================================

-- Main booking table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(20) UNIQUE NOT NULL,

  -- Relationships
  user_id UUID REFERENCES users(id),
  campsite_id UUID REFERENCES campsites(id) NOT NULL,
  pitch_id UUID REFERENCES pitches(id) NOT NULL,

  -- Guest info (for non-registered bookings)
  guest_email VARCHAR(255),
  guest_first_name VARCHAR(100),
  guest_last_name VARCHAR(100),
  guest_phone VARCHAR(20),
  guest_country VARCHAR(100),
  guest_address TEXT,

  -- Stay details
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,

  -- Party composition
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  vehicles INTEGER DEFAULT 1,
  dogs INTEGER DEFAULT 0,

  -- Other details
  type_of_visit VARCHAR(100),
  vehicle_registration VARCHAR(255),
  special_requirements TEXT,

  -- Pricing breakdown
  accommodation_cost DECIMAL(10,2) NOT NULL,
  products_cost DECIMAL(10,2) DEFAULT 0,
  products_tax DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,

  -- Calculated fields (cannot chain generated columns in PostgreSQL)
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (accommodation_cost + products_cost) STORED,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (accommodation_cost + products_cost + products_tax - discount_amount) STORED,

  -- Payment schedule
  deposit_percentage INTEGER DEFAULT 15,
  deposit_amount DECIMAL(10,2) GENERATED ALWAYS AS ((accommodation_cost + products_cost + products_tax - discount_amount) * deposit_percentage / 100) STORED,
  balance_amount DECIMAL(10,2) GENERATED ALWAYS AS ((accommodation_cost + products_cost + products_tax - discount_amount) - ((accommodation_cost + products_cost + products_tax - discount_amount) * deposit_percentage / 100)) STORED,

  -- Applied discount tracking
  discount_code VARCHAR(100),
  discount_id UUID REFERENCES discounts(id),

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',

  -- Admin notes
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CHECK (check_out_date > check_in_date),
  CHECK (adults > 0),
  CHECK (total_amount >= 0)
);

-- Booking products
CREATE TABLE booking_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  pitch_product_id UUID REFERENCES pitch_products(id),

  -- Product details (snapshot at booking time)
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100),
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Tax calculation
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(10,2) GENERATED ALWAYS AS ((unit_price * quantity) * (tax_rate / 100)) STORED,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS ((unit_price * quantity) + ((unit_price * quantity) * (tax_rate / 100))) STORED,

  -- Metadata
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discount usage tracking
CREATE TABLE discount_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),

  -- Usage details
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  original_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  final_amount DECIMAL(10,2) NOT NULL,

  -- User info (for non-registered users)
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20)
);

-- ==========================================
-- 7. AVAILABILITY & PRICING SYSTEM
-- ==========================================

-- Dynamic pricing calendar
CREATE TABLE pricing_calendar (
  pitch_id UUID REFERENCES pitches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  min_stay_nights INTEGER DEFAULT 1,

  -- Rule metadata
  price_type VARCHAR(50) DEFAULT 'standard',
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (pitch_id, date)
);

-- Availability tracking
CREATE TABLE availability_calendar (
  pitch_id UUID REFERENCES pitches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'available',
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (pitch_id, date)
);

-- ==========================================
-- 8. FILTERING SYSTEM
-- ==========================================

-- Filter categories
CREATE TABLE filter_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- All possible filters
CREATE TABLE filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES filter_categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campsite-level amenities
CREATE TABLE campsite_filters (
  campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,
  filter_id UUID REFERENCES filters(id) ON DELETE CASCADE,
  is_included BOOLEAN DEFAULT true,
  additional_cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  PRIMARY KEY (campsite_id, filter_id)
);

-- Pitch-specific features
CREATE TABLE pitch_features (
  pitch_id UUID REFERENCES pitches(id) ON DELETE CASCADE,
  filter_id UUID REFERENCES filters(id) ON DELETE CASCADE,
  is_included BOOLEAN DEFAULT true,
  additional_cost DECIMAL(10,2) DEFAULT 0,
  max_quantity INTEGER DEFAULT 1,
  notes TEXT,
  PRIMARY KEY (pitch_id, filter_id)
);

-- ==========================================
-- 9. PAYMENT PROCESSING
-- ==========================================

-- Payment tracking
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'VND',
  payment_type VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,

  -- External payment IDs
  external_payment_id VARCHAR(255),
  external_transaction_id VARCHAR(255),

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending',

  -- Metadata
  payment_metadata JSONB DEFAULT '{}',
  failure_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 10. REVIEWS & RATINGS
-- ==========================================

-- Customer reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,
  pitch_id UUID REFERENCES pitches(id),
  user_id UUID REFERENCES users(id),

  -- Review content
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 10),
  title VARCHAR(255),
  review_text TEXT,

  -- Detailed ratings
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 10),
  facilities_rating INTEGER CHECK (facilities_rating >= 1 AND facilities_rating <= 10),
  location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 10),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 10),

  -- Review metadata
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  helpful_votes INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 11. MEDIA MANAGEMENT
-- ==========================================

-- Images for campsites, pitches, regions
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,

  -- File information
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Image specific
  width INTEGER,
  height INTEGER,
  alt_text VARCHAR(255),

  -- Organization
  title VARCHAR(255),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_media_entity ON media(entity_type, entity_id, sort_order);

-- ==========================================
-- 12. SEARCH & ANALYTICS
-- ==========================================

-- Track popular searches
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  location VARCHAR(255),
  check_in_date DATE,
  check_out_date DATE,
  guests INTEGER,
  filters_applied JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_availability_calendar_pitch_date ON availability_calendar(pitch_id, date);
CREATE INDEX idx_pricing_calendar_pitch_date ON pricing_calendar(pitch_id, date);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status, payment_status);
CREATE INDEX idx_campsites_region ON campsites(region_id, is_active);
CREATE INDEX idx_pitches_campsite ON pitches(campsite_id, is_active);
CREATE INDEX idx_reviews_campsite ON reviews(campsite_id, is_verified);
CREATE INDEX idx_reviews_pitch ON reviews(pitch_id, is_verified);
CREATE INDEX idx_search_queries_location ON search_queries(location);
CREATE INDEX idx_search_queries_dates ON search_queries(check_in_date, check_out_date);

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Insert discount categories
INSERT INTO discount_categories (name, slug, description, sort_order) VALUES
('DISCOUNTS', 'discounts', 'Automatic and promotional discounts', 1),
('VOUCHERS', 'vouchers', 'Customer voucher codes', 2);

-- Insert filter categories
INSERT INTO filter_categories (name, slug, sort_order) VALUES
('Popular', 'popular', 1),
('Accommodation Categories', 'accommodation-categories', 2),
('Pitch/Visit Information', 'pitch-visit-information', 3),
('Leisure on Site', 'leisure-on-site', 4),
('Amenities on Site', 'amenities-on-site', 5),
('Rules', 'rules', 6),
('Nearby Amenities', 'nearby-amenities', 7),
('Accessibility', 'accessibility', 8),
('Themes', 'themes', 9),
('Type', 'type', 10),
('Utilities', 'utilities', 11);
