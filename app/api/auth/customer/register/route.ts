import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerCustomer, setSession } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Register customer
    const customerSession = await registerCustomer({
      email: validatedData.email,
      password: validatedData.password,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone,
    });

    if (!customerSession) {
      return NextResponse.json(
        { error: 'Email already registered or registration failed' },
        { status: 400 }
      );
    }

    // Set session cookie (auto-login after registration)
    await setSession(customerSession);

    // Send welcome email (non-blocking - don't fail registration if email fails)
    try {
      const customerName = `${customerSession.firstName}${customerSession.lastName ? ' ' + customerSession.lastName : ''}`;
      await sendWelcomeEmail({
        customerEmail: customerSession.email,
        customerName,
      });
      console.log(`Welcome email sent to ${customerSession.email}`);
    } catch (emailError) {
      // Log error but don't block registration
      console.error('Failed to send welcome email:', emailError);
    }

    // Return customer data
    return NextResponse.json({
      customer: {
        id: customerSession.id,
        email: customerSession.email,
        firstName: customerSession.firstName,
        lastName: customerSession.lastName,
      },
      message: 'Registration successful! You are now logged in.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Email already registered') {
      return NextResponse.json(
        { error: 'This email is already registered. Please login instead.' },
        { status: 400 }
      );
    }

    console.error('Customer registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
