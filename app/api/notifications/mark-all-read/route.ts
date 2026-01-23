/**
 * Notifications API - Mark all as read
 * POST /api/notifications/mark-all-read?app_type=camping|glamping
 *
 * Query params:
 * - app_type: 'camping' | 'glamping' (default 'camping')
 *
 * Marks all unread notifications for the current user as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaffSession } from '@/lib/auth';
import { markAllAsRead, AppType } from '@/lib/notifications';

export async function POST(request: NextRequest) {
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

    const updated = await markAllAsRead(userId, userType, appType);

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
