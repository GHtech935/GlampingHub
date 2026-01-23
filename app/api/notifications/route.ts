/**
 * Notifications API - List notifications
 * GET /api/notifications
 *
 * Query params:
 * - limit: number (default 20)
 * - offset: number (default 0)
 * - unread_only: boolean (default false)
 * - app_type: 'camping' | 'glamping' (default 'camping')
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaffSession, isCustomerSession } from '@/lib/auth';
import { getNotifications, AppType } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine user type and ID
    const userType = isStaffSession(session) ? 'staff' : 'customer';
    const userId = session.id;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const appType = (searchParams.get('app_type') || 'camping') as AppType;

    // Validate app_type
    if (!['camping', 'glamping'].includes(appType)) {
      return NextResponse.json(
        { error: 'Invalid app_type. Must be "camping" or "glamping"' },
        { status: 400 }
      );
    }

    // Get notifications
    const result = await getNotifications(userId, userType, {
      limit,
      offset,
      unreadOnly,
      appType,
    });

    return NextResponse.json({
      notifications: result.notifications,
      unread_count: result.unreadCount,
      total: result.total,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
