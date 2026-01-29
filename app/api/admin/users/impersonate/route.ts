import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, isStaffSession, setSession } from '@/lib/auth';
import { StaffSession } from '@/lib/auth-edge';

// POST /api/admin/users/impersonate
// Admin-only: Login as another user without password
export async function POST(request: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await getSession();
    if (!session || !isStaffSession(session) || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch target user
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, campsite_id, is_active
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = result.rows[0];

    if (!targetUser.is_active) {
      return NextResponse.json({ error: 'Cannot impersonate inactive user' }, { status: 400 });
    }

    // For owner role, fetch their campsites from campsites.owner_id
    let campsiteIds: string[] | undefined;
    if (targetUser.role === 'owner') {
      const campsitesResult = await pool.query(
        'SELECT id FROM campsites WHERE owner_id = $1',
        [targetUser.id]
      );
      campsiteIds = campsitesResult.rows.map(row => row.id);
    }

    // For glamping_owner role, fetch their zones from user_glamping_zones
    let glampingZoneIds: string[] | undefined;
    if (targetUser.role === 'glamping_owner') {
      const zonesResult = await pool.query(
        'SELECT zone_id FROM user_glamping_zones WHERE user_id = $1 AND role = $2',
        [targetUser.id, 'glamping_owner']
      );
      glampingZoneIds = zonesResult.rows.map(row => row.zone_id);
    }

    // Create session for target user
    const targetSession: StaffSession = {
      type: 'staff',
      id: targetUser.id,
      email: targetUser.email,
      firstName: targetUser.first_name,
      lastName: targetUser.last_name,
      role: targetUser.role as 'admin' | 'sale' | 'operations' | 'owner' | 'glamping_owner',
      campsiteId: targetUser.campsite_id,
      campsiteIds,
      glampingZoneIds,
    };

    // Log impersonation action
    await pool.query(
      `INSERT INTO login_history (user_id, email, status, failure_reason)
       VALUES ($1, $2, 'impersonated_by_admin', $3)`,
      [targetUser.id, targetUser.email, `By admin: ${session.email}`]
    );

    // Set new session
    await setSession(targetSession);

    return NextResponse.json({
      success: true,
      user: {
        id: targetSession.id,
        email: targetSession.email,
        firstName: targetSession.firstName,
        lastName: targetSession.lastName,
        role: targetSession.role,
        glampingZoneIds: targetSession.glampingZoneIds,
      },
    });
  } catch (error) {
    console.error('Impersonate user error:', error);
    return NextResponse.json(
      { error: 'Failed to impersonate user' },
      { status: 500 }
    );
  }
}
