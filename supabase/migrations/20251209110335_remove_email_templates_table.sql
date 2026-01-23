-- ==========================================
-- REMOVE EMAIL_TEMPLATES TABLE
-- Description: Email templates are now defined in source code (lib/email-templates-html.ts)
--              This migration removes the email_templates table and updates related tables
-- Date: 2025-12-09
-- ==========================================

-- Step 1: Add template_slug column to email_automation_rules to replace template_id
ALTER TABLE email_automation_rules ADD COLUMN IF NOT EXISTS template_slug VARCHAR(255);

-- Copy template slugs from email_templates to email_automation_rules
UPDATE email_automation_rules ear
SET template_slug = et.slug
FROM email_templates et
WHERE ear.template_id = et.id;

-- Step 2: Drop foreign key constraints from email_logs
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_template_id_fkey;

-- Step 3: Drop foreign key constraints from email_queue
ALTER TABLE email_queue DROP CONSTRAINT IF EXISTS email_queue_template_id_fkey;

-- Step 4: Drop foreign key constraints from email_automation_rules
ALTER TABLE email_automation_rules DROP CONSTRAINT IF EXISTS email_automation_rules_template_id_fkey;

-- Step 5: Drop template_id columns (no longer needed)
ALTER TABLE email_logs DROP COLUMN IF EXISTS template_id;
ALTER TABLE email_queue DROP COLUMN IF EXISTS template_id;
ALTER TABLE email_automation_rules DROP COLUMN IF EXISTS template_id;

-- Step 6: Drop the email_templates table
DROP TABLE IF EXISTS email_templates;

-- Step 7: Add index for template_slug
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_template_slug ON email_automation_rules(template_slug);

-- Comments
COMMENT ON COLUMN email_automation_rules.template_slug IS 'Slug reference to email template defined in source code (lib/email-templates-html.ts)';
