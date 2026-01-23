-- ============================================
-- Seed Demo Users for GlampingHub
-- ============================================
-- This file creates demo user accounts for testing
-- WARNING: These are demo accounts with known passwords - DO NOT use in production!

-- Insert demo admin user
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES
  (
    'admin@glampinghub.com',
    '$2b$10$3A.YoPba30Fgxe.cre2B7uRPuWeoPtFS8a3FDj9JtXl1JD3u4IqWG', -- Admin123!
    'Admin',
    'GlampingHub',
    'admin',
    true
  )
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Insert demo sale user
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES
  (
    'sale@glampinghub.com',
    '$2b$10$mCRl2kgkxtxmYaqYesq8JOz8X9RIyfiHdNQSXkyq3cgWXU6N/h/ju', -- Sale123!
    'Sale',
    'GlampingHub',
    'sale',
    true
  )
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Insert demo operations user
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES
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
-- Demo User Accounts Summary
-- ============================================
-- Admin:      admin@glampinghub.com      / Admin123!
-- Sale:       sale@glampinghub.com       / Sale123!
-- Operations: operations@glampinghub.com / Operations123!
-- ============================================
