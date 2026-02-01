/**
 * Cron Job System - Type Definitions
 *
 * Core TypeScript interfaces for the cron job system
 */

export interface CronJobConfig {
  name: string;
  slug: string;
  description: string;
  cronExpression: string;
  timezone?: string;
  isActive: boolean;
}

export interface CronJobResult {
  success: boolean;
  recordsProcessed?: number;
  recordsAffected?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface CronJobParams {
  jobId?: string;
  jobSlug: string;
  logId?: string;
  dryRun?: boolean;
}

export type CronJobFunction = (params: CronJobParams) => Promise<CronJobResult>;

export interface CronJobRegistration {
  config: CronJobConfig;
  handler: CronJobFunction;
}

export interface CronJobLog {
  id: string;
  job_slug: string;
  status: 'running' | 'success' | 'error';
  started_at: Date;
  completed_at?: Date;
  execution_time_ms?: number;
  records_processed?: number;
  records_affected?: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface CronJobStats {
  totalJobs: number;
  activeJobs: number;
  executionsLast24h: number;
  failedExecutions: number;
}
