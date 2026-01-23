/**
 * Notification Service for GlampingHub
 *
 * Core functions for creating and managing in-app notifications
 * Supports dual channel: In-app + Email for important events
 */

import { query } from '@/lib/db';
import { sendTemplateEmail } from '@/lib/email';
import {
  CUSTOMER_NOTIFICATION_TEMPLATES,
  STAFF_NOTIFICATION_TEMPLATES,
  EMAIL_TEMPLATE_MAP,
  CustomerNotificationType,
  StaffNotificationType,
  transformLinkForGlamping,
} from '@/lib/notification-templates';

// =============================================================================
// TYPES
// =============================================================================

export type AppType = 'camping' | 'glamping';

export interface Notification {
  id: string;
  user_id: string;
  user_type: 'customer' | 'staff';
  type: string;
  title: { vi: string; en: string };
  message: { vi: string; en: string };
  data?: Record<string, any>;
  link: string;
  is_read: boolean;
  send_email: boolean;
  created_at: string;
}

interface CreateNotificationParams {
  userId: string;
  userType: 'customer' | 'staff';
  type: string;
  title: { vi: string; en: string };
  message: { vi: string; en: string };
  data?: Record<string, any>;
  link: string;
  sendEmail?: boolean;
  appType?: AppType;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get notifications table name based on app type
 * @param appType - 'camping' or 'glamping'
 * @returns Table name for the specified app type
 */
function getNotificationsTable(appType: AppType = 'camping'): string {
  return appType === 'glamping' ? 'glamping_notifications' : 'notifications';
}

/**
 * Replace variables in template string
 * Example: replaceVariables("Hello {name}", { name: "John" }) => "Hello John"
 */
function replaceVariables(template: string, data: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * Get user email and name for sending notification emails
 */
async function getUserEmail(
  userId: string,
  userType: 'customer' | 'staff'
): Promise<{ email: string; full_name: string } | null> {
  try {
    const table = userType === 'customer' ? 'customers' : 'users';
    const nameField =
      userType === 'customer'
        ? "COALESCE(first_name || ' ' || last_name, first_name, email) as full_name"
        : "COALESCE(first_name || ' ' || last_name, first_name, email) as full_name";

    const result = await query<{ email: string; full_name: string }>(
      `SELECT email, ${nameField} FROM ${table} WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Create a notification in the database
 * Optionally sends an email alongside the in-app notification
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification | null> {
  const {
    userId,
    userType,
    type,
    title,
    message,
    data,
    link,
    sendEmail = false,
    appType = 'camping',
  } = params;

  try {
    const table = getNotificationsTable(appType);

    // 1. Insert notification into database
    const result = await query<Notification>(
      `INSERT INTO ${table} (user_id, user_type, type, title, message, data, link, send_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        userType,
        type,
        JSON.stringify(title),
        JSON.stringify(message),
        data ? JSON.stringify(data) : null,
        link,
        sendEmail,
      ]
    );

    const notification = result.rows[0];

    // 2. Send email if required
    if (sendEmail) {
      try {
        const userInfo = await getUserEmail(userId, userType);
        if (userInfo) {
          const emailTemplate = EMAIL_TEMPLATE_MAP[type];

          if (emailTemplate) {
            const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            await sendTemplateEmail({
              templateSlug: emailTemplate,
              to: [{ email: userInfo.email, name: userInfo.full_name }],
              variables: {
                customer_name: userInfo.full_name,
                admin_name: userInfo.full_name, // For staff notifications
                notification_link: `${appUrl}${link}`,
                ...data,
              },
            });

            console.log(`✅ Notification email sent to ${userInfo.email} for type: ${type}`);
          }
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send notification email:', emailError);
        // Don't throw - notification still created
      }
    }

    console.log(`✅ Notification created: ${type} for ${userType} ${userId}`);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
}

/**
 * Send notification to a customer
 * Uses predefined templates from CUSTOMER_NOTIFICATION_TEMPLATES
 */
export async function sendNotificationToCustomer(
  customerId: string,
  type: CustomerNotificationType,
  data: Record<string, any>,
  appType: AppType = 'camping'
): Promise<Notification | null> {
  const template = CUSTOMER_NOTIFICATION_TEMPLATES[type];

  if (!template) {
    console.error(`Unknown customer notification type: ${type}`);
    return null;
  }

  // Replace variables in message and link
  const title = template.title;
  const message = {
    vi: replaceVariables(template.message.vi, data),
    en: replaceVariables(template.message.en, data),
  };
  let link = replaceVariables(template.link, data);

  // Transform link for glamping if needed
  if (appType === 'glamping') {
    link = transformLinkForGlamping(link, 'customer', data);
  }

  return createNotification({
    userId: customerId,
    userType: 'customer',
    type,
    title,
    message,
    data,
    link,
    sendEmail: template.sendEmail,
    appType,
  });
}

/**
 * Send notification to a staff member
 * Uses predefined templates from STAFF_NOTIFICATION_TEMPLATES
 */
export async function sendNotificationToStaff(
  staffId: string,
  type: StaffNotificationType,
  data: Record<string, any>,
  appType: AppType = 'camping'
): Promise<Notification | null> {
  const template = STAFF_NOTIFICATION_TEMPLATES[type];

  if (!template) {
    console.error(`Unknown staff notification type: ${type}`);
    return null;
  }

  // Replace variables in message and link
  const title = template.title;
  const message = {
    vi: replaceVariables(template.message.vi, data),
    en: replaceVariables(template.message.en, data),
  };
  let link = replaceVariables(template.link, data);

  // Transform link for glamping if needed
  if (appType === 'glamping') {
    link = transformLinkForGlamping(link, 'staff', data);
  }

  return createNotification({
    userId: staffId,
    userType: 'staff',
    type,
    title,
    message,
    data,
    link,
    sendEmail: template.sendEmail,
    appType,
  });
}

/**
 * Broadcast notification to all staff members with a specific role
 * Useful for admin alerts like "new booking pending"
 */
export async function broadcastToRole(
  role: 'admin' | 'sale' | 'operations' | 'owner',
  type: StaffNotificationType,
  data: Record<string, any>,
  appType: AppType = 'camping'
): Promise<void> {
  const template = STAFF_NOTIFICATION_TEMPLATES[type];

  if (!template) {
    console.error(`Unknown staff notification type: ${type}`);
    return;
  }

  // Check if this notification is allowed for this role
  if (template.roles && !(template.roles as readonly string[]).includes(role)) {
    console.log(`Notification type ${type} not allowed for role ${role}`);
    return;
  }

  try {
    // Get all active staff with this role
    const result = await query<{ id: string }>(
      `SELECT id FROM users WHERE role = $1 AND is_active = true`,
      [role]
    );

    const staffIds = result.rows.map((row) => row.id);

    if (staffIds.length === 0) {
      console.log(`No active staff with role ${role} to notify`);
      return;
    }

    // Send notification to all staff
    const promises = staffIds.map((staffId) =>
      sendNotificationToStaff(staffId, type, data, appType)
    );

    await Promise.all(promises);

    console.log(`✅ Broadcast ${type} to ${staffIds.length} staff with role ${role}`);
  } catch (error) {
    console.error('❌ Error broadcasting to role:', error);
  }
}

/**
 * Broadcast notification to all staff with allowed roles for a notification type
 */
export async function broadcastToAllowedRoles(
  type: StaffNotificationType,
  data: Record<string, any>,
  appType: AppType = 'camping'
): Promise<void> {
  const template = STAFF_NOTIFICATION_TEMPLATES[type];

  if (!template) {
    console.error(`Unknown staff notification type: ${type}`);
    return;
  }

  const roles = template.roles || ['admin', 'sale', 'operations'];

  for (const role of roles) {
    await broadcastToRole(role, type, data, appType);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(
  userId: string,
  userType: 'customer' | 'staff',
  appType: AppType = 'camping'
): Promise<number> {
  try {
    const table = getNotificationsTable(appType);
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${table}
       WHERE user_id = $1 AND user_type = $2 AND is_read = false`,
      [userId, userType]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Get notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  userType: 'customer' | 'staff',
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    appType?: AppType;
  } = {}
): Promise<{ notifications: Notification[]; unreadCount: number; total: number }> {
  const { limit = 20, offset = 0, unreadOnly = false, appType = 'camping' } = options;

  try {
    const table = getNotificationsTable(appType);

    // Build query
    let queryStr = `
      SELECT * FROM ${table}
      WHERE user_id = $1 AND user_type = $2
    `;
    const params: any[] = [userId, userType];

    if (unreadOnly) {
      queryStr += ` AND is_read = false`;
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $3 OFFSET $4`;
    params.push(limit, offset);

    const result = await query<Notification>(queryStr, params);

    // Get total unread count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${table}
       WHERE user_id = $1 AND user_type = $2 AND is_read = false`,
      [userId, userType]
    );

    // Get total count
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${table}
       WHERE user_id = $1 AND user_type = $2`,
      [userId, userType]
    );

    return {
      notifications: result.rows,
      unreadCount: parseInt(countResult.rows[0].count),
      total: parseInt(totalResult.rows[0].count),
    };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return { notifications: [], unreadCount: 0, total: 0 };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
  appType: AppType = 'camping'
): Promise<boolean> {
  try {
    const table = getNotificationsTable(appType);
    const result = await query(
      `UPDATE ${table} SET is_read = true
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  userId: string,
  userType: 'customer' | 'staff',
  appType: AppType = 'camping'
): Promise<number> {
  try {
    const table = getNotificationsTable(appType);
    const result = await query(
      `UPDATE ${table} SET is_read = true
       WHERE user_id = $1 AND user_type = $2 AND is_read = false
       RETURNING id`,
      [userId, userType]
    );
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return 0;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string,
  appType: AppType = 'camping'
): Promise<boolean> {
  try {
    const table = getNotificationsTable(appType);
    const result = await query(
      `DELETE FROM ${table} WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

/**
 * Clean up old read notifications (older than specified days)
 * Useful for maintenance cron job
 */
export async function cleanupOldNotifications(
  daysOld: number = 30,
  appType: AppType = 'camping'
): Promise<number> {
  try {
    const table = getNotificationsTable(appType);
    const result = await query(
      `DELETE FROM ${table}
       WHERE is_read = true
       AND created_at < NOW() - INTERVAL '${daysOld} days'`,
      []
    );
    console.log(`🧹 Cleaned up ${result.rowCount} old ${appType} notifications`);
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    return 0;
  }
}

// =============================================================================
// OWNER NOTIFICATION HELPERS
// =============================================================================

/**
 * Notify all owners of a specific campsite
 * Queries the direct owner from campsite.owner_id
 *
 * @param campsiteId - The campsite ID
 * @param type - Notification type from STAFF_NOTIFICATION_TEMPLATES
 * @param data - Data to populate notification template variables
 */
export async function notifyOwnersOfCampsite(
  campsiteId: string,
  type: StaffNotificationType,
  data: Record<string, any>
): Promise<void> {
  try {
    // Query owner of this campsite from campsite.owner_id
    const result = await query<{ id: string }>(
      `SELECT u.id
       FROM campsites c
       JOIN users u ON c.owner_id = u.id
       WHERE c.id = $1
         AND u.role = 'owner'
         AND u.is_active = true`,
      [campsiteId]
    );

    const ownerIds = result.rows.map((row) => row.id);

    if (ownerIds.length === 0) {
      console.log(`No owners found for campsite ${campsiteId}`);
      return;
    }

    // Send notification to each owner
    const promises = ownerIds.map((ownerId) =>
      sendNotificationToStaff(ownerId, type, data)
    );

    await Promise.all(promises);

    console.log(`✅ Notified ${ownerIds.length} owner(s) of campsite ${campsiteId} with ${type}`);
  } catch (error) {
    console.error('❌ Error notifying owners of campsite:', error);
  }
}

/**
 * Notify all owners of a campsite through a booking
 * Automatically fetches campsite_id from booking and calls notifyOwnersOfCampsite()
 *
 * @param bookingId - The booking ID
 * @param type - Notification type from STAFF_NOTIFICATION_TEMPLATES
 * @param data - Data to populate notification template variables
 */
export async function notifyOwnersOfBooking(
  bookingId: string,
  type: StaffNotificationType,
  data: Record<string, any>
): Promise<void> {
  try {
    // Get campsite_id from booking
    const result = await query<{ campsite_id: string }>(
      `SELECT p.campsite_id
       FROM bookings b
       JOIN pitches p ON b.pitch_id = p.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      console.error(`Booking ${bookingId} not found`);
      return;
    }

    const campsiteId = result.rows[0].campsite_id;
    await notifyOwnersOfCampsite(campsiteId, type, data);
  } catch (error) {
    console.error('❌ Error notifying owners of booking:', error);
  }
}

/**
 * Notify all owners of a campsite through a pitch
 * Automatically fetches campsite_id from pitch and calls notifyOwnersOfCampsite()
 *
 * @param pitchId - The pitch ID
 * @param type - Notification type from STAFF_NOTIFICATION_TEMPLATES
 * @param data - Data to populate notification template variables
 */
export async function notifyOwnersOfPitch(
  pitchId: string,
  type: StaffNotificationType,
  data: Record<string, any>
): Promise<void> {
  try {
    // Get campsite_id from pitch
    const result = await query<{ campsite_id: string }>(
      `SELECT campsite_id FROM pitches WHERE id = $1`,
      [pitchId]
    );

    if (result.rows.length === 0) {
      console.error(`Pitch ${pitchId} not found`);
      return;
    }

    const campsiteId = result.rows[0].campsite_id;
    await notifyOwnersOfCampsite(campsiteId, type, data);
  } catch (error) {
    console.error('❌ Error notifying owners of pitch:', error);
  }
}

/**
 * Format product list for notification messages
 * Returns formatted string with smart truncation
 *
 * @param products - Array of products with name, quantity, and optional category
 * @param locale - Locale for formatting ('vi' or 'en')
 * @param maxProducts - Maximum number of products to show inline before truncating
 * @returns Formatted product list string
 *
 * @example
 * formatProductList([
 *   { name: 'Bữa sáng', quantity: 2, category: 'food' },
 *   { name: 'Lều cắm trại', quantity: 1, category: 'equipment' }
 * ], 'vi', 3)
 * // Returns: "🍽️ Bữa sáng (x2), 🎪 Lều cắm trại (x1)"
 */
export function formatProductList(
  products: Array<{ name: string; quantity: number; category?: string }>,
  locale: 'vi' | 'en' = 'vi',
  maxProducts: number = 3
): string {
  if (products.length === 0) return '';

  const categoryEmojis: Record<string, string> = {
    'food': '🍽️',
    'beverage': '🥤',
    'equipment': '🎪',
    'service': '🔧',
    'other': '📦'
  };

  const formatted = products.slice(0, maxProducts).map(p => {
    const emoji = p.category ? categoryEmojis[p.category.toLowerCase()] || '' : '';
    const truncatedName = p.name.length > 30 ? p.name.substring(0, 27) + '...' : p.name;
    return `${emoji}${emoji ? ' ' : ''}${truncatedName} (x${p.quantity})`;
  });

  const remaining = products.length - maxProducts;
  if (remaining > 0) {
    const moreText = locale === 'vi'
      ? `và ${remaining} sản phẩm khác`
      : `and ${remaining} more`;
    formatted.push(moreText);
  }

  return formatted.join(', ');
}

// =============================================================================
// GLAMPING OWNER NOTIFICATION HELPERS
// =============================================================================

/**
 * Notify all owners of a specific glamping zone
 * Queries owners from user_glamping_zones junction table
 *
 * @param zoneId - The glamping zone ID
 * @param type - Notification type from STAFF_NOTIFICATION_TEMPLATES
 * @param data - Data to populate notification template variables
 */
export async function notifyGlampingOwnersOfZone(
  zoneId: string,
  type: StaffNotificationType,
  data: Record<string, any>
): Promise<void> {
  try {
    // Query owners of this zone from user_glamping_zones junction table
    const result = await query<{ id: string }>(
      `SELECT u.id
       FROM user_glamping_zones ugz
       JOIN users u ON ugz.user_id = u.id
       WHERE ugz.zone_id = $1
         AND u.role = 'glamping_owner'
         AND u.is_active = true`,
      [zoneId]
    );

    const ownerIds = result.rows.map((row) => row.id);

    if (ownerIds.length === 0) {
      console.log(`No glamping owners found for zone ${zoneId}`);
      return;
    }

    // Send notification to each owner
    const promises = ownerIds.map((ownerId) =>
      sendNotificationToStaff(ownerId, type, data, 'glamping')
    );

    await Promise.all(promises);

    console.log(`✅ Notified ${ownerIds.length} glamping owner(s) of zone ${zoneId} with ${type}`);
  } catch (error) {
    console.error('❌ Error notifying glamping owners of zone:', error);
  }
}

/**
 * Notify all owners of a glamping zone through a booking
 * Automatically fetches zone_id from booking and calls notifyGlampingOwnersOfZone()
 *
 * @param glampingBookingId - The glamping booking ID
 * @param type - Notification type from STAFF_NOTIFICATION_TEMPLATES
 * @param data - Data to populate notification template variables
 */
export async function notifyGlampingOwnersOfBooking(
  glampingBookingId: string,
  type: StaffNotificationType,
  data: Record<string, any>
): Promise<void> {
  try {
    // Get zone_id from glamping booking
    // Note: glamping_bookings has many-to-many relationship with items via glamping_booking_items
    const result = await query<{ zone_id: string }>(
      `SELECT DISTINCT gi.zone_id
       FROM glamping_bookings gb
       JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
       JOIN glamping_items gi ON gbi.item_id = gi.id
       WHERE gb.id = $1
       LIMIT 1`,
      [glampingBookingId]
    );

    if (result.rows.length === 0) {
      console.error(`Glamping booking ${glampingBookingId} not found or has no items`);
      return;
    }

    const zoneId = result.rows[0].zone_id;
    await notifyGlampingOwnersOfZone(zoneId, type, data);
  } catch (error) {
    console.error('❌ Error notifying glamping owners of booking:', error);
  }
}

/**
 * Notify all owners of a glamping zone through an item
 * Automatically fetches zone_id from item and calls notifyGlampingOwnersOfZone()
 *
 * @param itemId - The glamping item ID
 * @param type - Notification type from STAFF_NOTIFICATION_TEMPLATES
 * @param data - Data to populate notification template variables
 */
export async function notifyGlampingOwnersOfItem(
  itemId: string,
  type: StaffNotificationType,
  data: Record<string, any>
): Promise<void> {
  try {
    // Get zone_id from glamping item
    const result = await query<{ zone_id: string }>(
      `SELECT zone_id FROM glamping_items WHERE id = $1`,
      [itemId]
    );

    if (result.rows.length === 0) {
      console.error(`Glamping item ${itemId} not found`);
      return;
    }

    const zoneId = result.rows[0].zone_id;
    await notifyGlampingOwnersOfZone(zoneId, type, data);
  } catch (error) {
    console.error('❌ Error notifying glamping owners of item:', error);
  }
}
