import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resetAdminPassword, validateAdminPasswordResetToken } from '@/lib/password-reset';
import { setSession, type StaffSession } from '@/lib/auth';
import { query } from '@/lib/db';

// Validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)/,
      'Password must contain at least one letter and one number'
    ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;

    // Validate token first to get user info
    const user = await validateAdminPasswordResetToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Reset password
    const result = await resetAdminPassword(token, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset password' },
        { status: 400 }
      );
    }

    // Get full user data for session
    const userData = await query(
      `SELECT id, email, first_name, last_name, role, glamping_zone_id
       FROM users
       WHERE id = $1`,
      [result.userId]
    );

    if (userData.rows.length === 0) {
      throw new Error('User not found after password reset');
    }

    const userRecord = userData.rows[0];

    // Get glamping zone IDs from junction table
    const zoneResult = await query(
      `SELECT zone_id FROM user_glamping_zones WHERE user_id = $1`,
      [userRecord.id]
    );
    const glampingZoneIds = zoneResult.rows.map((r: any) => r.zone_id);

    // Auto-login: create session
    const staffSession: StaffSession = {
      type: 'staff',
      id: userRecord.id,
      email: userRecord.email,
      firstName: userRecord.first_name,
      lastName: userRecord.last_name,
      role: userRecord.role,
      glampingZoneIds: glampingZoneIds.length > 0 ? glampingZoneIds : (userRecord.glamping_zone_id ? [userRecord.glamping_zone_id] : []),
    };

    await setSession(staffSession);

    console.log(`Admin password reset and auto-login successful for: ${userRecord.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You are now logged in.',
      user: {
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        role: userRecord.role,
      },
    });
  } catch (error: any) {
    console.error('Admin reset password error:', error);

    return NextResponse.json(
      {
        error: 'Failed to reset password',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
