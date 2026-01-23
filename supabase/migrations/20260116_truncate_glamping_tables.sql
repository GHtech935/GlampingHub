-- ============================================
-- TRUNCATE ALL GLAMPING TABLES
-- This will delete all data from glamping_ tables
-- Date: 2026-01-16
-- ============================================

-- Disable triggers temporarily to avoid issues
SET session_replication_role = replica;

-- Truncate all glamping tables in reverse dependency order
-- Using CASCADE to handle foreign key constraints

TRUNCATE TABLE glamping_booking_taxes CASCADE;
TRUNCATE TABLE glamping_booking_status_history CASCADE;
TRUNCATE TABLE glamping_booking_payments CASCADE;
TRUNCATE TABLE glamping_booking_parameters CASCADE;
TRUNCATE TABLE glamping_booking_items CASCADE;
TRUNCATE TABLE glamping_bookings CASCADE;
TRUNCATE TABLE glamping_discount_vouchers CASCADE;
TRUNCATE TABLE glamping_booking_sequences CASCADE;
TRUNCATE TABLE glamping_discount_items CASCADE;
TRUNCATE TABLE glamping_discounts CASCADE;
TRUNCATE TABLE glamping_package_settings CASCADE;
TRUNCATE TABLE glamping_item_addons CASCADE;
TRUNCATE TABLE glamping_deposit_settings CASCADE;
TRUNCATE TABLE glamping_item_taxes CASCADE;
TRUNCATE TABLE glamping_taxes CASCADE;
TRUNCATE TABLE glamping_pricing CASCADE;
TRUNCATE TABLE glamping_item_event_items CASCADE;
TRUNCATE TABLE glamping_item_events CASCADE;
TRUNCATE TABLE glamping_rules CASCADE;
TRUNCATE TABLE glamping_rule_sets CASCADE;
TRUNCATE TABLE glamping_item_media CASCADE;
TRUNCATE TABLE glamping_timeslots CASCADE;
TRUNCATE TABLE glamping_item_parameters CASCADE;
TRUNCATE TABLE glamping_parameters CASCADE;
TRUNCATE TABLE glamping_item_attributes CASCADE;
TRUNCATE TABLE glamping_item_tags CASCADE;
TRUNCATE TABLE glamping_items CASCADE;
TRUNCATE TABLE glamping_tags CASCADE;
TRUNCATE TABLE glamping_categories CASCADE;

-- Truncate zone-related tables if they exist
DO $$
BEGIN
  TRUNCATE TABLE glamping_zone_images CASCADE;
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist, skip
END $$;

DO $$
BEGIN
  TRUNCATE TABLE glamping_zones CASCADE;
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist, skip
END $$;

-- Truncate menu table if exists
DO $$
BEGIN
  TRUNCATE TABLE glamping_menu_items CASCADE;
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist, skip
END $$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All glamping tables have been truncated successfully';
END $$;
