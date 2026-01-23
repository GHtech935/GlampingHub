/**
 * Notifications API - Get unread count
 * GET /api/notifications/unread-count
 *
 * Returns just the count for badge display
 */

import { NextResponse } from 'next/server';
import { getSession, isStaffSession } from '@/lib/auth';
import { getUnreadCount } from '@/lib/notifications';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine user type and ID
    const userType = isStaffSession(session) ? 'staff' : 'customer';
    const userId = session.id;

    const count = await getUnreadCount(userId, userType);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
