import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

/**
 * Webhook Logger
 *
 * Provides comprehensive logging for all incoming webhooks.
 * Tracks request/response, timing, matching results, and errors.
 */

export type WebhookType = "sepay" | "stripe" | "paypal" | string;

export type WebhookStatus =
  | "received"
  | "processing"
  | "success"
  | "failed"
  | "invalid_signature"
  | "validation_error"
  | "duplicate";

export type MatchType = "auto" | "manual" | "late_payment" | "unmatched";

export interface WebhookLogEntry {
  webhookType: WebhookType;
  requestId?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export interface WebhookLogResult {
  status: WebhookStatus;
  httpStatusCode: number;
  responseBody?: unknown;
  transactionCode?: string;
  bookingId?: string;
  bookingReference?: string;
  matched?: boolean;
  matchType?: MatchType;
  errorType?: string;
  errorMessage?: string;
  errorStack?: string;
}

export interface WebhookLogRecord {
  id: string;
  startTime: Date;
}

/**
 * Extract relevant headers from NextRequest headers
 */
export function extractHeaders(headers: Headers): Record<string, string> {
  const relevantHeaders: Record<string, string> = {};
  const headersToCapture = [
    "content-type",
    "content-length",
    "user-agent",
    "x-forwarded-for",
    "x-real-ip",
    "x-sepay-signature",
    "x-stripe-signature",
    "x-request-id",
    "host",
    "origin",
    "referer",
  ];

  headersToCapture.forEach((header) => {
    const value = headers.get(header);
    if (value) {
      relevantHeaders[header] = value;
    }
  });

  return relevantHeaders;
}

/**
 * Extract client IP from request headers
 */
export function extractClientIP(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  );
}

/**
 * Start logging a webhook request
 * Call this at the beginning of your webhook handler
 */
export async function startWebhookLog(
  entry: WebhookLogEntry
): Promise<WebhookLogRecord> {
  const id = uuidv4();
  const requestId = entry.requestId || uuidv4();
  const startTime = new Date();

  try {
    await pool.query(
      `INSERT INTO webhook_logs (
        id,
        webhook_type,
        request_id,
        request_headers,
        request_body,
        ip_address,
        user_agent,
        status,
        processing_started_at,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::inet, $7, 'received', $8, $8)`,
      [
        id,
        entry.webhookType,
        requestId,
        JSON.stringify(entry.requestHeaders || {}),
        JSON.stringify(entry.requestBody || {}),
        entry.ipAddress || null,
        entry.userAgent || null,
        startTime,
      ]
    );
  } catch (error) {
    // Log error but don't fail the webhook
    console.error("Failed to start webhook log:", error);
  }

  return { id, startTime };
}

/**
 * Complete the webhook log with results
 * Call this at the end of your webhook handler (success or error)
 */
export async function completeWebhookLog(
  logRecord: WebhookLogRecord,
  result: WebhookLogResult
): Promise<void> {
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - logRecord.startTime.getTime();

  try {
    await pool.query(
      `UPDATE webhook_logs SET
        status = $2,
        http_status_code = $3,
        response_body = $4,
        transaction_code = $5,
        booking_id = $6,
        booking_reference = $7,
        matched = $8,
        match_type = $9,
        error_type = $10,
        error_message = $11,
        error_stack = $12,
        processing_completed_at = $13,
        processing_duration_ms = $14
      WHERE id = $1`,
      [
        logRecord.id,
        result.status,
        result.httpStatusCode,
        JSON.stringify(result.responseBody || {}),
        result.transactionCode || null,
        result.bookingId || null,
        result.bookingReference || null,
        result.matched ?? false,
        result.matchType || null,
        result.errorType || null,
        result.errorMessage || null,
        result.errorStack || null,
        completedAt,
        durationMs,
      ]
    );
  } catch (error) {
    // Log error but don't fail the webhook
    console.error("Failed to complete webhook log:", error);
  }
}

/**
 * Quick log for webhooks that fail early (e.g., signature validation)
 * Creates a complete log entry in one call
 */
export async function logWebhookError(
  entry: WebhookLogEntry,
  result: WebhookLogResult
): Promise<string> {
  const id = uuidv4();
  const requestId = entry.requestId || uuidv4();
  const now = new Date();

  try {
    await pool.query(
      `INSERT INTO webhook_logs (
        id,
        webhook_type,
        request_id,
        request_headers,
        request_body,
        ip_address,
        user_agent,
        status,
        http_status_code,
        response_body,
        transaction_code,
        booking_reference,
        error_type,
        error_message,
        error_stack,
        processing_started_at,
        processing_completed_at,
        processing_duration_ms,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::inet, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16, 0, $16)`,
      [
        id,
        entry.webhookType,
        requestId,
        JSON.stringify(entry.requestHeaders || {}),
        JSON.stringify(entry.requestBody || {}),
        entry.ipAddress || null,
        entry.userAgent || null,
        result.status,
        result.httpStatusCode,
        JSON.stringify(result.responseBody || {}),
        result.transactionCode || null,
        result.bookingReference || null,
        result.errorType || null,
        result.errorMessage || null,
        result.errorStack || null,
        now,
      ]
    );
  } catch (error) {
    console.error("Failed to log webhook error:", error);
  }

  return id;
}

/**
 * Get recent webhook stats for monitoring
 */
export async function getWebhookStats(
  webhookType: WebhookType,
  hours: number = 24
): Promise<{
  total: number;
  success: number;
  failed: number;
  avgDurationMs: number;
  successRate: number;
}> {
  const result = await pool.query(
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'success') as success,
      COUNT(*) FILTER (WHERE status IN ('failed', 'invalid_signature', 'validation_error')) as failed,
      COALESCE(AVG(processing_duration_ms) FILTER (WHERE processing_duration_ms IS NOT NULL), 0) as avg_duration_ms
    FROM webhook_logs
    WHERE webhook_type = $1
      AND created_at > NOW() - INTERVAL '1 hour' * $2`,
    [webhookType, hours]
  );

  const stats = result.rows[0];
  const total = parseInt(stats.total) || 0;
  const success = parseInt(stats.success) || 0;
  const failed = parseInt(stats.failed) || 0;

  return {
    total,
    success,
    failed,
    avgDurationMs: Math.round(parseFloat(stats.avg_duration_ms) || 0),
    successRate: total > 0 ? Math.round((success / total) * 100) : 100,
  };
}

/**
 * Count recent failures for alerting
 */
export async function getRecentFailureCount(
  webhookType: WebhookType,
  minutes: number = 5
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM webhook_logs
     WHERE webhook_type = $1
       AND status IN ('failed', 'invalid_signature', 'validation_error')
       AND created_at > NOW() - INTERVAL '1 minute' * $2`,
    [webhookType, minutes]
  );

  return parseInt(result.rows[0].count) || 0;
}
