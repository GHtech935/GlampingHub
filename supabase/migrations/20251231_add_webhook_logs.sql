-- Migration: Add Webhook Logs System
-- Description: Track all webhook calls for debugging and monitoring
-- Author: GlampingHub Development Team
-- Date: 2025-12-31

-- Table: webhook_logs
-- Purpose: Store detailed logs of all incoming webhook requests
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request identification
  webhook_type VARCHAR(50) NOT NULL,           -- 'sepay', 'stripe', 'paypal', etc.
  request_id VARCHAR(100),                     -- Unique ID for tracking

  -- Request data
  request_headers JSONB,                       -- All headers from the request
  request_body JSONB,                          -- Raw body payload

  -- Processing timing
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,

  -- Result
  status VARCHAR(50) NOT NULL DEFAULT 'received',
    -- Values: 'received', 'processing', 'success', 'failed',
    --         'invalid_signature', 'validation_error', 'duplicate'
  http_status_code INTEGER,
  response_body JSONB,

  -- Transaction matching (specific to payment webhooks)
  transaction_code VARCHAR(255),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  booking_reference VARCHAR(50),
  matched BOOLEAN DEFAULT FALSE,
  match_type VARCHAR(50),                      -- 'auto', 'manual', 'late_payment', 'unmatched'

  -- Error details
  error_type VARCHAR(100),                     -- 'signature_invalid', 'validation_failed', 'db_error', etc.
  error_message TEXT,
  error_stack TEXT,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_webhook_logs_type_date ON webhook_logs(webhook_type, created_at DESC);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status, created_at DESC);
CREATE INDEX idx_webhook_logs_status_date ON webhook_logs(status, webhook_type, created_at DESC);
CREATE INDEX idx_webhook_logs_transaction ON webhook_logs(transaction_code) WHERE transaction_code IS NOT NULL;
CREATE INDEX idx_webhook_logs_booking ON webhook_logs(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_webhook_logs_booking_ref ON webhook_logs(booking_reference) WHERE booking_reference IS NOT NULL;
CREATE INDEX idx_webhook_logs_error ON webhook_logs(error_type, created_at DESC) WHERE error_type IS NOT NULL;
CREATE INDEX idx_webhook_logs_request_id ON webhook_logs(request_id) WHERE request_id IS NOT NULL;

-- Index for failure queries (for alerting)
CREATE INDEX idx_webhook_logs_failures ON webhook_logs(created_at DESC)
  WHERE status IN ('failed', 'invalid_signature', 'validation_error');

-- Table: webhook_alerts
-- Purpose: Track sent alerts to prevent spam
CREATE TABLE IF NOT EXISTS webhook_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type VARCHAR(50) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,             -- 'consecutive_failures', 'high_error_rate', etc.
  failure_count INTEGER DEFAULT 0,
  last_alert_sent_at TIMESTAMPTZ,
  alert_cooldown_until TIMESTAMPTZ,            -- Don't send alerts until this time
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_webhook_alerts_type ON webhook_alerts(webhook_type, alert_type);

-- Function: Cleanup old webhook logs (retention: 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Register cleanup job in cron_jobs table
INSERT INTO cron_jobs (name, slug, description, cron_expression, is_active) VALUES
  (
    'Cleanup Old Webhook Logs',
    'cleanup-webhook-logs',
    'Delete webhook logs older than 90 days',
    '0 4 * * *',  -- Daily at 4:00 AM
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  cron_expression = EXCLUDED.cron_expression;

-- Comments for documentation
COMMENT ON TABLE webhook_logs IS 'Detailed logs of all incoming webhook requests for debugging and monitoring';
COMMENT ON TABLE webhook_alerts IS 'Track webhook failure alerts to prevent alert spam';
COMMENT ON COLUMN webhook_logs.webhook_type IS 'Type of webhook: sepay, stripe, paypal, etc.';
COMMENT ON COLUMN webhook_logs.request_id IS 'Unique identifier for each request, useful for correlation';
COMMENT ON COLUMN webhook_logs.match_type IS 'How the transaction was matched: auto, manual, late_payment, or unmatched';
COMMENT ON COLUMN webhook_logs.processing_duration_ms IS 'Total processing time in milliseconds';
COMMENT ON FUNCTION cleanup_old_webhook_logs IS 'Removes webhook logs older than 90 days, returns count of deleted rows';
