-- Migration: Add admin_settings table
-- Date: 2025-12-02
-- Description: Create admin_settings table for system-wide configuration

-- ============================================================================
-- Create admin_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE admin_settings IS 'System-wide configuration settings manageable by admin';
COMMENT ON COLUMN admin_settings.key IS 'Unique setting key identifier';
COMMENT ON COLUMN admin_settings.value IS 'Setting value stored as JSONB (can be boolean, string, number, object)';
COMMENT ON COLUMN admin_settings.description IS 'Human-readable description of the setting';
COMMENT ON COLUMN admin_settings.updated_by IS 'Last admin who updated this setting';

-- Index for fast lookup by key
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- ============================================================================
-- Insert default settings
-- ============================================================================

INSERT INTO admin_settings (key, value, description) VALUES
  ('allow_pay_later', 'true', 'Cho phép khách hàng chọn option "Trả tiền khi checkout". Nếu tắt, khách phải thanh toán 100% trước khi booking được xác nhận.')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER trigger_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
