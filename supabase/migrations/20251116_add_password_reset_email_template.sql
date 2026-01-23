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
