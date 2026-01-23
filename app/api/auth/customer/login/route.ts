import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateCustomer, setSession } from '@/lib/auth';

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

    // Authenticate customer
    const customerSession = await authenticateCustomer(
      validatedData.email,
      validatedData.password
    );

    if (!customerSession) {
      return NextResponse.json(
        { error: 'Invalid email or password. Make sure you have registered an account first.' },
        { status: 401 }
      );
    }

    // Set session cookie
    await setSession(customerSession);

    // Return customer data (without sensitive info)
    return NextResponse.json({
      customer: {
        id: customerSession.id,
        email: customerSession.email,
        firstName: customerSession.firstName,
        lastName: customerSession.lastName,
        isRegistered: customerSession.isRegistered,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Customer login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
