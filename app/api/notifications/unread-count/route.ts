/**
 * Notifications API - Get unread count
 * GET /api/notifications/unread-count
 *
 * Query params:
 * - app_type: 'camping' | 'glamping' (default 'camping')
 *
 * Returns just the count for badge display
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaffSession } from '@/lib/auth';
import { getUnreadCount, AppType } from '@/lib/notifications';

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
    const appType = (searchParams.get('app_type') || 'camping') as AppType;

    // Validate app_type
    if (!['camping', 'glamping'].includes(appType)) {
      return NextResponse.json(
        { error: 'Invalid app_type. Must be "camping" or "glamping"' },
        { status: 400 }
      );
    }

    const count = await getUnreadCount(userId, userType, appType);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
