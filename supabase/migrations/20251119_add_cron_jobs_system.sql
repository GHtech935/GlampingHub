-- Migration: Add Cron Jobs System
-- Description: Tables for managing scheduled jobs and execution history
-- Author: GlampingHub Development Team
-- Date: 2025-11-19

-- Table: cron_jobs
-- Purpose: Store configuration and status of all cron jobs
CREATE TABLE IF NOT EXISTS cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identity
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,

  -- Schedule configuration
  cron_expression VARCHAR(100) NOT NULL,  -- '*/5 * * * *'
  timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',

  -- Status & control
  is_active BOOLEAN DEFAULT true,
  is_running BOOLEAN DEFAULT false,  -- Prevents concurrent runs

  -- Execution tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(50),  -- 'completed', 'failed'
  last_run_duration_ms INTEGER,

  -- Statistics
  total_runs INTEGER DEFAULT 0,
  total_successes INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,

  -- Configuration
  settings JSONB DEFAULT '{}'::jsonb,
  -- Example: {"timeout_ms": 300000, "retry_attempts": 3}

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Table: cron_job_logs
-- Purpose: Store execution history of all cron jobs
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identification
  job_id UUID REFERENCES cron_jobs(id) ON DELETE CASCADE,
  job_name VARCHAR(100) NOT NULL,
  job_slug VARCHAR(100) NOT NULL,

  -- Execution details
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'running',
    -- Values: 'running', 'completed', 'failed', 'skipped'

  -- Results
  records_processed INTEGER DEFAULT 0,
  records_affected INTEGER DEFAULT 0,
  error_message TEXT,
  error_stack TEXT,

  -- Execution metadata
  execution_time_ms INTEGER,  -- Duration in milliseconds
  triggered_by VARCHAR(50) DEFAULT 'scheduler',  -- 'scheduler', 'manual', 'api'
  triggered_by_user_id UUID REFERENCES users(id),  -- If manually triggered by admin

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Example: {"booking_references": ["GH25000001", "GH25000002"], "emails_sent": 5}

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cron_jobs_slug ON cron_jobs(slug);
CREATE INDEX idx_cron_jobs_is_active ON cron_jobs(is_active) WHERE is_active = true;
CREATE INDEX idx_cron_jobs_next_run ON cron_jobs(next_run_at) WHERE is_active = true;

CREATE INDEX idx_cron_job_logs_job_id ON cron_job_logs(job_id, started_at DESC);
CREATE INDEX idx_cron_job_logs_job_slug ON cron_job_logs(job_slug, started_at DESC);
CREATE INDEX idx_cron_job_logs_status ON cron_job_logs(status, started_at DESC);
CREATE INDEX idx_cron_job_logs_started_at ON cron_job_logs(started_at DESC);

-- Insert default cron jobs
INSERT INTO cron_jobs (name, slug, description, cron_expression, is_active) VALUES
  (
    'Cancel Expired Bookings',
    'cancel-expired-bookings',
    'Automatically cancel bookings in pending_payment status after 30 minutes of inactivity',
    '*/5 * * * *',  -- Every 5 minutes
    true
  ),
  (
    'Email Automation',
    'email-automation',
    'Send automated emails: pre-arrival reminders (2 days before) and post-stay thank you emails (1 day after)',
    '0 9 * * *',  -- Daily at 9:00 AM
    true
  ),
  (
    'Database Cleanup - Old Logs',
    'cleanup-old-logs',
    'Archive or delete cron job logs older than 90 days',
    '0 3 * * 0',  -- Weekly on Sunday at 3:00 AM
    false  -- Disabled by default
  )
ON CONFLICT (slug) DO NOTHING;

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cron_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on cron_jobs
CREATE TRIGGER trigger_update_cron_jobs_updated_at
  BEFORE UPDATE ON cron_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_cron_jobs_updated_at();

-- Comments for documentation
COMMENT ON TABLE cron_jobs IS 'Configuration and status tracking for scheduled cron jobs';
COMMENT ON TABLE cron_job_logs IS 'Execution history and logs for all cron jobs';
COMMENT ON COLUMN cron_jobs.is_running IS 'Mutex flag to prevent concurrent execution of the same job';
COMMENT ON COLUMN cron_jobs.settings IS 'JSON configuration for job-specific settings like timeout, retries, etc.';
COMMENT ON COLUMN cron_job_logs.metadata IS 'JSON data containing job-specific execution details and results';
