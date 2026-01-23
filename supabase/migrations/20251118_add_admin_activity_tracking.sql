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
