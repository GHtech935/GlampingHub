-- GlampingHub Complete Database Schema
-- Generated: Tue Nov 18 23:54:56 +07 2025
-- This file contains all migrations combined in order


-- ============================================
-- Migration: 20251107000001_initial_schema.sql
-- ============================================

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

-- ============================================
-- Migration: 005_restructure_users_customers.sql
-- ============================================

-- ==========================================
-- Migration 005: Restructure Users & Customers
--
-- Changes:
-- 1. admins → users (staff with 3 roles: admin, sale, operations)
-- 2. users → customers (guests/customers)
-- 3. admin_sessions → deleted (not used in code)
-- 4. Update all foreign keys
-- ==========================================

BEGIN;

-- ==========================================
-- PHASE 1: BACKUP OLD TABLES
-- ==========================================

ALTER TABLE admins RENAME TO admins_backup;
ALTER TABLE users RENAME TO users_backup;

-- ==========================================
-- PHASE 2: CREATE NEW TABLES
-- ==========================================

-- Create new users table (for staff)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,

  -- Role-based access (Admin, Sale, Operations)
  role VARCHAR(50) DEFAULT 'operations' CHECK (role IN ('admin', 'sale', 'operations')),
  campsite_id UUID REFERENCES campsites(id),
  permissions JSONB DEFAULT '{}',

  -- Account status
  is_active BOOLEAN DEFAULT true,

  -- Contact info
  phone VARCHAR(20),
  avatar_url VARCHAR(500),

  -- Security
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip INET,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP WITH TIME ZONE,
  password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  must_change_password BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create new customers table (for guests/customers)
CREATE TABLE customers (
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

  -- Booking stats
  total_bookings INTEGER DEFAULT 0,
  last_booking_date DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PHASE 3: MIGRATE DATA
-- ==========================================

-- Migrate data from admins_backup to users with role mapping
-- Note: Only migrate columns that exist in the original admins table
INSERT INTO users (
  id, email, password_hash, first_name, last_name, role,
  campsite_id, permissions, is_active, last_login_at, created_at
)
SELECT
  admins_backup.id,
  admins_backup.email,
  admins_backup.password_hash,
  admins_backup.first_name,
  admins_backup.last_name,
  -- Map old roles to new simplified roles
  CASE
    WHEN admins_backup.role IN ('super_admin', 'admin') THEN 'admin'
    WHEN admins_backup.role = 'campsite_manager' THEN 'operations'
    WHEN admins_backup.role = 'staff' THEN 'operations'
    ELSE 'operations'
  END as role,
  admins_backup.campsite_id,
  admins_backup.permissions,
  admins_backup.is_active,
  admins_backup.last_login_at,
  admins_backup.created_at
FROM admins_backup;

-- Migrate data from users_backup to customers
-- Only migrate if there is data in users_backup
INSERT INTO customers (
  id, email, phone, first_name, last_name, country,
  address_line1, city, postal_code, marketing_consent,
  email_verified, created_at, updated_at
)
SELECT
  users_backup.id,
  users_backup.email,
  users_backup.phone,
  users_backup.first_name,
  users_backup.last_name,
  users_backup.country,
  users_backup.address_line1,
  users_backup.city,
  users_backup.postal_code,
  users_backup.marketing_consent,
  users_backup.email_verified,
  users_backup.created_at,
  users_backup.updated_at
FROM users_backup;

-- ==========================================
-- PHASE 4: DROP OLD FOREIGN KEY CONSTRAINTS (Only for tables that exist)
-- ==========================================

-- Drop constraints referencing admins table (skip if tables don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_created_by_fkey;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_automation_rules') THEN
    ALTER TABLE email_automation_rules DROP CONSTRAINT IF EXISTS email_automation_rules_created_by_fkey;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_admin_id_fkey;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'login_history') THEN
    ALTER TABLE login_history DROP CONSTRAINT IF EXISTS login_history_admin_id_fkey;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_sessions') THEN
    ALTER TABLE admin_sessions DROP CONSTRAINT IF EXISTS admin_sessions_admin_id_fkey;
  END IF;
END $$;

-- Drop constraints referencing old users table
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'discount_usage') THEN
    ALTER TABLE discount_usage DROP CONSTRAINT IF EXISTS discount_usage_user_id_fkey;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'search_queries') THEN
    ALTER TABLE search_queries DROP CONSTRAINT IF EXISTS search_queries_user_id_fkey;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN
    ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_user_id_fkey;
  END IF;
END $$;

-- ==========================================
-- PHASE 5: RENAME COLUMNS & ADD NEW CONSTRAINTS (Only for tables that exist)
-- ==========================================

-- Rename admin-related columns to user (skip if tables don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE activity_logs RENAME COLUMN admin_id TO user_id;
    ALTER TABLE activity_logs RENAME COLUMN admin_name TO user_name;
    ALTER TABLE activity_logs RENAME COLUMN admin_email TO user_email;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'login_history') THEN
    ALTER TABLE login_history RENAME COLUMN admin_id TO user_id;
  END IF;
END $$;

-- Rename user_id to customer_id in customer-related tables
ALTER TABLE bookings RENAME COLUMN user_id TO customer_id;
ALTER TABLE reviews RENAME COLUMN user_id TO customer_id;
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'discount_usage') THEN
    ALTER TABLE discount_usage RENAME COLUMN user_id TO customer_id;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'search_queries') THEN
    ALTER TABLE search_queries RENAME COLUMN user_id TO customer_id;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN
    ALTER TABLE email_logs RENAME COLUMN user_id TO customer_id;
  END IF;
END $$;

-- Add new foreign key constraints for users (staff) (skip if tables don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    ALTER TABLE email_templates
      ADD CONSTRAINT email_templates_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_automation_rules') THEN
    ALTER TABLE email_automation_rules
      ADD CONSTRAINT email_automation_rules_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE activity_logs
      ADD CONSTRAINT activity_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'login_history') THEN
    ALTER TABLE login_history
      ADD CONSTRAINT login_history_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add new foreign key constraints for customers
ALTER TABLE bookings
  ADD CONSTRAINT bookings_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE reviews
  ADD CONSTRAINT reviews_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'discount_usage') THEN
    ALTER TABLE discount_usage
      ADD CONSTRAINT discount_usage_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'search_queries') THEN
    ALTER TABLE search_queries
      ADD CONSTRAINT search_queries_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN
    ALTER TABLE email_logs
      ADD CONSTRAINT email_logs_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==========================================
-- PHASE 6: CREATE INDEXES (Only for tables that exist)
-- ==========================================

-- Drop old indexes (skip if they don't exist)
DROP INDEX IF EXISTS idx_activity_logs_admin;
DROP INDEX IF EXISTS idx_login_history_admin;
DROP INDEX IF EXISTS idx_admin_sessions_admin;
DROP INDEX IF EXISTS idx_admin_sessions_token;

-- Create new indexes for users (staff)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role, is_active);
CREATE INDEX idx_users_campsite ON users(campsite_id) WHERE campsite_id IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active, created_at DESC);

-- Create new indexes for customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_created ON customers(created_at DESC);
CREATE INDEX idx_customers_last_booking ON customers(last_booking_date DESC) WHERE last_booking_date IS NOT NULL;

-- Update renamed table indexes (skip if tables don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'login_history') THEN
    CREATE INDEX idx_login_history_user ON login_history(user_id, login_at DESC);
  END IF;
END $$;

-- Update foreign key indexes
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);

-- ==========================================
-- PHASE 7: UPDATE PERMISSION PRESETS (Only if table exists)
-- ==========================================

-- Clear old permission presets and insert new ones (skip if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'permission_presets') THEN
    -- Clear old permission presets
    DELETE FROM permission_presets;

    -- Insert new simplified role presets
    INSERT INTO permission_presets (role, permissions, description, is_system)
VALUES
(
  'admin',
  '{
    "dashboard": {"view": true, "export": true},
    "campsites": {"view": true, "create": true, "edit": true, "delete": true},
    "pitches": {"view": true, "create": true, "edit": true, "delete": true},
    "bookings": {"view": true, "create": true, "edit": true, "delete": true, "cancel": true},
    "customers": {"view": true, "create": true, "edit": true, "delete": true},
    "calendar": {"view": true, "edit": true, "block_dates": true},
    "pricing": {"view": true, "edit": true},
    "products": {"view": true, "create": true, "edit": true, "delete": true},
    "discounts": {"view": true, "create": true, "edit": true, "delete": true},
    "analytics": {"view": true, "export": true},
    "email_templates": {"view": true, "create": true, "edit": true, "delete": true},
    "automation_rules": {"view": true, "create": true, "edit": true, "delete": true},
    "staff": {"view": true, "create": true, "edit": true, "delete": true},
    "settings": {"view": true, "edit": true}
  }'::jsonb,
  'Full administrative access - can manage all aspects of the system',
  true
),
(
  'sale',
  '{
    "dashboard": {"view": true, "export": false},
    "campsites": {"view": true, "create": false, "edit": false, "delete": false},
    "pitches": {"view": true, "create": false, "edit": false, "delete": false},
    "bookings": {"view": true, "create": true, "edit": true, "delete": false, "cancel": true},
    "customers": {"view": true, "create": true, "edit": true, "delete": false},
    "calendar": {"view": true, "edit": false, "block_dates": false},
    "pricing": {"view": true, "edit": false},
    "products": {"view": true, "create": false, "edit": false, "delete": false},
    "discounts": {"view": true, "create": false, "edit": false, "delete": false},
    "analytics": {"view": true, "export": false},
    "email_templates": {"view": true, "create": false, "edit": false, "delete": false},
    "automation_rules": {"view": false, "create": false, "edit": false, "delete": false},
    "staff": {"view": false, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb,
  'Sales staff - can manage bookings and customers',
  true
),
(
  'operations',
  '{
    "dashboard": {"view": true, "export": false},
    "campsites": {"view": true, "create": false, "edit": true, "delete": false},
    "pitches": {"view": true, "create": false, "edit": true, "delete": false},
    "bookings": {"view": true, "create": true, "edit": true, "delete": false, "cancel": false},
    "customers": {"view": true, "create": true, "edit": true, "delete": false},
    "calendar": {"view": true, "edit": true, "block_dates": true},
    "pricing": {"view": true, "edit": true},
    "products": {"view": true, "create": true, "edit": true, "delete": false},
    "discounts": {"view": true, "create": false, "edit": false, "delete": false},
    "analytics": {"view": true, "export": false},
    "email_templates": {"view": true, "create": false, "edit": false, "delete": false},
    "automation_rules": {"view": false, "create": false, "edit": false, "delete": false},
    "staff": {"view": false, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb,
  'Operations staff - can manage daily operations including check-in/check-out',
  true
);
  END IF;
END $$;

-- ==========================================
-- PHASE 8: CLEANUP
-- ==========================================

-- Drop backup tables
DROP TABLE IF EXISTS admins_backup;
DROP TABLE IF EXISTS users_backup;

-- Drop admin_sessions table (not used in code)
DROP TABLE IF EXISTS admin_sessions;

-- Update function comments (skip if function doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_admin_activity') THEN
    COMMENT ON FUNCTION log_admin_activity() IS
      'Logs administrative activities. Updated to use users table instead of admins table.';
  END IF;
END $$;

COMMIT;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- ============================================
-- Migration: 007_add_customer_authentication.sql
-- ============================================

-- Migration 007: Add Customer Authentication Fields
-- Purpose: Enable customers to create accounts with passwords
-- Date: 2025-01-10

-- Add authentication fields to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Create index for performance on registered customers
CREATE INDEX IF NOT EXISTS idx_customers_registered ON customers(is_registered);
CREATE INDEX IF NOT EXISTS idx_customers_email_verified ON customers(email_verified);

-- Update existing customers to mark as guests (no password)
UPDATE customers
SET is_registered = false
WHERE password_hash IS NULL;

-- Add comment to document the schema
COMMENT ON COLUMN customers.password_hash IS 'NULL = guest customer, NOT NULL = registered customer with account';
COMMENT ON COLUMN customers.is_registered IS 'true = customer has registered account, false = guest from booking';
COMMENT ON COLUMN customers.email_verified IS 'Email verification status for security';
COMMENT ON COLUMN customers.last_login_at IS 'Timestamp of last successful login';

-- Update login_history table to support customer logins (skip if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'login_history') THEN
    -- Add columns
    ALTER TABLE login_history
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
    ADD COLUMN IF NOT EXISTS login_type VARCHAR(50) DEFAULT 'admin';

    -- Add check constraint for login_type
    ALTER TABLE login_history
    ADD CONSTRAINT check_login_type
    CHECK (login_type IN ('admin', 'customer'));

    -- Add comment for login_history
    COMMENT ON COLUMN login_history.customer_id IS 'Reference to customer if login_type = customer';
    COMMENT ON COLUMN login_history.login_type IS 'Type of login: admin (staff) or customer';

    -- Create index for customer login history
    CREATE INDEX IF NOT EXISTS idx_login_history_customer ON login_history(customer_id);
    CREATE INDEX IF NOT EXISTS idx_login_history_type ON login_history(login_type);
  END IF;
END $$;

-- ============================================
-- Migration: 20251107000003_extend_pricing_calendar.sql
-- ============================================

-- Migration: Extend pricing_calendar and availability_calendar for advanced pricing features
-- Created: 2025-11-07
-- Description: Add fields for arrival/departure control and extra person pricing

-- Extend availability_calendar with arrival/departure controls
ALTER TABLE availability_calendar
ADD COLUMN arrival_allowed BOOLEAN DEFAULT true,
ADD COLUMN departure_allowed BOOLEAN DEFAULT true;

-- Extend pricing_calendar with extra person pricing
ALTER TABLE pricing_calendar
ADD COLUMN extra_person_child_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN extra_person_adult_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN max_stay_nights INTEGER DEFAULT NULL,
ADD COLUMN min_advance_days INTEGER DEFAULT 0,
ADD COLUMN max_advance_days INTEGER DEFAULT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pricing_calendar_date_range ON pricing_calendar(pitch_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_calendar_date_range ON availability_calendar(pitch_id, date);

-- Update existing records to have sensible defaults
UPDATE availability_calendar
SET arrival_allowed = true, departure_allowed = true
WHERE arrival_allowed IS NULL OR departure_allowed IS NULL;

UPDATE pricing_calendar
SET extra_person_child_price = 0, extra_person_adult_price = 0
WHERE extra_person_child_price IS NULL OR extra_person_adult_price IS NULL;

-- Comments for documentation
COMMENT ON COLUMN availability_calendar.arrival_allowed IS 'Whether guests can arrive on this date';
COMMENT ON COLUMN availability_calendar.departure_allowed IS 'Whether guests can depart on this date';
COMMENT ON COLUMN pricing_calendar.extra_person_child_price IS 'Additional price per child per night';
COMMENT ON COLUMN pricing_calendar.extra_person_adult_price IS 'Additional price per adult per night';
COMMENT ON COLUMN pricing_calendar.max_stay_nights IS 'Maximum nights allowed for bookings on this date';
COMMENT ON COLUMN pricing_calendar.min_advance_days IS 'Minimum days in advance required to book';
COMMENT ON COLUMN pricing_calendar.max_advance_days IS 'Maximum days in advance allowed to book';

-- ============================================
-- Migration: 20251110_01_add_pitch_types.sql
-- ============================================

-- Migration: Add Pitch Types System
-- Created: 2025-11-10
-- Description: Adds multi-select pitch type system (tent, campervan, motorhome, etc.)

-- Create pitch_type enum
CREATE TYPE pitch_type AS ENUM (
  'tent',
  'roof_tent',
  'trailer_tent',
  'campervan',
  'motorhome',
  'touring_caravan'
);

-- Create junction table for pitch-types (many-to-many)
CREATE TABLE pitch_types (
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  type pitch_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pitch_id, type)
);

-- Create indexes for better query performance
CREATE INDEX idx_pitch_types_pitch ON pitch_types(pitch_id);
CREATE INDEX idx_pitch_types_type ON pitch_types(type);

-- Add comment
COMMENT ON TABLE pitch_types IS 'Junction table for pitch-type relationships. A pitch can have multiple types (tent, campervan, etc.)';
COMMENT ON TYPE pitch_type IS 'Available pitch types for multi-select assignment';

-- ============================================
-- Migration: 20251110_02_add_pitch_i18n.sql
-- ============================================

-- Migration: Add Multilingual Support to Pitches
-- Created: 2025-11-10
-- Description: Converts VARCHAR/TEXT fields to JSONB for multilingual support (vi/en)

-- Step 1: Add new JSONB columns (keep old columns temporarily)
ALTER TABLE pitches
  ADD COLUMN name_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN description_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN pitch_size JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN ground_type_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN suitable_for JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb;

-- Step 2: Migrate existing data to new JSONB columns
-- Copy existing name to Vietnamese locale
UPDATE pitches
SET name_i18n = jsonb_build_object('vi', name, 'en', name)
WHERE name IS NOT NULL;

-- Copy existing description to Vietnamese locale
UPDATE pitches
SET description_i18n = jsonb_build_object('vi', COALESCE(description, ''), 'en', COALESCE(description, ''))
WHERE description IS NOT NULL OR description IS NULL;

-- Copy existing ground_type to Vietnamese locale
UPDATE pitches
SET ground_type_i18n = jsonb_build_object(
  'vi',
  CASE ground_type
    WHEN 'grass' THEN 'Cỏ'
    WHEN 'gravel' THEN 'Sỏi'
    WHEN 'hardstanding' THEN 'Bê tông'
    WHEN 'mixed' THEN 'Hỗn hợp'
    ELSE COALESCE(ground_type, '')
  END,
  'en',
  CASE ground_type
    WHEN 'grass' THEN 'Grass'
    WHEN 'gravel' THEN 'Gravel'
    WHEN 'hardstanding' THEN 'Hardstanding'
    WHEN 'mixed' THEN 'Mixed'
    ELSE COALESCE(ground_type, '')
  END
)
WHERE ground_type IS NOT NULL OR ground_type IS NULL;

-- Step 3: Drop old columns
ALTER TABLE pitches
  DROP COLUMN name,
  DROP COLUMN description,
  DROP COLUMN ground_type;

-- Step 4: Rename new columns to original names
ALTER TABLE pitches
  RENAME COLUMN name_i18n TO name;

ALTER TABLE pitches
  RENAME COLUMN description_i18n TO description;

ALTER TABLE pitches
  RENAME COLUMN ground_type_i18n TO ground_type;

-- Step 5: Add NOT NULL constraint to name (required field)
ALTER TABLE pitches
  ALTER COLUMN name SET NOT NULL;

-- Add comments
COMMENT ON COLUMN pitches.name IS 'Multilingual pitch name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitches.description IS 'Multilingual pitch description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitches.pitch_size IS 'Multilingual pitch size description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitches.ground_type IS 'Multilingual ground type: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitches.suitable_for IS 'Multilingual suitable for description: {"vi": "...", "en": "..."}';

-- ============================================
-- Migration: 20251110_03_add_pitch_features.sql
-- ============================================

-- Migration: Add Pitch Features System
-- Created: 2025-11-10
-- Description: Adds features system (electric, parking, pets, etc.) with multilingual support

-- Drop old pitch_features table if exists (from old schema)
DROP TABLE IF EXISTS pitch_features CASCADE;

-- Drop and recreate feature_category enum
DROP TYPE IF EXISTS feature_category CASCADE;
CREATE TYPE feature_category AS ENUM (
  'electric',     -- Electricity hookup
  'parking',      -- Car/vehicle parking
  'pets',         -- Pet allowance
  'water',        -- Water hookup
  'waste',        -- Waste disposal
  'amenities',    -- Other amenities
  'custom'        -- Custom/user-defined features
);

-- Create pitch_features table
CREATE TABLE pitch_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  category feature_category NOT NULL,

  -- Feature name/label (multilingual)
  -- Example: {"vi": "Điện 10 amp", "en": "Electric: 10 amp"}
  name JSONB NOT NULL,

  -- Description/details (multilingual)
  -- Example: {"vi": "Điện được bao gồm", "en": "Electricity included"}
  description JSONB,

  -- Value/specification (multilingual)
  -- Example: {"vi": "2 bao gồm, 2 tối đa", "en": "2 included, 2 max"}
  value JSONB,

  -- For pre-defined features
  is_included BOOLEAN DEFAULT true,
  max_allowed INTEGER,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_name_not_empty CHECK (jsonb_typeof(name) = 'object'),
  CONSTRAINT chk_max_allowed_positive CHECK (max_allowed IS NULL OR max_allowed >= 0)
);

-- Create indexes
CREATE INDEX idx_pitch_features_pitch ON pitch_features(pitch_id);
CREATE INDEX idx_pitch_features_category ON pitch_features(category);
CREATE INDEX idx_pitch_features_sort ON pitch_features(pitch_id, sort_order);

-- Add comments
COMMENT ON TABLE pitch_features IS 'Features available for each pitch (electric, parking, pets, etc.)';
COMMENT ON COLUMN pitch_features.name IS 'Multilingual feature name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_features.description IS 'Multilingual feature description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_features.value IS 'Multilingual feature value/specification: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_features.is_included IS 'Whether this feature is included (shown as checked) or additional cost';
COMMENT ON COLUMN pitch_features.max_allowed IS 'Maximum quantity allowed (e.g., 2 dogs max)';
COMMENT ON TYPE feature_category IS 'Categories of pitch features for organization and filtering';

-- ============================================
-- Migration: 20251110_04_add_pitch_restrictions.sql
-- ============================================

-- Migration: Add Pitch Restrictions System
-- Created: 2025-11-10
-- Description: Adds restrictions system (awnings not allowed, gazebos not allowed, etc.)

-- Create pitch_restrictions table
CREATE TABLE pitch_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,

  -- Restriction text (multilingual)
  -- Example: {"vi": "Không được dùng mái hiên", "en": "Awnings not allowed"}
  restriction JSONB NOT NULL,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_restriction_not_empty CHECK (jsonb_typeof(restriction) = 'object')
);

-- Create indexes
CREATE INDEX idx_pitch_restrictions_pitch ON pitch_restrictions(pitch_id);
CREATE INDEX idx_pitch_restrictions_sort ON pitch_restrictions(pitch_id, sort_order);

-- Add comments
COMMENT ON TABLE pitch_restrictions IS 'Restrictions for each pitch (e.g., no awnings, no gazebos)';
COMMENT ON COLUMN pitch_restrictions.restriction IS 'Multilingual restriction text: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_restrictions.sort_order IS 'Display order of restrictions';

-- ============================================
-- Migration: 20251110_05_add_extras_system.sql
-- ============================================

-- Migration: Add Extras System (2-tier: Global Catalog + Pitch-Specific)
-- Created: 2025-11-10
-- Description: Adds extras system with global catalog and pitch-specific customization

-- Create global extras catalog table
CREATE TABLE extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Extra name (multilingual)
  -- Example: {"vi": "Mang mái hiên (tối đa 1)", "en": "Bring an awning (1 max)"}
  name JSONB NOT NULL,

  -- Default description (multilingual)
  -- Example: {"vi": "Mái hiên cắm trại tiêu chuẩn", "en": "Standard camping awning"}
  default_description JSONB,

  -- Default pricing
  default_price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'per night',

  -- Category for organization
  category VARCHAR(100),

  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_name_not_empty CHECK (jsonb_typeof(name) = 'object'),
  CONSTRAINT chk_default_price_positive CHECK (default_price >= 0)
);

-- Create pitch-specific extras table (junction with customization)
CREATE TABLE pitch_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES extras(id) ON DELETE CASCADE,

  -- Custom description for this specific pitch (multilingual)
  -- Overrides default_description from extras table
  -- Example: {"vi": "Mái hiên phải nhỏ hơn 3m x 3m", "en": "Awning must be smaller than 3m x 3m"}
  custom_description JSONB,

  -- Override price if different from default
  custom_price DECIMAL(10,2),

  max_quantity INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(pitch_id, extra_id),
  CONSTRAINT chk_custom_price_positive CHECK (custom_price IS NULL OR custom_price >= 0),
  CONSTRAINT chk_max_quantity_positive CHECK (max_quantity >= 1)
);

-- Create indexes
CREATE INDEX idx_extras_active ON extras(is_active);
CREATE INDEX idx_extras_category ON extras(category);
CREATE INDEX idx_extras_sort ON extras(sort_order);

CREATE INDEX idx_pitch_extras_pitch ON pitch_extras(pitch_id);
CREATE INDEX idx_pitch_extras_extra ON pitch_extras(extra_id);
CREATE INDEX idx_pitch_extras_available ON pitch_extras(pitch_id, is_available);
CREATE INDEX idx_pitch_extras_sort ON pitch_extras(pitch_id, sort_order);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_extras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_extras_updated_at
  BEFORE UPDATE ON extras
  FOR EACH ROW
  EXECUTE FUNCTION update_extras_updated_at();

-- Add comments
COMMENT ON TABLE extras IS 'Global catalog of extras available for pitches (awnings, dogs, extra cars, etc.)';
COMMENT ON COLUMN extras.name IS 'Multilingual extra name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN extras.default_description IS 'Default multilingual description: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN extras.default_price IS 'Default price for this extra';
COMMENT ON COLUMN extras.unit IS 'Pricing unit (e.g., "per night", "per stay", "per item")';

COMMENT ON TABLE pitch_extras IS 'Links pitches to extras with pitch-specific customization';
COMMENT ON COLUMN pitch_extras.custom_description IS 'Pitch-specific description override: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_extras.custom_price IS 'Pitch-specific price override (NULL = use default)';
COMMENT ON COLUMN pitch_extras.max_quantity IS 'Maximum quantity bookable (must be >= 1)';

-- ============================================
-- Migration: 20251110_add_campsite_images.sql
-- ============================================

-- Migration: Add campsite_images table for image gallery
-- Created: 2025-11-10
-- Purpose: Allow campsites to have multiple images with one featured image

-- Create campsite_images table
CREATE TABLE IF NOT EXISTS campsite_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campsite_id UUID NOT NULL REFERENCES campsites(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  public_id VARCHAR(255), -- Cloudinary public_id for deletion
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campsite_images_campsite_id ON campsite_images(campsite_id);
CREATE INDEX IF NOT EXISTS idx_campsite_images_featured ON campsite_images(campsite_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_campsite_images_order ON campsite_images(campsite_id, display_order);

-- Add constraint: Only one featured image per campsite
CREATE UNIQUE INDEX IF NOT EXISTS idx_campsite_images_one_featured
ON campsite_images(campsite_id)
WHERE is_featured = true;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_campsite_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campsite_images_updated_at
BEFORE UPDATE ON campsite_images
FOR EACH ROW
EXECUTE FUNCTION update_campsite_images_updated_at();

-- Add comment
COMMENT ON TABLE campsite_images IS 'Stores multiple images for each campsite with featured image support';
COMMENT ON COLUMN campsite_images.is_featured IS 'Only one image per campsite can be featured (displayed on card)';
COMMENT ON COLUMN campsite_images.display_order IS 'Order of images in gallery (lower = first)';
COMMENT ON COLUMN campsite_images.public_id IS 'Cloudinary public_id for image deletion';

-- ============================================
-- Migration: 20251110_remove_regions_add_city.sql
-- ============================================

-- Migration: Remove Regions System, Add City/Province to Campsites
-- Date: 2025-11-10
-- Description: This migration removes the regions table and adds city/province fields to campsites

-- ==========================================
-- STEP 1: Add new location fields to campsites
-- ==========================================

ALTER TABLE campsites
ADD COLUMN IF NOT EXISTS city VARCHAR(255),
ADD COLUMN IF NOT EXISTS province VARCHAR(255);

COMMENT ON COLUMN campsites.city IS 'City name (e.g., "Đà Lạt", "Hà Nội")';
COMMENT ON COLUMN campsites.province IS 'Province name (e.g., "Lâm Đồng", "Hà Nội")';

-- ==========================================
-- STEP 2: Create indexes for city-based searches
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_campsites_city ON campsites(city, is_active);
CREATE INDEX IF NOT EXISTS idx_campsites_province ON campsites(province, is_active);

-- ==========================================
-- STEP 3: Enable PostGIS extensions for GPS proximity
-- ==========================================

CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

COMMENT ON EXTENSION cube IS 'Used for earthdistance calculations';
COMMENT ON EXTENSION earthdistance IS 'Calculate great-circle distances on Earth surface';

-- ==========================================
-- STEP 4: Remove region foreign key constraint
-- ==========================================

ALTER TABLE campsites
DROP CONSTRAINT IF EXISTS campsites_region_id_fkey;

-- ==========================================
-- STEP 5: Drop region_id column from campsites
-- ==========================================

ALTER TABLE campsites
DROP COLUMN IF EXISTS region_id;

-- ==========================================
-- STEP 6: Drop old region index
-- ==========================================

DROP INDEX IF EXISTS idx_campsites_region;

-- ==========================================
-- STEP 7: Drop regions table
-- ==========================================

DROP TABLE IF EXISTS regions CASCADE;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify campsites table structure
DO $$
BEGIN
  -- Check if city and province columns exist
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'campsites'
    AND column_name IN ('city', 'province')
  ) THEN
    RAISE NOTICE '✅ City and province columns added successfully';
  ELSE
    RAISE WARNING '❌ City and province columns not found';
  END IF;

  -- Check if region_id column removed
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'campsites'
    AND column_name = 'region_id'
  ) THEN
    RAISE NOTICE '✅ region_id column removed successfully';
  ELSE
    RAISE WARNING '❌ region_id column still exists';
  END IF;

  -- Check if regions table removed
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'regions'
  ) THEN
    RAISE NOTICE '✅ regions table removed successfully';
  ELSE
    RAISE WARNING '❌ regions table still exists';
  END IF;

  -- Check if extensions enabled
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname IN ('cube', 'earthdistance')
  ) THEN
    RAISE NOTICE '✅ PostGIS extensions enabled';
  ELSE
    RAISE WARNING '❌ PostGIS extensions not enabled';
  END IF;
END $$;

-- ==========================================
-- SAMPLE DATA UPDATE (Optional)
-- ==========================================

-- Update existing campsites with city/province if they have addresses
-- This is a manual step that should be done based on actual data

-- Example for existing campsites:
-- UPDATE campsites SET city = 'Đà Lạt', province = 'Lâm Đồng' WHERE slug = 'thong-vi-vu';
-- UPDATE campsites SET city = 'Sapa', province = 'Lào Cai' WHERE slug = 'sapa-mountain-view';
-- UPDATE campsites SET city = 'Phú Quốc', province = 'Kiên Giang' WHERE slug = 'phu-quoc-beach';

-- Migration completion notice
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'NOTE: Please manually update city/province for existing campsites';
  RAISE NOTICE '==========================================';
END $$;

-- ============================================
-- Migration: 20251111_add_pitch_templates.sql
-- ============================================

-- Create tables for managing pitch templates (features, restrictions)
-- These templates will be used in dropdowns when creating pitches

-- ==============================================
-- FEATURE TEMPLATES
-- ==============================================

CREATE TABLE feature_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,              -- Multilingual: {"vi": "...", "en": "..."}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_templates_active ON feature_templates(is_active);
CREATE INDEX idx_feature_templates_sort ON feature_templates(sort_order);

-- Comments
COMMENT ON TABLE feature_templates IS 'Global catalog of feature templates for pitch creation';
COMMENT ON COLUMN feature_templates.name IS 'Multilingual name: {"vi": "Điện 10 amp", "en": "Electric: 10 amp"}';

-- ==============================================
-- RESTRICTION TEMPLATES
-- ==============================================

CREATE TABLE restriction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restriction JSONB NOT NULL,       -- Multilingual: {"vi": "...", "en": "..."}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_restriction_templates_active ON restriction_templates(is_active);
CREATE INDEX idx_restriction_templates_sort ON restriction_templates(sort_order);

-- Comments
COMMENT ON TABLE restriction_templates IS 'Global catalog of restriction templates for pitch creation';
COMMENT ON COLUMN restriction_templates.restriction IS 'Multilingual restriction: {"vi": "Không được dùng mái hiên", "en": "Awnings not allowed"}';

-- ==============================================
-- SEED DATA - Migrate existing hardcoded features
-- ==============================================

INSERT INTO feature_templates (name, is_active, sort_order) VALUES
  ('{"vi": "Điện 10 amp", "en": "Electric: 10 amp"}'::jsonb, true, 1),
  ('{"vi": "Điện 16 amp", "en": "Electric: 16 amp"}'::jsonb, true, 2),
  ('{"vi": "Chỗ đậu xe", "en": "Car parking"}'::jsonb, true, 3),
  ('{"vi": "Chó được phép", "en": "Dog(s) allowed"}'::jsonb, true, 4),
  ('{"vi": "Kết nối nước", "en": "Water hookup"}'::jsonb, true, 5),
  ('{"vi": "Xử lý rác thải", "en": "Waste disposal"}'::jsonb, true, 6);

-- Sample restriction templates
INSERT INTO restriction_templates (restriction, is_active, sort_order) VALUES
  ('{"vi": "Không được phép dùng mái hiên", "en": "Awnings not allowed"}'::jsonb, true, 1),
  ('{"vi": "Không được đốt lửa trại", "en": "No campfires"}'::jsonb, true, 2),
  ('{"vi": "Không được mang thú cưng", "en": "No pets allowed"}'::jsonb, true, 3),
  ('{"vi": "Giờ yên tĩnh: 22:00 - 07:00", "en": "Quiet hours: 10 PM - 7 AM"}'::jsonb, true, 4);

-- ============================================
-- Migration: 20251111_remove_pitch_size_width_depth.sql
-- ============================================

-- Remove pitch_size_width and pitch_size_depth columns from pitches table
-- These are redundant as pitch_size (JSONB) already contains size description

ALTER TABLE pitches
  DROP COLUMN IF EXISTS pitch_size_width,
  DROP COLUMN IF EXISTS pitch_size_depth;

COMMENT ON COLUMN pitches.pitch_size IS 'Multilingual pitch size description: {"vi": "Diện tích 100m², phù hợp cho lều lớn", "en": "100m² area, suitable for large tents"}';

-- ============================================
-- Migration: 20251111_simplify_pitch_features.sql
-- ============================================

-- Simplify pitch_features table
-- Remove: category, description, is_included, max_allowed
-- Add: warning (JSONB)

-- Step 1: Drop the feature_category enum type
DROP TYPE IF EXISTS feature_category CASCADE;

-- Step 2: Alter pitch_features table
ALTER TABLE pitch_features
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS is_included,
  DROP COLUMN IF EXISTS max_allowed;

-- Step 3: Add warning column (JSONB for multilingual support)
ALTER TABLE pitch_features
  ADD COLUMN IF NOT EXISTS warning JSONB;

-- Step 4: Add comment to describe the structure
COMMENT ON COLUMN pitch_features.name IS 'Multilingual name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN pitch_features.value IS 'Multilingual value/quantity: {"vi": "2 bao gồm, 2 tối đa", "en": "2 included, 2 max"}';
COMMENT ON COLUMN pitch_features.warning IS 'Multilingual warning: {"vi": "...", "en": "..."}';

-- ============================================
-- Migration: 20251111101047_add_value_warning_to_feature_templates.sql
-- ============================================

-- Add value and warning fields to feature_templates table
-- These fields store default multilingual content for when admin creates feature templates

ALTER TABLE feature_templates
  ADD COLUMN IF NOT EXISTS value JSONB,
  ADD COLUMN IF NOT EXISTS warning JSONB;

-- Comments
COMMENT ON COLUMN feature_templates.value IS 'Multilingual default value: {"vi": "Đã có 2, Tối đa 3", "en": "Included: 2, Max: 3"}';
COMMENT ON COLUMN feature_templates.warning IS 'Multilingual default warning: {"vi": "Cảnh báo...", "en": "Warning..."}';

-- ============================================
-- Migration: 20251111102404_remove_category_from_extras.sql
-- ============================================

-- Remove category column from extras table
-- Category is not needed, each extra can be described via name and description

ALTER TABLE extras
  DROP COLUMN IF EXISTS category;

-- ============================================
-- Migration: 20251111120812_remove_price_from_pitches.sql
-- ============================================

-- Remove price columns from pitches table
-- Pricing is now managed separately in the pricing table

ALTER TABLE pitches
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS weekend_price,
  DROP COLUMN IF EXISTS holiday_price;

-- ============================================
-- Migration: 20251111121711_add_pitch_images.sql
-- ============================================

-- Create pitch_images table
-- Similar to campsite_images but for individual pitches

CREATE TABLE IF NOT EXISTS pitch_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  public_id VARCHAR(255),  -- Cloudinary public_id for deletion
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_pitch_images_pitch_id ON pitch_images(pitch_id);
CREATE INDEX idx_pitch_images_display_order ON pitch_images(pitch_id, display_order);

-- Ensure only one featured image per pitch
CREATE UNIQUE INDEX idx_pitch_images_one_featured
  ON pitch_images(pitch_id)
  WHERE is_featured = true;

-- Add comment
COMMENT ON TABLE pitch_images IS 'Stores images for individual pitches';
COMMENT ON COLUMN pitch_images.public_id IS 'Cloudinary public_id used for deletion';
COMMENT ON COLUMN pitch_images.is_featured IS 'Main featured image for the pitch (only one per pitch)';

-- ============================================
-- Migration: 20251111130000_add_campsite_features_system.sql
-- ============================================

-- Campsite Features System Migration
-- Creates tables for campsite-level features with categories and multilingual support

-- 1. Create campsite_feature_categories table
CREATE TABLE IF NOT EXISTS campsite_feature_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,  -- {"vi": "Tiện nghi", "en": "Amenities"}
  slug VARCHAR(100) UNIQUE NOT NULL,  -- for URL-friendly reference
  icon VARCHAR(50),  -- optional icon name (e.g., 'wifi', 'parking')
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create campsite_feature_templates table
CREATE TABLE IF NOT EXISTS campsite_feature_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES campsite_feature_categories(id) ON DELETE CASCADE,
  name JSONB NOT NULL,  -- {"vi": "Wifi miễn phí", "en": "Free wifi"}
  description JSONB,  -- optional detailed description
  icon VARCHAR(50),  -- optional icon name
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create campsite_features junction table (many-to-many: campsite <-> features)
CREATE TABLE IF NOT EXISTS campsite_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,
  feature_template_id UUID REFERENCES campsite_feature_templates(id) ON DELETE CASCADE,

  -- For custom features (when feature_template_id is NULL)
  custom_name JSONB,  -- {"vi": "Tính năng tùy chỉnh", "en": "Custom feature"}
  custom_category_id UUID REFERENCES campsite_feature_categories(id) ON DELETE SET NULL,

  -- Common fields
  is_available BOOLEAN DEFAULT true,  -- whether this feature is available at this campsite
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique feature per campsite (either template or custom)
  UNIQUE(campsite_id, feature_template_id)
);

-- Create indexes for performance
CREATE INDEX idx_campsite_feature_templates_category ON campsite_feature_templates(category_id);
CREATE INDEX idx_campsite_features_campsite ON campsite_features(campsite_id);
CREATE INDEX idx_campsite_features_template ON campsite_features(feature_template_id);
CREATE INDEX idx_campsite_features_custom_category ON campsite_features(custom_category_id);

-- Add comments for documentation
COMMENT ON TABLE campsite_feature_categories IS 'Categories for organizing campsite features (e.g., Leisure, Amenities, Rules)';
COMMENT ON TABLE campsite_feature_templates IS 'Predefined feature templates that can be reused across campsites';
COMMENT ON TABLE campsite_features IS 'Junction table linking campsites to features (template or custom)';
COMMENT ON COLUMN campsite_features.is_available IS 'Whether this feature is available (true=check icon, false=cancel icon)';

-- ============================================
-- Migration: 20251111130001_seed_campsite_features.sql
-- ============================================

-- Seed data for campsite features system
-- Contains all features extracted from the campsite features image

-- Insert categories
INSERT INTO campsite_feature_categories (name, slug, icon, sort_order, is_active) VALUES
  ('{"vi": "Giải trí tại chỗ", "en": "Leisure on site"}', 'leisure-on-site', 'activity', 1, true),
  ('{"vi": "Tiện nghi tại chỗ", "en": "Amenities on site"}', 'amenities-on-site', 'home', 2, true),
  ('{"vi": "Chào đón nhóm", "en": "Groups welcome"}', 'groups-welcome', 'users', 3, true),
  ('{"vi": "Quy tắc", "en": "Rules"}', 'rules', 'clipboard-list', 4, true),
  ('{"vi": "Tiện ích", "en": "Utilities"}', 'utilities', 'zap', 5, true),
  ('{"vi": "Khả năng tiếp cận", "en": "Accessibility"}', 'accessibility', 'accessibility', 6, true),
  ('{"vi": "Tiện nghi gần đây", "en": "Nearby amenities"}', 'nearby-amenities', 'map-pin', 7, true),
  ('{"vi": "Giải trí gần đây", "en": "Nearby leisure"}', 'nearby-leisure', 'compass', 8, true),
  ('{"vi": "Loại hình", "en": "Type"}', 'type', 'tag', 9, true),
  ('{"vi": "Chủ đề", "en": "Themes"}', 'themes', 'star', 10, true),
  ('{"vi": "Du lịch và nhà di động", "en": "Touring and motorhomes"}', 'touring-motorhomes', 'truck', 11, true);

-- Get category IDs for reference (we'll use subqueries in the INSERT)
-- Insert feature templates for each category

-- 1. LEISURE ON SITE
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Quán bar hoặc câu lạc bộ", "en": "Bar or club house"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Cho thuê xe đạp", "en": "Cycle hire"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Giải trí buổi tối", "en": "Evening entertainment"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Câu cá", "en": "Fishing"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Trung tâm thể dục", "en": "Fitness centre"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Phòng trò chơi", "en": "Games room"}', 6, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Bể bơi trong nhà", "en": "Indoor swimming pool"}', 7, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Câu lạc bộ trẻ em", "en": "Kids'' club"}', 8, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Nhà hàng/quán cà phê tại chỗ", "en": "On-site restaurant/cafe"}', 9, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Bể bơi ngoài trời", "en": "Outdoor swimming pool"}', 10, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Khu vui chơi", "en": "Play area"}', 11, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Đồ ăn mang về", "en": "Take away"}', 12, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Sân tennis", "en": "Tennis"}', 13, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Phòng TV", "en": "TV room"}', 14, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Thể thao dưới nước", "en": "Watersports"}', 15, true);

-- 2. AMENITIES ON SITE
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Có bồn tắm", "en": "Bath available"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Chỗ đậu xe theo lô/đơn vị", "en": "Car parking by pitch/unit"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Nhà vệ sinh phân hủy", "en": "Composting toilet"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Công viên chó", "en": "Dog park"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Phòng sấy khô", "en": "Drying room"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Cửa hàng thực phẩm", "en": "Food shop"}', 6, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Wifi miễn phí", "en": "Free wifi"}', 7, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Đông lạnh túi chườm", "en": "Ice pack freezing"}', 8, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Truy cập internet", "en": "Internet access"}', 9, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Phòng giặt tự động", "en": "Launderette"}', 10, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Sản phẩm địa phương", "en": "Local produce"}', 11, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Phòng vệ sinh cho phụ huynh và em bé", "en": "Parent & baby washroom"}', 12, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Đón tại phương tiện công cộng", "en": "Pick-up from public transport"}', 13, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Bàn dã ngoại", "en": "Picnic table"}', 14, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Nhà vệ sinh di động", "en": "Portable toilet"}', 15, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Nhà vệ sinh công cộng", "en": "Pub toilets"}', 16, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Điện thoại công cộng", "en": "Public telephone"}', 17, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Có vòi sen", "en": "Shower available"}', 18, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Khối nhà vệ sinh", "en": "Toilet block"}', 19, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Khu vực rửa chén", "en": "Washing-up area"}', 20, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Wifi", "en": "Wifi"}', 21, true);

-- 3. GROUPS WELCOME
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Chào đón D. of E.", "en": "D. of E. welcome"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Thân thiện với gia đình", "en": "Family friendly"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Thân thiện với xe máy", "en": "Motorcycle friendly"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Chào đón nhóm cùng giới", "en": "Single-sex groups welcome"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Chào đón nhóm sinh viên", "en": "Student groups welcome"}', 5, true);

-- 4. RULES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Có cung cấp lò nướng", "en": "Barbecue provided"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép nướng BBQ", "en": "Barbecues allowed"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép đốt lửa trại", "en": "Campfires allowed"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép xe thương mại", "en": "Commercial vehicles allowed"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép mang chó", "en": "Dogs allowed"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép mang chó cả năm", "en": "Dogs allowed all year"}', 6, true);

-- 5. UTILITIES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Tiện ích sạc", "en": "Charging facilities"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Xử lý hóa chất", "en": "Chemical disposal"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Điểm sạc xe điện", "en": "Electric car charging point(s)"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Có bình gas", "en": "Gas cylinders available"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Có tái chế", "en": "Recycling available"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Năng lượng tái tạo", "en": "Renewable energy"}', 6, true);

-- 6. ACCESSIBILITY
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Phòng tắm: Vòi sen rộng rãi", "en": "Bathrooms: Large spacious shower"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Phòng tắm: Nhà vệ sinh rộng rãi", "en": "Bathrooms: Large spacious toilet"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Phòng tắm: Không có bậc thang", "en": "Bathrooms: Step-free access"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Phòng tắm: Cửa rộng (trên 30 inches/75cm)", "en": "Bathrooms: Wide doorways (over 30 inches/75cm)"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Không có bậc hoặc bằng phẳng", "en": "Step-free or level access"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Địa hình không bằng phẳng; sỏi hoặc bùn lỏng", "en": "Uneven terrain; gravel or loose mud"}', 6, true);

-- 7. NEARBY AMENITIES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-amenities'), '{"vi": "Quán bar gần đây", "en": "Bar nearby"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-amenities'), '{"vi": "Dắt chó đi dạo gần đây", "en": "Dog walk nearby"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-amenities'), '{"vi": "Phương tiện công cộng gần đây", "en": "Public transport nearby"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-amenities'), '{"vi": "Cửa hàng gần đây", "en": "Shop nearby"}', 4, true);

-- 8. NEARBY LEISURE
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Chèo thuyền kayak gần đây", "en": "Canoeing/kayaking nearby"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Cho thuê xe đạp gần đây", "en": "Cycle hire nearby"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Câu cá gần đây", "en": "Fishing nearby"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Sân golf gần đây", "en": "Golf nearby"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Cưỡi ngựa gần đây", "en": "Horse riding nearby"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Đạp xe leo núi gần đây", "en": "Mountain biking nearby"}', 6, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Bể bơi ngoài trời gần đây", "en": "Outdoor pool nearby"}', 7, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Nhà hàng gần đây", "en": "Restaurant nearby"}', 8, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Đi thuyền buồm gần đây", "en": "Sailing nearby"}', 9, true);

-- 9. TYPE
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'type'), '{"vi": "Lớn (51-200 lô)", "en": "Large (51-200 pitches)"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'type'), '{"vi": "Vừa (21-50 lô)", "en": "Medium (21-50 pitches)"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'type'), '{"vi": "Nhỏ (1-20 lô)", "en": "Small (1-20 pitches)"}', 3, true);

-- 10. THEMES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'themes'), '{"vi": "Phong cảnh ngoạn mục", "en": "Spectacular scenery"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'themes'), '{"vi": "Thiên đường cho người đi bộ", "en": "Walkers'' paradise"}', 2, true);

-- 11. TOURING AND MOTORHOMES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'touring-motorhomes'), '{"vi": "Điểm thoát nước cho xe du lịch", "en": "Drainage hook-up points for tourers"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'touring-motorhomes'), '{"vi": "Điểm dịch vụ nhà di động", "en": "Motorhome service point"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'touring-motorhomes'), '{"vi": "Điểm kết nối nước cho xe du lịch", "en": "Water hook-up points for tourers"}', 3, true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully seeded % categories and % feature templates',
    (SELECT COUNT(*) FROM campsite_feature_categories),
    (SELECT COUNT(*) FROM campsite_feature_templates);
END $$;

-- ============================================
-- Migration: 20251115000000_remove_category_from_products.sql
-- ============================================

-- Remove category column from pitch_products table
-- This simplifies the product structure by removing the category classification

ALTER TABLE pitch_products DROP COLUMN IF EXISTS category;

-- ============================================
-- Migration: 20251115_add_applicable_products_to_discounts.sql
-- ============================================

-- Migration: Add applicable_products field to discounts table
-- Date: 2025-11-15
-- Purpose: Support pitch product-specific discounts (auto-apply for selected pitch products only, NOT extras)

-- Add applicable_products JSONB field
ALTER TABLE discounts
ADD COLUMN applicable_products JSONB;

-- Add comment explaining usage
COMMENT ON COLUMN discounts.applicable_products IS
'JSONB array of pitch_product UUIDs (from pitch_products table ONLY, NOT extras table) that this discount applies to.
Only used for DISCOUNTS category (auto-apply) and VOUCHERS.
NULL = applies to all pitch products if category is DISCOUNTS.
Example: ["uuid1", "uuid2", "uuid3"]
Note: This field does NOT include extras from the extras table.';

-- Add GIN index for efficient JSONB queries
CREATE INDEX idx_discounts_applicable_products
ON discounts USING gin (applicable_products);

-- Update existing discounts to have NULL (explicit)
-- This ensures backward compatibility
UPDATE discounts
SET applicable_products = NULL
WHERE applicable_products IS NULL;

-- Verify migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'discounts'
  AND column_name = 'applicable_products';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: applicable_products field added to discounts table';
END $$;

-- ============================================
-- Migration: 20251115_add_applies_to_all_campsite_pitch.sql
-- ============================================

-- Migration: Add applies_to_all_campsite_pitch field for VOUCHERs
-- This allows vouchers to apply to ALL campsites and pitches automatically
-- When TRUE: voucher applies to any campsite/pitch booking (excludes products/extras)
-- When FALSE: voucher uses normal applicability selection (campsites/pitches/products)

-- Add new column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'discounts'
        AND column_name = 'applies_to_all_campsite_pitch'
    ) THEN
        ALTER TABLE discounts
        ADD COLUMN applies_to_all_campsite_pitch BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN discounts.applies_to_all_campsite_pitch IS
'For VOUCHERs only: When TRUE, applies to all campsite and pitch bookings (excludes products/extras). When FALSE, uses normal applicable_* fields.';

-- Update existing vouchers to default FALSE (explicit)
UPDATE discounts d
SET applies_to_all_campsite_pitch = FALSE
WHERE d.category_id IN (
  SELECT id FROM discount_categories WHERE slug = 'vouchers'
);

-- ============================================
-- Migration: 20251115_make_discount_code_nullable.sql
-- ============================================

-- Migration: Make discount code nullable for DISCOUNT type
-- Only VOUCHERS require code (customer input)
-- DISCOUNTS auto-apply and don't need code

-- Make code column nullable
ALTER TABLE discounts
ALTER COLUMN code DROP NOT NULL;

-- Add check constraint: if category is 'vouchers', code must not be null
-- This will be enforced at application level for now
-- Future enhancement: add database constraint based on category

-- Update existing discounts that might have empty codes
UPDATE discounts
SET code = NULL
WHERE code = '' OR code IS NULL;

-- Drop the existing unique constraint if it exists
ALTER TABLE discounts DROP CONSTRAINT IF EXISTS discounts_code_key;

-- Create unique index on code (excluding NULL values)
-- This allows multiple NULL codes but ensures unique non-NULL codes
DROP INDEX IF EXISTS idx_discounts_code;
DROP INDEX IF EXISTS idx_discounts_code_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_discounts_code_unique
ON discounts (code)
WHERE code IS NOT NULL;

-- ============================================
-- Migration: 20251115_add_booking_sequence_system.sql
-- ============================================

-- Migration: Add Booking Sequence System
-- Description: Add sequential booking reference number system that resets each year
-- Date: 2025-11-15
-- Author: GlampingHub Development Team

-- ============================================================================
-- 1. Create booking_sequences table to track sequential numbers per year
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_sequences (
  year INTEGER PRIMARY KEY,
  current_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for fast lookups by year
CREATE INDEX IF NOT EXISTS idx_booking_sequences_year ON booking_sequences(year);

-- Add comment for documentation
COMMENT ON TABLE booking_sequences IS 'Tracks sequential booking numbers for each year. Numbers reset to 1 at the start of each new year.';
COMMENT ON COLUMN booking_sequences.year IS 'The year (e.g., 2025)';
COMMENT ON COLUMN booking_sequences.current_number IS 'The current/last used sequential number for this year';
COMMENT ON COLUMN booking_sequences.created_at IS 'Timestamp when this year record was created';
COMMENT ON COLUMN booking_sequences.updated_at IS 'Timestamp when the counter was last incremented';

-- ============================================================================
-- 2. Create function to get next booking number
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_booking_number(p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  -- Insert year if it doesn't exist (starting from 1),
  -- or increment the counter if it already exists
  INSERT INTO booking_sequences (year, current_number, created_at, updated_at)
  VALUES (p_year, 1, NOW(), NOW())
  ON CONFLICT (year)
  DO UPDATE SET
    current_number = booking_sequences.current_number + 1,
    updated_at = NOW()
  RETURNING current_number INTO v_next_number;

  RETURN v_next_number;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_next_booking_number(INTEGER) IS 'Gets the next sequential booking number for a given year. Creates the year record if it does not exist. This function is atomic and safe for concurrent use.';

-- ============================================================================
-- 3. Initialize current year (optional - will be created automatically on first use)
-- ============================================================================

-- Get current year and initialize the sequence
DO $$
DECLARE
  current_year INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

  -- Initialize current year with 0 (first booking will be 1)
  INSERT INTO booking_sequences (year, current_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;
END $$;

-- ============================================================================
-- 4. Grant necessary permissions (if using row-level security)
-- ============================================================================

-- Grant permissions to authenticated users to use the function
-- Uncomment if you're using Supabase RLS or similar
-- GRANT SELECT ON booking_sequences TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_next_booking_number(INTEGER) TO authenticated;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (for emergency use only)
-- ============================================================================

-- To rollback this migration:
-- 1. DROP FUNCTION get_next_booking_number(INTEGER);
-- 2. DROP TABLE booking_sequences;

-- Note: Rolling back will lose all sequence tracking data!

-- ============================================
-- Migration: 20251116_add_ground_type_templates.sql
-- ============================================

-- =====================================================
-- Migration: Add Ground Type Templates System
-- Date: 2025-11-16
-- Description:
--   - Create ground_type_templates table for managing ground types
--   - Create pitch_ground_types junction table (many-to-many)
--   - Seed common ground types
-- =====================================================

-- Create ground_type_templates table
CREATE TABLE IF NOT EXISTS ground_type_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,              -- {"vi": "Cỏ", "en": "Grass"}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE ground_type_templates IS 'Templates for ground types (grass, soil, rock, etc.)';
COMMENT ON COLUMN ground_type_templates.name IS 'Multilingual ground type name: {"vi": "...", "en": "..."}';

-- Create junction table for pitch-to-ground-type relationship (many-to-many)
CREATE TABLE IF NOT EXISTS pitch_ground_types (
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  ground_type_id UUID NOT NULL REFERENCES ground_type_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pitch_id, ground_type_id)
);

-- Add comments
COMMENT ON TABLE pitch_ground_types IS 'Junction table linking pitches to ground type templates';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pitch_ground_types_pitch_id ON pitch_ground_types(pitch_id);
CREATE INDEX IF NOT EXISTS idx_pitch_ground_types_ground_type_id ON pitch_ground_types(ground_type_id);
CREATE INDEX IF NOT EXISTS idx_ground_type_templates_active ON ground_type_templates(is_active) WHERE is_active = true;

-- Seed common ground types
INSERT INTO ground_type_templates (name, is_active, sort_order) VALUES
  ('{"vi": "Cỏ", "en": "Grass"}'::jsonb, true, 1),
  ('{"vi": "Đất", "en": "Soil"}'::jsonb, true, 2),
  ('{"vi": "Đá/Sỏi", "en": "Rock/Gravel"}'::jsonb, true, 3),
  ('{"vi": "Bê tông/Nền cứng", "en": "Concrete/Hardstanding"}'::jsonb, true, 4),
  ('{"vi": "Hỗn hợp", "en": "Mixed"}'::jsonb, true, 5),
  ('{"vi": "Cát", "en": "Sand"}'::jsonb, true, 6),
  ('{"vi": "Gỗ/Sàn gỗ", "en": "Wood/Decking"}'::jsonb, true, 7)
ON CONFLICT DO NOTHING;

-- Optional: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ground_type_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ground_type_templates_updated_at
  BEFORE UPDATE ON ground_type_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_ground_type_templates_updated_at();

-- =====================================================
-- Note: The existing pitches.ground_type column (JSONB) is kept for backward compatibility
-- New pitches should use the pitch_ground_types junction table instead
-- =====================================================

-- ============================================
-- Migration: 20251116_add_password_reset_tokens.sql
-- ============================================

-- Migration: Add Password Reset Tokens
-- Description: Add columns for password reset functionality to customers table
-- Date: 2025-11-16

-- Add password reset token columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_customers_password_reset_token
ON customers(password_reset_token)
WHERE password_reset_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN customers.password_reset_token IS 'UUID token for password reset, single-use';
COMMENT ON COLUMN customers.password_reset_token_expires IS 'Expiry timestamp for reset token (typically 1 hour from generation)';

-- ============================================
-- Migration: 20251116_add_password_reset_email_template.sql
-- ============================================

-- Migration: Add Password Reset Email Template
-- Description: Insert password reset email template into email_templates table
-- Date: 2025-11-16

-- Create email_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  available_variables JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  preview_text TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

COMMENT ON TABLE email_templates IS 'Quản lý các template email của hệ thống';
COMMENT ON COLUMN email_templates.slug IS 'Unique identifier for template lookup';
COMMENT ON COLUMN email_templates.type IS 'Email type (booking_confirmation, password_reset, etc.)';
COMMENT ON COLUMN email_templates.available_variables IS 'JSON array of variables that can be used in this template';

-- Insert password reset template
INSERT INTO email_templates (
  id,
  name,
  slug,
  type,
  subject,
  body,
  available_variables,
  description,
  preview_text,
  is_active,
  is_default,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Password Reset',
  'password-reset',
  'password_reset',
  'Đặt lại mật khẩu - GlampingHub 🔒',
  'password-reset',
  '["customer_name", "customer_email", "reset_url"]'::jsonb,
  'Email gửi link đặt lại mật khẩu cho khách hàng khi họ yêu cầu quên mật khẩu',
  'Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản GlampingHub của mình',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables,
  description = EXCLUDED.description,
  preview_text = EXCLUDED.preview_text,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  updated_at = NOW();

-- ============================================
-- Migration: 20251116_add_welcome_email_template.sql
-- ============================================

-- Migration: Add Welcome Email Template
-- Description: Insert welcome email template for newly registered customers
-- Date: 2025-11-16

-- Insert welcome email template
INSERT INTO email_templates (
  id,
  name,
  slug,
  type,
  subject,
  body,
  available_variables,
  description,
  preview_text,
  is_active,
  is_default,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Welcome Email',
  'welcome-email',
  'customer_registration',
  'Chào mừng đến với GlampingHub! 🏕️',
  'welcome-email',
  '["customer_name", "customer_email", "app_url"]'::jsonb,
  'Email chào mừng gửi đến khách hàng sau khi đăng ký tài khoản thành công',
  'Chào mừng bạn đến với cộng đồng cắm trại GlampingHub!',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables,
  description = EXCLUDED.description,
  preview_text = EXCLUDED.preview_text,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  updated_at = NOW();

-- ============================================
-- Migration: 20251117000001_add_pricing_history.sql
-- ============================================

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
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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
CREATE INDEX idx_pricing_history_user ON pricing_history(changed_by_user_id, created_at DESC);
CREATE INDEX idx_pricing_history_created_at ON pricing_history(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE pricing_history IS 'Audit trail for all pricing changes with full snapshot history';
COMMENT ON COLUMN pricing_history.bulk_operation_id IS 'Groups all changes made in a single bulk update operation';
COMMENT ON COLUMN pricing_history.operation_type IS 'Type of operation: create, update, or revert';
COMMENT ON COLUMN pricing_history.old_price_per_night IS 'Price before the change (NULL for new entries)';
COMMENT ON COLUMN pricing_history.new_price_per_night IS 'Price after the change';
COMMENT ON COLUMN pricing_history.changed_by_user_id IS 'User who made the change (admin/operations staff)';
COMMENT ON COLUMN pricing_history.ip_address IS 'IP address of the request for security audit';
COMMENT ON COLUMN pricing_history.created_at IS 'Timestamp when the change was made';

-- ============================================
-- Migration: 20251117000002_add_deposit_system.sql
-- ============================================

-- Migration: Add Deposit System for Campsites and Pitches
-- Description: Allows admin to configure deposit requirements (percentage or fixed amount) at campsite/pitch level
-- Date: 2025-11-17

-- Step 1: Create deposit_type ENUM
CREATE TYPE deposit_type AS ENUM ('percentage', 'fixed_amount');

-- Step 2: Add deposit columns to campsites table
ALTER TABLE campsites
ADD COLUMN deposit_type deposit_type DEFAULT 'percentage',
ADD COLUMN deposit_value DECIMAL(10,2) DEFAULT 15;

-- Add constraint for campsite deposits
ALTER TABLE campsites
ADD CONSTRAINT campsites_deposit_check CHECK (
  (deposit_type = 'percentage' AND deposit_value >= 0 AND deposit_value <= 100) OR
  (deposit_type = 'fixed_amount' AND deposit_value >= 0)
);

-- Add comment for campsite deposit columns
COMMENT ON COLUMN campsites.deposit_type IS 'Type of deposit: percentage (of total) or fixed_amount (in VND)';
COMMENT ON COLUMN campsites.deposit_value IS 'Deposit value: 0-100 for percentage, or fixed amount in VND';

-- Step 3: Add deposit columns to pitches table (nullable = inherit from campsite)
ALTER TABLE pitches
ADD COLUMN deposit_type deposit_type DEFAULT NULL,
ADD COLUMN deposit_value DECIMAL(10,2) DEFAULT NULL;

-- Add constraint for pitch deposits (NULL or valid values)
ALTER TABLE pitches
ADD CONSTRAINT pitches_deposit_check CHECK (
  (deposit_type IS NULL AND deposit_value IS NULL) OR
  (deposit_type = 'percentage' AND deposit_value >= 0 AND deposit_value <= 100) OR
  (deposit_type = 'fixed_amount' AND deposit_value >= 0)
);

-- Add comments for pitch deposit columns
COMMENT ON COLUMN pitches.deposit_type IS 'Override deposit type for this pitch. NULL = inherit from campsite';
COMMENT ON COLUMN pitches.deposit_value IS 'Override deposit value for this pitch. NULL = inherit from campsite';

-- Step 4: Add deposit tracking columns to bookings table
ALTER TABLE bookings
ADD COLUMN deposit_type deposit_type,
ADD COLUMN deposit_value DECIMAL(10,2);

-- Add comments for booking deposit columns
COMMENT ON COLUMN bookings.deposit_type IS 'The deposit type used when this booking was created (for audit trail)';
COMMENT ON COLUMN bookings.deposit_value IS 'The deposit value used when this booking was created (for audit trail)';

-- Note: The bookings table already has deposit_percentage, deposit_amount, and balance_amount columns
-- Those are kept for backward compatibility and for the auto-calculated amounts
-- The new deposit_type and deposit_value columns are for tracking what settings were used

-- ============================================
-- Migration: 20251117_add_campsite_basic_i18n.sql
-- ============================================

-- Migration: Add Multilingual Support to Campsite Basic Info
-- Created: 2025-11-17
-- Description: Converts TEXT fields to JSONB for multilingual support (vi/en) for name, description, and short_description

-- Step 1: Add new JSONB columns (keep old columns temporarily)
ALTER TABLE campsites
  ADD COLUMN name_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN description_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN short_description_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb;

-- Step 2: Migrate existing data to new JSONB columns
-- Copy existing name to Vietnamese locale
UPDATE campsites
SET name_i18n = jsonb_build_object('vi', COALESCE(name, ''), 'en', '')
WHERE name IS NOT NULL OR name IS NULL;

-- Copy existing description to Vietnamese locale
UPDATE campsites
SET description_i18n = jsonb_build_object('vi', COALESCE(description, ''), 'en', '')
WHERE description IS NOT NULL OR description IS NULL;

-- Copy existing short_description to Vietnamese locale
UPDATE campsites
SET short_description_i18n = jsonb_build_object('vi', COALESCE(short_description, ''), 'en', '')
WHERE short_description IS NOT NULL OR short_description IS NULL;

-- Step 3: Drop old columns
ALTER TABLE campsites
  DROP COLUMN name,
  DROP COLUMN description,
  DROP COLUMN short_description;

-- Step 4: Rename new columns to original names
ALTER TABLE campsites
  RENAME COLUMN name_i18n TO name;

ALTER TABLE campsites
  RENAME COLUMN description_i18n TO description;

ALTER TABLE campsites
  RENAME COLUMN short_description_i18n TO short_description;

-- Add comments
COMMENT ON COLUMN campsites.name IS 'Multilingual campsite name: {"vi": "...", "en": "..."}';
COMMENT ON COLUMN campsites.description IS 'Multilingual full description (rich text HTML): {"vi": "...", "en": "..."}';
COMMENT ON COLUMN campsites.short_description IS 'Multilingual short description: {"vi": "...", "en": "..."}';

-- ============================================
-- Migration: 20251117_add_campsite_policies_i18n.sql
-- ============================================

-- Migration: Add Multilingual Support to Campsite Policies
-- Created: 2025-11-17
-- Description: Converts TEXT fields to JSONB for multilingual support (vi/en) for cancellation_policy and house_rules

-- Step 1: Add new JSONB columns (keep old columns temporarily)
ALTER TABLE campsites
  ADD COLUMN cancellation_policy_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,
  ADD COLUMN house_rules_i18n JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb;

-- Step 2: Migrate existing data to new JSONB columns
-- Copy existing cancellation_policy to Vietnamese locale
UPDATE campsites
SET cancellation_policy_i18n = jsonb_build_object('vi', COALESCE(cancellation_policy, ''), 'en', '')
WHERE cancellation_policy IS NOT NULL OR cancellation_policy IS NULL;

-- Copy existing house_rules to Vietnamese locale
UPDATE campsites
SET house_rules_i18n = jsonb_build_object('vi', COALESCE(house_rules, ''), 'en', '')
WHERE house_rules IS NOT NULL OR house_rules IS NULL;

-- Step 3: Drop old columns
ALTER TABLE campsites
  DROP COLUMN cancellation_policy,
  DROP COLUMN house_rules;

-- Step 4: Rename new columns to original names
ALTER TABLE campsites
  RENAME COLUMN cancellation_policy_i18n TO cancellation_policy;

ALTER TABLE campsites
  RENAME COLUMN house_rules_i18n TO house_rules;

-- Add comments
COMMENT ON COLUMN campsites.cancellation_policy IS 'Multilingual cancellation policy (rich text HTML): {"vi": "...", "en": "..."}';
COMMENT ON COLUMN campsites.house_rules IS 'Multilingual house rules (rich text HTML): {"vi": "...", "en": "..."}';

-- ============================================
-- Migration: 20251117_add_campsite_website.sql
-- ============================================

-- Migration: Add Website Field to Campsites
-- Created: 2025-11-17
-- Description: Adds optional website field to campsites table for contact information

ALTER TABLE campsites
  ADD COLUMN website VARCHAR(255);

-- Add comment
COMMENT ON COLUMN campsites.website IS 'Website URL for the campsite (optional)';

-- ============================================
-- Migration: 20251118_add_admin_activity_tracking.sql
-- ============================================

-- ==========================================
-- ADMIN ACTIVITY TRACKING & USER MANAGEMENT
-- Description: Add audit trail, login history, and permission management
-- Date: 2025-11-18
-- Note: admin_sessions table is intentionally NOT included (was dropped in restructure migration)
-- ==========================================

-- Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor information
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_name VARCHAR(255),
  admin_email VARCHAR(255),

  -- Action details
  action VARCHAR(100) NOT NULL, -- create, update, delete, login, logout, view, export, etc.
  entity_type VARCHAR(100) NOT NULL, -- booking, campsite, pitch, user, email_template, etc.
  entity_id UUID,
  entity_name VARCHAR(255),

  -- Change details
  changes JSONB, -- Before/after values for updates
  metadata JSONB DEFAULT '{}', -- Additional context

  -- Request information
  ip_address INET,
  user_agent TEXT,
  request_path VARCHAR(500),
  request_method VARCHAR(10),

  -- Status
  status VARCHAR(50) DEFAULT 'success', -- success, failed, error
  error_message TEXT,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login History
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User information
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,

  -- Login details
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  session_duration INTERVAL,

  -- Status
  status VARCHAR(50) NOT NULL, -- success, failed, locked
  failure_reason VARCHAR(255),

  -- Request information
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50), -- desktop, mobile, tablet
  browser VARCHAR(100),
  os VARCHAR(100),
  location VARCHAR(255), -- City, Country (from IP)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permission Presets (for easier role management)
CREATE TABLE IF NOT EXISTS permission_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) UNIQUE NOT NULL, -- super_admin, admin, campsite_manager, staff
  permissions JSONB NOT NULL, -- Detailed permissions object
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- System presets cannot be deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin ON activity_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_admin ON login_history(admin_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(status, login_at DESC);

-- Insert default permission presets (4 roles)
INSERT INTO permission_presets (role, permissions, description, is_system)
VALUES
(
  'super_admin',
  '{
    "dashboard": {"view": true, "export": true},
    "campsites": {"view": true, "create": true, "edit": true, "delete": true},
    "pitches": {"view": true, "create": true, "edit": true, "delete": true},
    "bookings": {"view": true, "create": true, "edit": true, "delete": true, "cancel": true},
    "calendar": {"view": true, "edit": true, "block_dates": true},
    "pricing": {"view": true, "edit": true},
    "products": {"view": true, "create": true, "edit": true, "delete": true},
    "discounts": {"view": true, "create": true, "edit": true, "delete": true},
    "analytics": {"view": true, "export": true},
    "email_templates": {"view": true, "create": true, "edit": true, "delete": true},
    "automation_rules": {"view": true, "create": true, "edit": true, "delete": true},
    "users": {"view": true, "create": true, "edit": true, "delete": true},
    "settings": {"view": true, "edit": true}
  }'::jsonb,
  'Full system access - can manage everything including users and settings',
  true
),
(
  'admin',
  '{
    "dashboard": {"view": true, "export": true},
    "campsites": {"view": true, "create": true, "edit": true, "delete": false},
    "pitches": {"view": true, "create": true, "edit": true, "delete": false},
    "bookings": {"view": true, "create": true, "edit": true, "delete": false, "cancel": true},
    "calendar": {"view": true, "edit": true, "block_dates": true},
    "pricing": {"view": true, "edit": true},
    "products": {"view": true, "create": true, "edit": true, "delete": true},
    "discounts": {"view": true, "create": true, "edit": true, "delete": true},
    "analytics": {"view": true, "export": true},
    "email_templates": {"view": true, "create": true, "edit": true, "delete": false},
    "automation_rules": {"view": true, "create": false, "edit": true, "delete": false},
    "users": {"view": true, "create": false, "edit": false, "delete": false},
    "settings": {"view": true, "edit": false}
  }'::jsonb,
  'Admin access - can manage operations but cannot delete critical data or manage users',
  true
),
(
  'campsite_manager',
  '{
    "dashboard": {"view": true, "export": false},
    "campsites": {"view": true, "create": false, "edit": true, "delete": false},
    "pitches": {"view": true, "create": true, "edit": true, "delete": false},
    "bookings": {"view": true, "create": true, "edit": true, "delete": false, "cancel": true},
    "calendar": {"view": true, "edit": true, "block_dates": true},
    "pricing": {"view": true, "edit": true},
    "products": {"view": true, "create": true, "edit": true, "delete": false},
    "discounts": {"view": true, "create": false, "edit": false, "delete": false},
    "analytics": {"view": true, "export": false},
    "email_templates": {"view": true, "create": false, "edit": false, "delete": false},
    "automation_rules": {"view": true, "create": false, "edit": false, "delete": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb,
  'Campsite Manager - can manage assigned campsite operations',
  true
),
(
  'staff',
  '{
    "dashboard": {"view": true, "export": false},
    "campsites": {"view": true, "create": false, "edit": false, "delete": false},
    "pitches": {"view": true, "create": false, "edit": false, "delete": false},
    "bookings": {"view": true, "create": true, "edit": true, "delete": false, "cancel": false},
    "calendar": {"view": true, "edit": false, "block_dates": false},
    "pricing": {"view": true, "edit": false},
    "products": {"view": true, "create": false, "edit": false, "delete": false},
    "discounts": {"view": true, "create": false, "edit": false, "delete": false},
    "analytics": {"view": false, "export": false},
    "email_templates": {"view": true, "create": false, "edit": false, "delete": false},
    "automation_rules": {"view": false, "create": false, "edit": false, "delete": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb,
  'Staff - limited operational access for daily tasks',
  true
)
ON CONFLICT (role) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Update users table (formerly admins) with additional fields
-- Note: Table was renamed from admins to users in 005_restructure_users_customers.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- Function to log activities automatically
CREATE OR REPLACE FUNCTION log_admin_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the activity
  INSERT INTO activity_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  VALUES (
    COALESCE(current_setting('app.current_admin_id', true)::uuid, NULL),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE
      WHEN TG_OP = 'UPDATE' THEN
        jsonb_build_object(
          'before', row_to_json(OLD),
          'after', row_to_json(NEW)
        )
      WHEN TG_OP = 'DELETE' THEN
        jsonb_build_object('deleted', row_to_json(OLD))
      ELSE
        jsonb_build_object('created', row_to_json(NEW))
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE activity_logs IS 'Audit trail cho tất cả hoạt động của admin/user trong hệ thống';
COMMENT ON TABLE login_history IS 'Lịch sử đăng nhập và tracking thiết bị';
COMMENT ON TABLE permission_presets IS 'Các role định nghĩa sẵn với quyền hạn cụ thể';
COMMENT ON FUNCTION log_admin_activity IS 'Trigger function để tự động log activity khi có thay đổi dữ liệu';

-- Note: Triggers can be enabled per table as needed:
-- CREATE TRIGGER log_bookings_activity
--   AFTER INSERT OR UPDATE OR DELETE ON bookings
--   FOR EACH ROW EXECUTE FUNCTION log_admin_activity();

-- ============================================
-- Migration: 20251118_fix_pricing_history_foreign_key.sql
-- ============================================

-- Migration: Rename pricing_history user column and fix foreign key
-- Created: 2025-11-18
-- Description: Rename changed_by_user_id to changed_by_admin_id for clarity and add proper foreign key constraint

-- Step 1: Drop the existing foreign key constraint (if exists)
ALTER TABLE pricing_history
DROP CONSTRAINT IF EXISTS pricing_history_changed_by_user_id_fkey;

-- Step 2: Rename the column to be more accurate
-- Note: This migration assumes column already exists as changed_by_user_id from initial schema
-- If running fresh, the column might not exist yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_history' AND column_name = 'changed_by_user_id'
  ) THEN
    ALTER TABLE pricing_history
    RENAME COLUMN changed_by_user_id TO changed_by_admin_id;
  END IF;
END $$;

-- Step 3: Add foreign key constraint referencing users table (staff)
-- The column references users table because admins were migrated to users table
ALTER TABLE pricing_history
ADD CONSTRAINT pricing_history_changed_by_admin_id_fkey
  FOREIGN KEY (changed_by_admin_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Step 4: Drop and recreate the index with the new column name
DROP INDEX IF EXISTS idx_pricing_history_user;
CREATE INDEX IF NOT EXISTS idx_pricing_history_admin ON pricing_history(changed_by_admin_id, created_at DESC);

-- Step 5: Update the comment
COMMENT ON COLUMN pricing_history.changed_by_admin_id IS 'Staff/admin user who made the pricing change (nullable for system changes or when user is deleted)';

-- ============================================
-- Migration: 20251118_add_complete_email_system.sql
-- ============================================

-- ==========================================
-- COMPLETE EMAIL SYSTEM - PART 2
-- Description: Add missing email automation tables and complete templates
-- Date: 2025-11-18
-- ==========================================

-- Add created_by column to email_templates (if not exists)
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Automation Rules
CREATE TABLE IF NOT EXISTS email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template to use
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,

  -- Trigger configuration
  trigger_event VARCHAR(100) NOT NULL, -- booking_created, booking_confirmed, payment_received, pre_arrival, post_stay, etc.
  trigger_conditions JSONB DEFAULT '{}', -- Additional conditions: {"booking_status": "confirmed", "min_nights": 2}

  -- Timing
  trigger_timing VARCHAR(50) DEFAULT 'immediate', -- immediate, scheduled
  trigger_offset_days INTEGER DEFAULT 0, -- For scheduled: -1 = 1 day before, +1 = 1 day after
  trigger_offset_hours INTEGER DEFAULT 0,
  trigger_time TIME, -- For scheduled: send at specific time (e.g., 09:00:00)

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Statistics
  total_sent INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Log (Communication History)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  automation_rule_id UUID REFERENCES email_automation_rules(id) ON DELETE SET NULL,

  -- Email details
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,

  -- Sending status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, bounced
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  -- Email provider response
  provider VARCHAR(50), -- resend, sendgrid, mailgun, smtp
  provider_message_id VARCHAR(255),
  provider_response JSONB,

  -- Engagement tracking
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Emails Queue
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  automation_rule_id UUID REFERENCES email_automation_rules(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id),

  -- Email details
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, sent, failed, cancelled
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Processing
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_trigger ON email_automation_rules(trigger_event, is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_booking ON email_logs(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for, status);

-- Insert/Update default email templates (5 comprehensive templates)
INSERT INTO email_templates (name, slug, subject, body, type, is_default, available_variables, description)
VALUES
(
  'Booking Confirmation',
  'booking-confirmation',
  'Xác nhận đặt phòng #{booking_reference} - GlampingHub',
  E'Xin chào {guest_name},\n\nCảm ơn bạn đã đặt phòng tại GlampingHub!\n\n**Thông tin đặt phòng:**\n- Mã đặt phòng: {booking_reference}\n- Campsite: {campsite_name}\n- Pitch: {pitch_name}\n- Check-in: {check_in_date} lúc {check_in_time}\n- Check-out: {check_out_date} lúc {check_out_time}\n- Số đêm: {nights}\n- Số khách: {adults} người lớn, {children} trẻ em\n\n**Chi phí:**\n- Tổng tiền: {total_amount}\n- Đã thanh toán: {deposit_amount}\n- Còn lại: {balance_amount}\n\nChúng tôi rất mong được đón tiếp bạn!\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'booking_confirmation',
  true,
  '["booking_reference", "guest_name", "campsite_name", "pitch_name", "check_in_date", "check_in_time", "check_out_date", "check_out_time", "nights", "adults", "children", "total_amount", "deposit_amount", "balance_amount"]'::jsonb,
  'Email xác nhận đặt phòng gửi ngay sau khi khách hoàn tất booking'
),
(
  'Pre-Arrival Reminder',
  'pre-arrival-reminder',
  'Nhắc nhở: Chuyến đi của bạn sắp bắt đầu - {campsite_name}',
  E'Xin chào {guest_name},\n\nChuyến đi của bạn tại {campsite_name} sắp bắt đầu rồi!\n\n**Thông tin quan trọng:**\n- Check-in: {check_in_date} lúc {check_in_time}\n- Địa chỉ: {campsite_address}\n- Liên hệ: {campsite_phone}\n\n**Thời tiết dự báo:**\nDự báo thời tiết trong những ngày bạn ở lại: {weather_forecast}\n\n**Gợi ý chuẩn bị:**\n✓ Giấy tờ tùy thân\n✓ Email xác nhận đặt phòng\n✓ Thanh toán số tiền còn lại: {balance_amount}\n\n**Hướng dẫn đường đi:**\n{directions}\n\n**Quy định:**\n{house_rules}\n\nNếu có bất kỳ câu hỏi nào, vui lòng liên hệ: {campsite_phone}\n\nHẹn gặp bạn sớm!\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'pre_arrival',
  true,
  '["guest_name", "campsite_name", "check_in_date", "check_in_time", "campsite_address", "campsite_phone", "balance_amount", "weather_forecast", "directions", "house_rules"]'::jsonb,
  'Email nhắc nhở gửi 24 giờ trước check-in'
),
(
  'Post-Stay Thank You',
  'post-stay-thank-you',
  'Cảm ơn bạn đã lựa chọn {campsite_name}!',
  E'Xin chào {guest_name},\n\nCảm ơn bạn đã lựa chọn {campsite_name} cho chuyến đi của mình!\n\nChúng tôi hy vọng bạn đã có những trải nghiệm tuyệt vời tại đây.\n\n**Đánh giá trải nghiệm của bạn:**\nPhản hồi của bạn rất quan trọng với chúng tôi. Vui lòng dành vài phút để đánh giá:\n\n👉 [Đánh giá ngay]({review_link})\n\n**Ưu đãi cho lần đặt phòng tiếp theo:**\nĐặc biệt cho bạn: Giảm {discount_percentage}% cho lần đặt phòng tiếp theo!\nMã giảm giá: {discount_code}\nHiệu lực đến: {discount_expiry}\n\n**Chia sẻ trải nghiệm:**\nNếu bạn thích chuyến đi, hãy chia sẻ với bạn bè trên mạng xã hội:\n- Facebook: [Link]\n- Instagram: [Link]\n\nMong được đón tiếp bạn trở lại!\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'post_stay',
  true,
  '["guest_name", "campsite_name", "review_link", "discount_percentage", "discount_code", "discount_expiry"]'::jsonb,
  'Email cảm ơn và yêu cầu đánh giá gửi sau check-out 1 ngày'
),
(
  'Payment Reminder',
  'payment-reminder',
  'Nhắc nhở thanh toán - Booking #{booking_reference}',
  E'Xin chào {guest_name},\n\nĐây là email nhắc nhở thanh toán cho booking #{booking_reference}.\n\n**Thông tin thanh toán:**\n- Tổng tiền: {total_amount}\n- Đã thanh toán: {paid_amount}\n- **Còn lại: {balance_amount}**\n- Hạn thanh toán: {payment_due_date}\n\n**Thông tin chuyến đi:**\n- Campsite: {campsite_name}\n- Check-in: {check_in_date}\n- Check-out: {check_out_date}\n\n**Phương thức thanh toán:**\n👉 [Thanh toán ngay]({payment_link})\n\nLưu ý: Nếu không thanh toán đúng hạn, booking của bạn có thể bị hủy.\n\nNếu bạn đã thanh toán, vui lòng bỏ qua email này.\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'payment_reminder',
  true,
  '["guest_name", "booking_reference", "total_amount", "paid_amount", "balance_amount", "payment_due_date", "campsite_name", "check_in_date", "check_out_date", "payment_link"]'::jsonb,
  'Email nhắc nhở thanh toán số tiền còn lại'
),
(
  'Booking Cancellation',
  'booking-cancellation',
  'Xác nhận hủy booking #{booking_reference}',
  E'Xin chào {guest_name},\n\nĐặt phòng #{booking_reference} của bạn đã được hủy.\n\n**Thông tin booking đã hủy:**\n- Campsite: {campsite_name}\n- Check-in: {check_in_date}\n- Check-out: {check_out_date}\n- Tổng tiền: {total_amount}\n\n**Thông tin hoàn tiền:**\n{refund_info}\n\nNếu đây không phải là yêu cầu của bạn, vui lòng liên hệ ngay: {support_email}\n\nChúng tôi hy vọng được phục vụ bạn trong tương lai.\n\nTrân trọng,\nĐội ngũ GlampingHub',
  'cancellation',
  true,
  '["guest_name", "booking_reference", "campsite_name", "check_in_date", "check_out_date", "total_amount", "refund_info", "support_email"]'::jsonb,
  'Email xác nhận khi booking bị hủy'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  type = EXCLUDED.type,
  is_default = EXCLUDED.is_default,
  available_variables = EXCLUDED.available_variables,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert default automation rules (3 rules)
INSERT INTO email_automation_rules (name, description, template_id, trigger_event, trigger_timing, is_active)
SELECT
  'Auto-send Booking Confirmation',
  'Tự động gửi email xác nhận ngay khi booking được tạo',
  id,
  'booking_created',
  'immediate',
  true
FROM email_templates WHERE slug = 'booking-confirmation'
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_rules (name, description, template_id, trigger_event, trigger_timing, trigger_offset_days, trigger_time, is_active)
SELECT
  'Auto-send Pre-Arrival Reminder',
  'Tự động gửi email nhắc nhở 1 ngày trước check-in lúc 9:00 sáng',
  id,
  'pre_arrival',
  'scheduled',
  -1, -- 1 day before
  '09:00:00',
  true
FROM email_templates WHERE slug = 'pre-arrival-reminder'
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_rules (name, description, template_id, trigger_event, trigger_timing, trigger_offset_days, trigger_time, is_active)
SELECT
  'Auto-send Post-Stay Thank You',
  'Tự động gửi email cảm ơn 1 ngày sau check-out lúc 10:00 sáng',
  id,
  'post_stay',
  'scheduled',
  1, -- 1 day after
  '10:00:00',
  true
FROM email_templates WHERE slug = 'post-stay-thank-you'
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE email_automation_rules IS 'Quy tắc tự động gửi email dựa trên sự kiện';
COMMENT ON TABLE email_logs IS 'Lịch sử gửi email và tracking engagement';
COMMENT ON TABLE email_queue IS 'Hàng đợi email được lên lịch gửi';

-- ============================================
-- Migration: 20250117000001_unified_booking_status.sql
-- ============================================

-- Migration: Unified Booking Status System
-- Date: 2025-01-17
-- Description: Replace dual status system (status + payment_status) with single unified_status field

-- =============================================================================
-- STEP 1: Add new unified_status column
-- =============================================================================

ALTER TABLE bookings
ADD COLUMN unified_status VARCHAR(50);

COMMENT ON COLUMN bookings.unified_status IS 'Unified booking status combining booking state and payment state';

-- =============================================================================
-- STEP 2: Delete all existing booking data (as per requirement)
-- =============================================================================

-- First, delete related records in other tables that reference bookings (skip if tables don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_extras') THEN
    DELETE FROM booking_extras WHERE booking_id IN (SELECT id FROM bookings);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
    DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings);
  END IF;
END $$;

-- Delete all bookings
DELETE FROM bookings;

COMMENT ON TABLE bookings IS 'Booking data cleared during migration to unified status system';

-- =============================================================================
-- STEP 3: Add new timestamp columns
-- =============================================================================

ALTER TABLE bookings
ADD COLUMN checked_in_at TIMESTAMP,
ADD COLUMN checked_out_at TIMESTAMP;

COMMENT ON COLUMN bookings.checked_in_at IS 'Timestamp when guest checked in';
COMMENT ON COLUMN bookings.checked_out_at IS 'Timestamp when guest checked out';

-- =============================================================================
-- STEP 4: Set unified_status as NOT NULL with default value
-- =============================================================================

ALTER TABLE bookings
ALTER COLUMN unified_status SET NOT NULL,
ALTER COLUMN unified_status SET DEFAULT 'pending_payment';

-- =============================================================================
-- STEP 5: Add check constraint for valid status values
-- =============================================================================

ALTER TABLE bookings
ADD CONSTRAINT valid_unified_status CHECK (
  unified_status IN (
    -- Payment flow
    'pending_payment',
    'payment_expired',
    -- Confirmation flow
    'pending_confirmation_deposit',
    'pending_confirmation_fully_paid',
    -- Active bookings
    'confirmed_deposit_paid',
    'confirmed_fully_paid',
    'checked_in',
    'checked_out',
    -- Cancellations
    'cancelled_refund_pending',
    'cancelled_refunded',
    'cancelled_no_refund'
  )
);

-- =============================================================================
-- STEP 6: Create indexes for performance
-- =============================================================================

CREATE INDEX idx_bookings_unified_status ON bookings(unified_status);
CREATE INDEX idx_bookings_checked_in_at ON bookings(checked_in_at);
CREATE INDEX idx_bookings_checked_out_at ON bookings(checked_out_at);

-- Add composite index for common queries
CREATE INDEX idx_bookings_status_dates ON bookings(unified_status, check_in_date, check_out_date);

-- =============================================================================
-- STEP 7: Drop old status columns and their indexes
-- =============================================================================

-- Drop old indexes first
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_payment_status;

-- Drop old columns
ALTER TABLE bookings
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS payment_status;

-- =============================================================================
-- STEP 8: Update default values for bookings table
-- =============================================================================

-- Ensure nights is calculated correctly (not null)
-- Skip if nights column doesn't exist or is generated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'nights'
    AND is_generated = 'NEVER'
  ) THEN
    ALTER TABLE bookings ALTER COLUMN nights SET NOT NULL;
  END IF;
END $$;

-- Set default for numeric fields (only if they exist)
DO $$
BEGIN
  -- Children
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'children') THEN
    ALTER TABLE bookings ALTER COLUMN children SET DEFAULT 0;
  END IF;
  -- Infants
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'infants') THEN
    ALTER TABLE bookings ALTER COLUMN infants SET DEFAULT 0;
  END IF;
  -- Vehicles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'vehicles') THEN
    ALTER TABLE bookings ALTER COLUMN vehicles SET DEFAULT 0;
  END IF;
  -- Dogs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'dogs') THEN
    ALTER TABLE bookings ALTER COLUMN dogs SET DEFAULT 0;
  END IF;
  -- Products cost
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'products_cost') THEN
    ALTER TABLE bookings ALTER COLUMN products_cost SET DEFAULT 0;
  END IF;
  -- Products tax
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'products_tax') THEN
    ALTER TABLE bookings ALTER COLUMN products_tax SET DEFAULT 0;
  END IF;
  -- Discount amount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'discount_amount') THEN
    ALTER TABLE bookings ALTER COLUMN discount_amount SET DEFAULT 0;
  END IF;
  -- Tax amount (may not exist in older schemas)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'tax_amount') THEN
    ALTER TABLE bookings ALTER COLUMN tax_amount SET DEFAULT 0;
  END IF;
END $$;

-- =============================================================================
-- STEP 9: Create helper function to auto-update updated_at timestamp
-- =============================================================================

-- This function is used by trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 10: Create helper function to auto-set timestamps based on status
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_set_booking_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set confirmed_at when status changes to any confirmed state
  IF (OLD.unified_status IS NULL OR
      OLD.unified_status NOT IN ('confirmed_deposit_paid', 'confirmed_fully_paid', 'checked_in', 'checked_out'))
     AND NEW.unified_status IN ('confirmed_deposit_paid', 'confirmed_fully_paid')
     AND NEW.confirmed_at IS NULL
  THEN
    NEW.confirmed_at = NOW();
  END IF;

  -- Set checked_in_at when status changes to checked_in
  IF NEW.unified_status = 'checked_in' AND OLD.unified_status != 'checked_in' AND NEW.checked_in_at IS NULL THEN
    NEW.checked_in_at = NOW();
  END IF;

  -- Set checked_out_at when status changes to checked_out
  IF NEW.unified_status = 'checked_out' AND OLD.unified_status != 'checked_out' AND NEW.checked_out_at IS NULL THEN
    NEW.checked_out_at = NOW();
  END IF;

  -- Set cancelled_at when status changes to any cancelled state
  IF NEW.unified_status LIKE 'cancelled_%'
     AND (OLD.unified_status IS NULL OR OLD.unified_status NOT LIKE 'cancelled_%')
     AND NEW.cancelled_at IS NULL
  THEN
    NEW.cancelled_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS auto_set_booking_timestamps_trigger ON bookings;

-- Create trigger to auto-set timestamps
CREATE TRIGGER auto_set_booking_timestamps_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_booking_timestamps();

-- =============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- =============================================================================

-- Verify column exists
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'bookings' AND column_name = 'unified_status';

-- Verify constraint exists
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'valid_unified_status';

-- Verify indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'bookings' AND indexname LIKE '%status%';

-- Count remaining bookings (should be 0)
-- SELECT COUNT(*) FROM bookings;

-- =============================================================================
-- ROLLBACK (if needed - DANGEROUS, only for testing)
-- =============================================================================

-- DO NOT RUN IN PRODUCTION
-- This is for reference only if rollback is absolutely necessary

/*
-- Re-add old columns
ALTER TABLE bookings
ADD COLUMN status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';

-- Drop new column
ALTER TABLE bookings
DROP COLUMN IF EXISTS unified_status,
DROP COLUMN IF EXISTS checked_in_at,
DROP COLUMN IF EXISTS checked_out_at;

-- Drop new indexes
DROP INDEX IF EXISTS idx_bookings_unified_status;
DROP INDEX IF EXISTS idx_bookings_checked_in_at;
DROP INDEX IF EXISTS idx_bookings_checked_out_at;
DROP INDEX IF EXISTS idx_bookings_status_dates;

-- Drop constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_unified_status;

-- Drop triggers
DROP TRIGGER IF EXISTS auto_set_booking_timestamps_trigger ON bookings;
DROP FUNCTION IF EXISTS auto_set_booking_timestamps();
*/

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

-- ============================================
-- Migration: 20250118_add_search_performance_indexes.sql
-- ============================================

-- =====================================================
-- SEARCH PERFORMANCE OPTIMIZATION - MISSING INDEXES
-- =====================================================
-- Created: 2025-01-18
-- Purpose: Add composite indexes to optimize search API queries
-- Expected Impact: 2-3x performance improvement
-- Reference: docs/PERFORMANCE_ANALYSIS_2025-01-18.md
-- =====================================================

-- =====================================================
-- CAMPSITE IMAGES INDEXES
-- =====================================================

-- Optimize featured image lookup (used in search results)
-- Query: SELECT ci.image_url FROM campsite_images ci WHERE ci.campsite_id = ? AND ci.is_featured = true
CREATE INDEX IF NOT EXISTS idx_campsite_images_featured
ON campsite_images(campsite_id, is_featured)
WHERE is_featured = true;

-- Optimize images list with ordering (used in search results)
-- Query: SELECT json_agg(ci.image_url ORDER BY ci.display_order) FROM campsite_images ci WHERE ci.campsite_id = ?
CREATE INDEX IF NOT EXISTS idx_campsite_images_display
ON campsite_images(campsite_id, display_order);

-- =====================================================
-- CAMPSITE FILTERS INDEXES
-- =====================================================

-- Optimize features lookup (used in search results)
-- Query: SELECT json_agg(f.name) FROM campsite_filters cf JOIN filters f WHERE cf.campsite_id = ? AND cf.is_included = true
CREATE INDEX IF NOT EXISTS idx_campsite_filters_included
ON campsite_filters(campsite_id, is_included, filter_id)
WHERE is_included = true;

-- =====================================================
-- CAMPSITES SEARCH INDEXES
-- =====================================================

-- Optimize active campsite filtering by location
-- Query: SELECT * FROM campsites WHERE is_active = true AND (city LIKE ? OR province LIKE ?)
CREATE INDEX IF NOT EXISTS idx_campsites_active_city
ON campsites(is_active, city, province)
WHERE is_active = true;

-- Full-text search index for location search (Vietnamese + English)
-- Query: Search by name (vi/en), city, province, address
CREATE INDEX IF NOT EXISTS idx_campsites_location_search
ON campsites USING gin(
  to_tsvector('simple',
    coalesce(name->>'vi', '') || ' ' ||
    coalesce(name->>'en', '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(province, '') || ' ' ||
    coalesce(address, '')
  )
);

-- =====================================================
-- PITCH FEATURES INDEXES
-- =====================================================

-- Optimize electric pitch check (very common filter)
-- Query: EXISTS(SELECT 1 FROM pitch_features pf WHERE pf.pitch_id = ? AND LOWER(pf.name::text) LIKE '%electric%')
CREATE INDEX IF NOT EXISTS idx_pitch_features_electric
ON pitch_features(pitch_id)
WHERE LOWER(name::text) LIKE '%electric%' OR LOWER(name::text) LIKE '%điện%';

-- =====================================================
-- PITCHES COMPOSITE INDEX
-- =====================================================

-- Optimize pitch listing with sorting (used in search results for top 3 pitches)
-- Query: SELECT * FROM pitches WHERE campsite_id = ? AND is_active = true ORDER BY sort_order, id
CREATE INDEX IF NOT EXISTS idx_pitches_campsite_active_sort
ON pitches(campsite_id, is_active, sort_order, id)
WHERE is_active = true;

-- =====================================================
-- ANALYZE TABLES
-- =====================================================
-- Update table statistics for query planner

ANALYZE campsites;
ANALYZE campsite_images;
ANALYZE campsite_filters;
ANALYZE pitches;
ANALYZE pitch_features;
ANALYZE filters;

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================
--
-- These indexes target the most expensive subqueries in the search API:
-- 1. Featured image lookup (1 per campsite)
-- 2. Images aggregation (1 per campsite)
-- 3. Features aggregation (1 per campsite)
-- 4. Location search (1 per request)
-- 5. Pitch listing with electric check (3 per campsite)
--
-- Expected query time reduction: 50-70%
-- Index storage overhead: ~5-10 MB
-- Maintenance overhead: Minimal (auto-updated on INSERT/UPDATE)
--
-- =====================================================

-- ============================================
-- Migration: 20251118000000_add_tax_system.sql
-- ============================================

-- ============================================================================
-- Migration: Add Tax System for Accommodation
-- Date: 2025-01-18
-- Description: Add tax configuration at campsite level and tax tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add tax configuration to campsites table
-- ----------------------------------------------------------------------------
ALTER TABLE campsites
ADD COLUMN tax_enabled BOOLEAN DEFAULT false,
ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN tax_name JSONB DEFAULT '{"vi": "VAT", "en": "VAT"}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN campsites.tax_enabled IS 'Enable/disable tax for this campsite';
COMMENT ON COLUMN campsites.tax_rate IS 'Tax rate percentage (e.g., 10.00 for 10% VAT)';
COMMENT ON COLUMN campsites.tax_name IS 'Multilingual tax name: {"vi": "VAT", "en": "VAT"}';

-- ----------------------------------------------------------------------------
-- STEP 2: Add tax fields to bookings table
-- ----------------------------------------------------------------------------
ALTER TABLE bookings
ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN subtotal_before_tax DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN bookings.tax_rate IS 'Tax rate at time of booking (snapshot from campsite)';
COMMENT ON COLUMN bookings.tax_amount IS 'Calculated tax amount for this booking';
COMMENT ON COLUMN bookings.subtotal_before_tax IS 'Subtotal before applying accommodation tax';

-- ----------------------------------------------------------------------------
-- STEP 3: Update generated column for total_amount
-- ----------------------------------------------------------------------------
-- Must drop existing generated columns first
ALTER TABLE bookings
DROP COLUMN IF EXISTS total_amount,
DROP COLUMN IF EXISTS deposit_amount,
DROP COLUMN IF EXISTS balance_amount;

-- Recreate total_amount with tax included
ALTER TABLE bookings
ADD COLUMN total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
  accommodation_cost + products_cost + products_tax - discount_amount + tax_amount
) STORED;

-- Recreate deposit_amount (includes tax in calculation)
ALTER TABLE bookings
ADD COLUMN deposit_amount DECIMAL(10,2) GENERATED ALWAYS AS (
  (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) * deposit_percentage / 100
) STORED;

-- Recreate balance_amount (includes tax in calculation)
ALTER TABLE bookings
ADD COLUMN balance_amount DECIMAL(10,2) GENERATED ALWAYS AS (
  (accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) -
  ((accommodation_cost + products_cost + products_tax - discount_amount + tax_amount) * deposit_percentage / 100)
) STORED;

-- ----------------------------------------------------------------------------
-- STEP 4: Create tax_history table for tracking changes
-- ----------------------------------------------------------------------------
CREATE TABLE tax_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campsite_id UUID NOT NULL REFERENCES campsites(id) ON DELETE CASCADE,

  -- Old values
  old_tax_enabled BOOLEAN,
  old_tax_rate DECIMAL(5,2),
  old_tax_name JSONB,

  -- New values
  new_tax_enabled BOOLEAN,
  new_tax_rate DECIMAL(5,2),
  new_tax_name JSONB,

  -- Change tracking
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_tax_history_campsite ON tax_history(campsite_id);
CREATE INDEX idx_tax_history_date ON tax_history(changed_at DESC);
CREATE INDEX idx_tax_history_changed_by ON tax_history(changed_by);

-- Add comments
COMMENT ON TABLE tax_history IS 'Tracks all changes to campsite tax configuration';
COMMENT ON COLUMN tax_history.change_reason IS 'Reason for changing tax configuration (e.g., "Government regulation change")';

-- ----------------------------------------------------------------------------
-- STEP 5: Add trigger to automatically log tax changes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_tax_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if tax-related fields actually changed
  IF (OLD.tax_enabled IS DISTINCT FROM NEW.tax_enabled) OR
     (OLD.tax_rate IS DISTINCT FROM NEW.tax_rate) OR
     (OLD.tax_name IS DISTINCT FROM NEW.tax_name) THEN

    INSERT INTO tax_history (
      campsite_id,
      old_tax_enabled,
      old_tax_rate,
      old_tax_name,
      new_tax_enabled,
      new_tax_rate,
      new_tax_name,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.tax_enabled,
      OLD.tax_rate,
      OLD.tax_name,
      NEW.tax_enabled,
      NEW.tax_rate,
      NEW.tax_name,
      NULL,  -- Will be set by application
      'Auto-logged by trigger'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_change_trigger
AFTER UPDATE ON campsites
FOR EACH ROW
EXECUTE FUNCTION log_tax_change();

-- ============================================================================
-- End of migration
-- ============================================================================

-- ============================================
-- Migration: 20251118000001_drop_pitch_product_inventory.sql
-- ============================================

-- Drop unused pitch_product_inventory table
-- This table was created but never implemented in the codebase
-- The system uses max_quantity from pitch_products instead

DROP TABLE IF EXISTS pitch_product_inventory CASCADE;

-- ============================================
-- Migration: 20251118000002_fix_duplicate_tax_history.sql
-- ============================================

-- ============================================================================
-- Migration: Fix Duplicate Tax History Entries
-- Date: 2025-01-18
-- Description: Remove trigger that causes duplicate tax_history entries
--              Keep only manual logging from API endpoint
-- ============================================================================

-- Drop the trigger that auto-logs tax changes
-- This prevents duplicate entries since the API endpoint also logs changes
DROP TRIGGER IF EXISTS tax_change_trigger ON campsites;

-- Drop the trigger function (no longer needed)
DROP FUNCTION IF EXISTS log_tax_change();

-- ============================================================================
-- Rationale:
-- The tax_change_trigger was creating duplicate entries in tax_history because:
-- 1. Trigger auto-inserts on UPDATE campsites
-- 2. API endpoint (/api/admin/campsites/[id]/tax) also manually inserts
--
-- We keep only the manual API logging because it has access to:
-- - changed_by (session.userId)
-- - change_reason (from user input)
--
-- This provides better audit trail than the trigger's generic "Auto-logged by trigger"
-- ============================================================================

-- ============================================
-- Migration: 20251118000003_booking_nightly_pricing.sql
-- ============================================

-- Migration: Create booking_nightly_pricing table
-- Purpose: Store per-night pricing breakdown for bookings with detailed cost allocation
-- Created: 2025-11-18

-- Create booking_nightly_pricing table
CREATE TABLE IF NOT EXISTS booking_nightly_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Base pricing components for this specific night
  base_pitch_price DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Extra person charges for this night
  extra_adult_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  extra_adult_count INTEGER NOT NULL DEFAULT 0,
  extra_child_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  extra_child_count INTEGER NOT NULL DEFAULT 0,

  -- Calculated fields (stored for performance and auditability)
  night_subtotal_before_discounts DECIMAL(10,2) GENERATED ALWAYS AS (
    base_pitch_price +
    (extra_adult_price * extra_adult_count) +
    (extra_child_price * extra_child_count)
  ) STORED,

  total_discounts_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

  night_subtotal_after_discounts DECIMAL(10,2) GENERATED ALWAYS AS (
    base_pitch_price +
    (extra_adult_price * extra_adult_count) +
    (extra_child_price * extra_child_count) -
    total_discounts_amount
  ) STORED,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(booking_id, date),

  -- Validation constraints
  CONSTRAINT valid_base_price CHECK (base_pitch_price >= 0),
  CONSTRAINT valid_adult_price CHECK (extra_adult_price >= 0),
  CONSTRAINT valid_adult_count CHECK (extra_adult_count >= 0),
  CONSTRAINT valid_child_price CHECK (extra_child_price >= 0),
  CONSTRAINT valid_child_count CHECK (extra_child_count >= 0),
  CONSTRAINT valid_discount_amount CHECK (total_discounts_amount >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_booking_nightly_pricing_booking_id
  ON booking_nightly_pricing(booking_id);

CREATE INDEX idx_booking_nightly_pricing_date
  ON booking_nightly_pricing(date);

CREATE INDEX idx_booking_nightly_pricing_booking_date
  ON booking_nightly_pricing(booking_id, date);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_nightly_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_booking_nightly_pricing_updated_at
  BEFORE UPDATE ON booking_nightly_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_nightly_pricing_updated_at();

-- Add comments for documentation
COMMENT ON TABLE booking_nightly_pricing IS 'Stores detailed per-night pricing breakdown for bookings including base price, extra person charges, and discounts';
COMMENT ON COLUMN booking_nightly_pricing.base_pitch_price IS 'Base pitch rental price for this specific night (from pricing_calendar or default)';
COMMENT ON COLUMN booking_nightly_pricing.extra_adult_price IS 'Price per extra adult for this night (snapshot from pitch settings)';
COMMENT ON COLUMN booking_nightly_pricing.extra_child_price IS 'Price per extra child for this night (snapshot from pitch settings)';
COMMENT ON COLUMN booking_nightly_pricing.total_discounts_amount IS 'Total of all discounts applied to this specific night (sum from booking_nightly_discounts)';
COMMENT ON COLUMN booking_nightly_pricing.night_subtotal_before_discounts IS 'Calculated total before any discounts applied';
COMMENT ON COLUMN booking_nightly_pricing.night_subtotal_after_discounts IS 'Final price for this night after all discounts';

-- ============================================
-- Migration: 20251118000004_booking_nightly_discounts.sql
-- ============================================

-- Migration: Create booking_nightly_discounts table
-- Purpose: Store multiple stackable discounts applied to each night of a booking
-- Created: 2025-11-18

-- Create booking_nightly_discounts table
CREATE TABLE IF NOT EXISTS booking_nightly_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_nightly_pricing_id UUID NOT NULL REFERENCES booking_nightly_pricing(id) ON DELETE CASCADE,
  discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,

  -- Snapshot of discount details at booking time
  -- (Important: Store values because discount rules may change later)
  discount_name VARCHAR(255) NOT NULL,
  discount_code VARCHAR(100),  -- NULL for auto-discounts, value for vouchers
  discount_category VARCHAR(50) NOT NULL,  -- 'discounts' or 'vouchers'
  discount_type VARCHAR(50) NOT NULL,  -- 'percentage' or 'fixed_amount'
  discount_value DECIMAL(10,2) NOT NULL,  -- e.g., 20 for 20%, or 100000 for 100k VND

  -- Calculation for this specific night
  original_amount DECIMAL(10,2) NOT NULL,  -- Price before THIS discount applied
  discount_amount DECIMAL(10,2) NOT NULL,  -- Amount saved by THIS discount
  final_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    original_amount - discount_amount
  ) STORED,

  -- Ordering for display (multiple discounts applied sequentially)
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validation constraints
  CONSTRAINT valid_discount_value CHECK (discount_value >= 0),
  CONSTRAINT valid_original_amount CHECK (original_amount >= 0),
  CONSTRAINT valid_discount_amount CHECK (discount_amount >= 0),
  CONSTRAINT discount_not_exceed_original CHECK (discount_amount <= original_amount),
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed_amount')),
  CONSTRAINT valid_discount_category CHECK (discount_category IN ('discounts', 'vouchers'))
);

-- Create indexes for performance
CREATE INDEX idx_booking_nightly_discounts_pricing_id
  ON booking_nightly_discounts(booking_nightly_pricing_id);

CREATE INDEX idx_booking_nightly_discounts_discount_id
  ON booking_nightly_discounts(discount_id);

CREATE INDEX idx_booking_nightly_discounts_sort_order
  ON booking_nightly_discounts(booking_nightly_pricing_id, sort_order);

-- Add function to update total_discounts_amount in booking_nightly_pricing
-- This ensures the parent table stays in sync when discounts are added/removed/updated
CREATE OR REPLACE FUNCTION update_nightly_pricing_total_discounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total discounts for the affected booking_nightly_pricing row
  UPDATE booking_nightly_pricing
  SET total_discounts_amount = (
    SELECT COALESCE(SUM(discount_amount), 0)
    FROM booking_nightly_discounts
    WHERE booking_nightly_pricing_id = COALESCE(NEW.booking_nightly_pricing_id, OLD.booking_nightly_pricing_id)
  )
  WHERE id = COALESCE(NEW.booking_nightly_pricing_id, OLD.booking_nightly_pricing_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to keep total_discounts_amount in sync
CREATE TRIGGER trigger_update_nightly_discounts_on_insert
  AFTER INSERT ON booking_nightly_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_nightly_pricing_total_discounts();

CREATE TRIGGER trigger_update_nightly_discounts_on_update
  AFTER UPDATE ON booking_nightly_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_nightly_pricing_total_discounts();

CREATE TRIGGER trigger_update_nightly_discounts_on_delete
  AFTER DELETE ON booking_nightly_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_nightly_pricing_total_discounts();

-- Add comments for documentation
COMMENT ON TABLE booking_nightly_discounts IS 'Stores multiple stackable discounts applied to each night of a booking (e.g., early bird + weekend + member tier)';
COMMENT ON COLUMN booking_nightly_discounts.booking_nightly_pricing_id IS 'Reference to the specific night this discount applies to';
COMMENT ON COLUMN booking_nightly_discounts.discount_id IS 'Reference to the discount rule (nullable if discount deleted later)';
COMMENT ON COLUMN booking_nightly_discounts.discount_code IS 'Voucher code if applicable, NULL for auto-discounts';
COMMENT ON COLUMN booking_nightly_discounts.discount_category IS 'Whether this is an auto-discount or voucher code';
COMMENT ON COLUMN booking_nightly_discounts.original_amount IS 'Price before this discount was applied (may already include previous discounts if stacked)';
COMMENT ON COLUMN booking_nightly_discounts.discount_amount IS 'Amount saved by this specific discount';
COMMENT ON COLUMN booking_nightly_discounts.sort_order IS 'Order in which discounts were applied (important for percentage stacking)';

-- ============================================
-- Migration: 20251118000005_update_booking_products_discounts.sql
-- ============================================

-- Migration: Update booking_products table to support individual product discounts
-- Purpose: Allow products to have auto-discounts and voucher codes with original price tracking
-- Created: 2025-11-18

-- Add discount-related columns to booking_products
ALTER TABLE booking_products
  ADD COLUMN IF NOT EXISTS original_unit_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS discount_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discount_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Add validation constraints
ALTER TABLE booking_products
  ADD CONSTRAINT valid_original_unit_price CHECK (original_unit_price IS NULL OR original_unit_price >= 0),
  ADD CONSTRAINT valid_product_discount_amount CHECK (discount_amount >= 0),
  ADD CONSTRAINT valid_product_discount_value CHECK (discount_value IS NULL OR discount_value >= 0),
  ADD CONSTRAINT valid_product_discount_type CHECK (
    discount_type IS NULL OR discount_type IN ('percentage', 'fixed_amount')
  ),
  ADD CONSTRAINT valid_product_discount_category CHECK (
    discount_category IS NULL OR discount_category IN ('discounts', 'vouchers')
  );

-- Backfill original_unit_price for existing records (use current unit_price as original)
UPDATE booking_products
SET original_unit_price = unit_price
WHERE original_unit_price IS NULL;

-- Make original_unit_price NOT NULL after backfill
ALTER TABLE booking_products
  ALTER COLUMN original_unit_price SET NOT NULL;

-- Drop the existing unit_price constraint if it exists
ALTER TABLE booking_products
  DROP CONSTRAINT IF EXISTS booking_products_unit_price_check;

-- Update unit_price to be calculated from original_unit_price - discount_amount
-- Note: We keep unit_price as a regular column (not generated) for backward compatibility
-- The application logic will calculate: unit_price = original_unit_price - discount_amount

-- Add total_price recalculation (already exists as generated column, but ensure it accounts for discounts)
-- Current formula should be: (unit_price * quantity) + tax_amount
-- This will automatically reflect discounted prices since unit_price = original - discount

-- Add index for discount lookups
CREATE INDEX IF NOT EXISTS idx_booking_products_discount_id
  ON booking_products(discount_id);

-- Add comments for documentation
COMMENT ON COLUMN booking_products.original_unit_price IS 'Original price per unit before any discounts (snapshot at booking time)';
COMMENT ON COLUMN booking_products.discount_id IS 'Reference to the discount rule applied (nullable if discount deleted later)';
COMMENT ON COLUMN booking_products.discount_name IS 'Snapshot of discount name at booking time';
COMMENT ON COLUMN booking_products.discount_code IS 'Voucher code if applicable, NULL for auto-discounts';
COMMENT ON COLUMN booking_products.discount_category IS 'Whether this is an auto-discount or voucher code';
COMMENT ON COLUMN booking_products.discount_type IS 'Type of discount: percentage or fixed_amount';
COMMENT ON COLUMN booking_products.discount_value IS 'Discount value (e.g., 20 for 20%, or 50000 for 50k VND)';
COMMENT ON COLUMN booking_products.discount_amount IS 'Actual discount amount applied to each unit';

-- Note: The application should ensure unit_price = original_unit_price - discount_amount when inserting/updating

-- ============================================
-- Migration: 20251118000006_update_bookings_policy_snapshot.sql
-- ============================================

-- Migration: Update bookings table for cancellation policy snapshot and discount breakdowns
-- Purpose: Store cancellation policy at booking time and separate accommodation vs product discounts
-- Created: 2025-11-18

-- Add new columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS accommodation_discount_total DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_discount_total DECIMAL(10,2) DEFAULT 0;

-- Add validation constraints
ALTER TABLE bookings
  ADD CONSTRAINT valid_accommodation_discount_total CHECK (accommodation_discount_total >= 0),
  ADD CONSTRAINT valid_products_discount_total CHECK (products_discount_total >= 0);

-- Migrate existing discount_amount to accommodation_discount_total
-- (Assumption: existing discount_amount was for accommodation only)
UPDATE bookings
SET accommodation_discount_total = discount_amount
WHERE accommodation_discount_total = 0 AND discount_amount > 0;

-- Add index for policy snapshot queries (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_policy
  ON bookings USING GIN (cancellation_policy_snapshot);

-- Add comments for documentation
COMMENT ON COLUMN bookings.cancellation_policy_snapshot IS 'Snapshot of campsite cancellation policy at the time of booking (JSONB). Format: {rules: [{hours_before: number, refund_percentage: number}], description: {vi: string, en: string}}';
COMMENT ON COLUMN bookings.accommodation_discount_total IS 'Total discount amount applied to accommodation (pitch rental + extra person charges)';
COMMENT ON COLUMN bookings.products_discount_total IS 'Total discount amount applied to products/extras';

-- Note: Keep existing discount_amount column for backward compatibility
-- New bookings should populate both accommodation_discount_total AND discount_amount
-- discount_amount can be calculated as: accommodation_discount_total + products_discount_total

-- Create function to ensure discount_amount stays in sync (optional, for safety)
CREATE OR REPLACE FUNCTION sync_booking_discount_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure discount_amount equals the sum of accommodation and products discounts
  NEW.discount_amount = COALESCE(NEW.accommodation_discount_total, 0) + COALESCE(NEW.products_discount_total, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to keep discount_amount synchronized
DROP TRIGGER IF EXISTS trigger_sync_booking_discount_amount ON bookings;
CREATE TRIGGER trigger_sync_booking_discount_amount
  BEFORE INSERT OR UPDATE OF accommodation_discount_total, products_discount_total ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_discount_amount();

-- Sample cancellation_policy_snapshot structure for reference:
-- {
--   "rules": [
--     {"hours_before_checkin": 168, "refund_percentage": 100},
--     {"hours_before_checkin": 72, "refund_percentage": 50},
--     {"hours_before_checkin": 24, "refund_percentage": 25},
--     {"hours_before_checkin": 0, "refund_percentage": 0}
--   ],
--   "description": {
--     "vi": "Hủy trước 7 ngày: Hoàn 100%. Hủy trước 3 ngày: Hoàn 50%. Hủy trước 1 ngày: Hoàn 25%. Hủy trong 24h: Không hoàn tiền.",
--     "en": "Cancel 7+ days before: 100% refund. Cancel 3+ days: 50% refund. Cancel 1+ day: 25% refund. Cancel within 24h: No refund."
--   },
--   "snapshot_at": "2025-11-18T10:30:00Z"
-- }

-- ============================================
-- Migration: 20251118_update_bookings_party_names.sql
-- ============================================

-- Migration: Update bookings table - add party_names, remove type_of_visit and vehicle_registration
-- Date: 2025-11-18
-- Description: Add party_names field and remove unused fields from bookings table

-- Add party_names column
ALTER TABLE bookings
  ADD COLUMN party_names TEXT;

-- Drop unused columns
ALTER TABLE bookings
  DROP COLUMN IF EXISTS type_of_visit,
  DROP COLUMN IF EXISTS vehicle_registration;

-- Add comment
COMMENT ON COLUMN bookings.party_names IS 'Names of all people in the party (comma-separated or line-separated)';

-- ============================================
-- End of migrations
-- ============================================

-- ============================================
-- Migration: 20251119_fix_login_history_column
-- ============================================

-- Fix column name mismatch in login_history table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'login_history'
    AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE login_history RENAME COLUMN admin_id TO user_id;
    RAISE NOTICE 'Column admin_id renamed to user_id in login_history table';
  ELSE
    RAISE NOTICE 'Column admin_id does not exist in login_history table - already fixed or using correct name';
  END IF;
END $$;

COMMENT ON COLUMN login_history.user_id IS 'Reference to the staff user (users table) who logged in';

-- ============================================
-- Seed Demo Users for Testing
-- ============================================
-- WARNING: These are demo accounts with known passwords
-- REMOVE OR CHANGE PASSWORDS in production!

INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES
  (
    'admin@glampinghub.com',
    '$2b$10$3A.YoPba30Fgxe.cre2B7uRPuWeoPtFS8a3FDj9JtXl1JD3u4IqWG', -- Admin123!
    'Admin',
    'GlampingHub',
    'admin',
    true
  ),
  (
    'sale@glampinghub.com',
    '$2b$10$mCRl2kgkxtxmYaqYesq8JOz8X9RIyfiHdNQSXkyq3cgWXU6N/h/ju', -- Sale123!
    'Sale',
    'GlampingHub',
    'sale',
    true
  ),
  (
    'operations@glampinghub.com',
    '$2b$10$y5JPXpTnXwh9NU2RT.98b.ZKZ81IMeW7niyqdDGv8i9i3XA3CRy2a', -- Operations123!
    'Operations',
    'GlampingHub',
    'operations',
    true
  )
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- ============================================
-- Demo Accounts Summary:
-- Admin:      admin@glampinghub.com      / Admin123!
-- Sale:       sale@glampinghub.com       / Sale123!
-- Operations: operations@glampinghub.com / Operations123!
-- ============================================

-- ============================================
-- Complete - Ready for Production Deployment
-- ============================================
