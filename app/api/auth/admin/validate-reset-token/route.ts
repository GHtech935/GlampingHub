import { NextRequest, NextResponse } from 'next/server';
import { getAdminByResetToken } from '@/lib/password-reset';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const user = await getAdminByResetToken(token);

    if (!user) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired token',
      });
    }

    return NextResponse.json({
      valid: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Validate admin reset token error:', error);

    return NextResponse.json(
      {
        valid: false,
        error: 'Failed to validate token',
      },
      { status: 500 }
    );
  }
}
