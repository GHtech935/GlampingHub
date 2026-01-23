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
