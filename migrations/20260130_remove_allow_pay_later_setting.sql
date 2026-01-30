-- Migration: Remove allow_pay_later setting
-- Date: 2026-01-30
-- Description: Remove the global allow_pay_later setting from admin_settings.
--              Pay Later option is now determined by zone's deposit settings:
--              - Show Pay Later when zone has deposit > 0 and < 100%

DELETE FROM admin_settings WHERE key = 'allow_pay_later';
