import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resetPassword, validatePasswordResetToken } from '@/lib/password-reset';
import { setSession, type CustomerSession } from '@/lib/auth';
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

    // Validate token first to get customer info
    const customer = await validatePasswordResetToken(token);

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Reset password
    const result = await resetPassword(token, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset password' },
        { status: 400 }
      );
    }

    // Get full customer data for session
    const customerData = await query(
      `SELECT id, email, first_name, last_name, phone, created_at
       FROM customers
       WHERE id = $1`,
      [result.customerId]
    );

    if (customerData.rows.length === 0) {
      throw new Error('Customer not found after password reset');
    }

    const customerRecord = customerData.rows[0];

    // Auto-login: create session
    const customerSession: CustomerSession = {
      type: 'customer',
      id: customerRecord.id,
      email: customerRecord.email,
      firstName: customerRecord.first_name,
      lastName: customerRecord.last_name,
      isRegistered: !!customerRecord.password_hash,
    };

    await setSession(customerSession);

    console.log(`Password reset and auto-login successful for: ${customerRecord.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You are now logged in.',
      customer: {
        id: customerRecord.id,
        email: customerRecord.email,
        firstName: customerRecord.first_name,
        lastName: customerRecord.last_name,
      },
    });
  } catch (error: any) {
    console.error('Reset password error:', error);

    return NextResponse.json(
      {
        error: 'Failed to reset password',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
