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
