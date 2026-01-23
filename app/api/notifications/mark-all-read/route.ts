/**
 * Notifications API - Mark all as read
 * POST /api/notifications/mark-all-read
 *
 * Marks all unread notifications for the current user as read
 */

import { NextResponse } from 'next/server';
import { getSession, isStaffSession } from '@/lib/auth';
import { markAllAsRead } from '@/lib/notifications';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine user type and ID
    const userType = isStaffSession(session) ? 'staff' : 'customer';
    const userId = session.id;

    const updated = await markAllAsRead(userId, userType);

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
