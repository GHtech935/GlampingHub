import { NextResponse } from 'next/server';
import { getSession, isStaffSession, getAccessibleGlampingZoneIdsFromDB } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // For operations/glamping_owner with empty glampingZoneIds in JWT, enrich from DB
    if (isStaffSession(user) && (user.role === 'operations' || user.role === 'glamping_owner')) {
      if (!user.glampingZoneIds || user.glampingZoneIds.length === 0) {
        const dbZoneIds = await getAccessibleGlampingZoneIdsFromDB(user);
        if (dbZoneIds && dbZoneIds.length > 0) {
          return NextResponse.json({
            user: { ...user, glampingZoneIds: dbZoneIds },
          });
        }
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
