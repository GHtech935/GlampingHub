-- Migration: Add single person surcharge alert settings to glamping_zones
-- Created: 2026-02-01

ALTER TABLE glamping_zones
ADD COLUMN IF NOT EXISTS enable_single_person_surcharge_alert BOOLEAN DEFAULT FALSE;

ALTER TABLE glamping_zones
ADD COLUMN IF NOT EXISTS single_person_surcharge_alert_text JSONB DEFAULT
'{"vi": "Số tiền đã bao gồm phụ thu 1 người", "en": "Price includes single person surcharge"}'::jsonb;
