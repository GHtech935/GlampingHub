import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAdmin, setSession } from '@/lib/auth';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = loginSchema.parse(body);

    // Authenticate admin/staff
    const staffSession = await authenticateAdmin(
      validatedData.email,
      validatedData.password
    );

    if (!staffSession) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Set session cookie
    await setSession(staffSession);

    // Return staff data (without sensitive info)
    return NextResponse.json({
      user: {
        id: staffSession.id,
        email: staffSession.email,
        firstName: staffSession.firstName,
        lastName: staffSession.lastName,
        role: staffSession.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
