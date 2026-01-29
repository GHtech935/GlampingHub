-- Migration: Add menu-selection-reminder cron job and update descriptions
-- Created: 2026-01-26
-- Description: Inserts the new menu-selection-reminder job and updates existing job descriptions for glamping

-- Insert menu-selection-reminder job
INSERT INTO cron_jobs (name, slug, description, cron_expression, is_active, timezone)
VALUES (
  'Menu Selection Reminder',
  'menu-selection-reminder',
  'Send reminder emails to customers who haven''t selected menu items 48h before check-in',
  '0 */2 * * *',  -- Every 2 hours
  true,
  'Asia/Ho_Chi_Minh'
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  cron_expression = EXCLUDED.cron_expression,
  timezone = EXCLUDED.timezone,
  updated_at = NOW();

-- Update existing jobs descriptions for glamping context
UPDATE cron_jobs
SET description = 'Automatically cancel glamping bookings in pending_payment status after 30 minutes'
WHERE slug = 'cancel-expired-bookings';

UPDATE cron_jobs
SET description = 'Send glamping pre-arrival reminders (2 days before) and post-stay thank you emails (1 day after)'
WHERE slug = 'email-automation';

-- Verify the jobs
SELECT slug, name, cron_expression, is_active, description
FROM cron_jobs
ORDER BY slug;
