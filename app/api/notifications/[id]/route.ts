/**
 * Notifications API - Single notification operations
 * PATCH /api/notifications/[id]?app_type=camping|glamping - Mark as read
 * DELETE /api/notifications/[id]?app_type=camping|glamping - Delete notification
 *
 * Query params:
 * - app_type: 'camping' | 'glamping' (default 'camping')
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { markAsRead, deleteNotification, AppType } from '@/lib/notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const { id } = await context.params;
    const success = await markAsRead(id, session.id, appType);

    if (!success) {
      return NextResponse.json(
        { error: 'Notification not found or not owned by user' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const { id } = await context.params;
    const success = await deleteNotification(id, session.id, appType);

    if (!success) {
      return NextResponse.json(
        { error: 'Notification not found or not owned by user' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
