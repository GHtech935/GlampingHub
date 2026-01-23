import pool from "@/lib/db";
import { broadcastToRole } from "@/lib/notifications";
import { getRecentFailureCount, WebhookType } from "@/lib/webhook-logger";

/**
 * Webhook Alert System
 *
 * Monitors webhook failures and sends alerts to admins when
 * there are consecutive failures within a short time period.
 *
 * Configuration:
 * - FAILURE_THRESHOLD: Number of failures to trigger alert (default: 3)
 * - TIME_WINDOW_MINUTES: Time window to count failures (default: 5)
 * - COOLDOWN_MINUTES: Minimum time between alerts (default: 30)
 */

const FAILURE_THRESHOLD = 3;
const TIME_WINDOW_MINUTES = 5;
const COOLDOWN_MINUTES = 30;

interface AlertState {
  shouldAlert: boolean;
  failureCount: number;
  lastAlertAt: Date | null;
  cooldownUntil: Date | null;
}

/**
 * Check if we should send an alert for webhook failures
 */
export async function checkWebhookAlert(
  webhookType: WebhookType
): Promise<AlertState> {
  // Get recent failure count
  const failureCount = await getRecentFailureCount(
    webhookType,
    TIME_WINDOW_MINUTES
  );

  // Check existing alert state
  const alertResult = await pool.query(
    `SELECT last_alert_sent_at, alert_cooldown_until, failure_count
     FROM webhook_alerts
     WHERE webhook_type = $1 AND alert_type = 'consecutive_failures'`,
    [webhookType]
  );

  const existingAlert = alertResult.rows[0];
  const now = new Date();

  // Determine if we're in cooldown
  const cooldownUntil = existingAlert?.alert_cooldown_until
    ? new Date(existingAlert.alert_cooldown_until)
    : null;

  const isInCooldown = cooldownUntil && cooldownUntil > now;

  // Should alert if:
  // 1. Failure count >= threshold
  // 2. Not in cooldown period
  const shouldAlert = failureCount >= FAILURE_THRESHOLD && !isInCooldown;

  return {
    shouldAlert,
    failureCount,
    lastAlertAt: existingAlert?.last_alert_sent_at
      ? new Date(existingAlert.last_alert_sent_at)
      : null,
    cooldownUntil: isInCooldown ? cooldownUntil : null,
  };
}

/**
 * Send alert and update alert state
 */
export async function sendWebhookFailureAlert(
  webhookType: WebhookType,
  failureCount: number,
  recentErrors?: string[]
): Promise<boolean> {
  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + COOLDOWN_MINUTES * 60 * 1000);

  try {
    // Update or insert alert state
    await pool.query(
      `INSERT INTO webhook_alerts (
        webhook_type,
        alert_type,
        failure_count,
        last_alert_sent_at,
        alert_cooldown_until,
        metadata,
        updated_at
      ) VALUES ($1, 'consecutive_failures', $2, $3, $4, $5, $3)
      ON CONFLICT (webhook_type, alert_type)
      DO UPDATE SET
        failure_count = $2,
        last_alert_sent_at = $3,
        alert_cooldown_until = $4,
        metadata = $5,
        updated_at = $3`,
      [
        webhookType,
        failureCount,
        now,
        cooldownUntil,
        JSON.stringify({
          recent_errors: recentErrors?.slice(0, 5) || [],
          threshold: FAILURE_THRESHOLD,
          time_window_minutes: TIME_WINDOW_MINUTES,
        }),
      ]
    );

    // Send notification to admin and operations roles
    const alertData = {
      webhook_type: webhookType,
      failure_count: failureCount,
      time_window: `${TIME_WINDOW_MINUTES} phút`,
      message: `Webhook ${webhookType.toUpperCase()} đang có ${failureCount} lỗi liên tiếp trong ${TIME_WINDOW_MINUTES} phút qua. Vui lòng kiểm tra!`,
      recent_errors: recentErrors?.slice(0, 3).join(", ") || "N/A",
    };

    await Promise.all([
      broadcastToRole("admin", "webhook_failure_alert", alertData),
      broadcastToRole("operations", "webhook_failure_alert", alertData),
    ]);

    console.log(
      `[WebhookAlert] Alert sent for ${webhookType}: ${failureCount} failures`
    );
    return true;
  } catch (error) {
    console.error("[WebhookAlert] Failed to send alert:", error);
    return false;
  }
}

/**
 * Check and alert if necessary
 * Call this after a webhook failure
 */
export async function checkAndAlertWebhookFailure(
  webhookType: WebhookType,
  errorMessage?: string
): Promise<void> {
  try {
    const alertState = await checkWebhookAlert(webhookType);

    if (alertState.shouldAlert) {
      // Get recent error messages for context
      const recentErrorsResult = await pool.query(
        `SELECT DISTINCT error_message
         FROM webhook_logs
         WHERE webhook_type = $1
           AND status IN ('failed', 'invalid_signature', 'validation_error')
           AND created_at > NOW() - INTERVAL '1 minute' * $2
           AND error_message IS NOT NULL
         ORDER BY created_at DESC
         LIMIT 5`,
        [webhookType, TIME_WINDOW_MINUTES]
      );

      const recentErrors = recentErrorsResult.rows.map(
        (r) => r.error_message as string
      );

      await sendWebhookFailureAlert(
        webhookType,
        alertState.failureCount,
        recentErrors
      );
    }
  } catch (error) {
    // Don't let alerting errors affect the main flow
    console.error("[WebhookAlert] Error checking/sending alert:", error);
  }
}

/**
 * Reset alert state (e.g., after admin acknowledges)
 */
export async function resetWebhookAlert(
  webhookType: WebhookType
): Promise<void> {
  await pool.query(
    `UPDATE webhook_alerts
     SET failure_count = 0,
         alert_cooldown_until = NULL,
         updated_at = NOW()
     WHERE webhook_type = $1`,
    [webhookType]
  );
}

/**
 * Get current alert status for all webhook types
 */
export async function getAllWebhookAlertStatus(): Promise<
  Array<{
    webhookType: string;
    failureCount: number;
    lastAlertAt: Date | null;
    inCooldown: boolean;
    cooldownUntil: Date | null;
  }>
> {
  const result = await pool.query(
    `SELECT
       webhook_type,
       failure_count,
       last_alert_sent_at,
       alert_cooldown_until,
       CASE WHEN alert_cooldown_until > NOW() THEN true ELSE false END as in_cooldown
     FROM webhook_alerts
     ORDER BY updated_at DESC`
  );

  return result.rows.map((row) => ({
    webhookType: row.webhook_type,
    failureCount: row.failure_count,
    lastAlertAt: row.last_alert_sent_at
      ? new Date(row.last_alert_sent_at)
      : null,
    inCooldown: row.in_cooldown,
    cooldownUntil: row.alert_cooldown_until
      ? new Date(row.alert_cooldown_until)
      : null,
  }));
}
