-- Migration: Add per-item discount fields to booking tents and menu products
-- This allows storing individual voucher/discount information per tent and per product

-- glamping_booking_tents: add discount columns
ALTER TABLE glamping_booking_tents
  ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS voucher_id UUID,
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;

-- glamping_booking_menu_products: add discount columns
ALTER TABLE glamping_booking_menu_products
  ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS voucher_id UUID,
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
