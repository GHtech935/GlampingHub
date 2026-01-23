import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generatePasswordResetToken } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/email';
import { query } from '@/lib/db';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Check if customer exists
    const customerResult = await query(
      'SELECT id, first_name, last_name, email FROM customers WHERE email = $1',
      [email.toLowerCase()]
    );

    // For security: always return success even if email not found
    // This prevents email enumeration attacks
    if (customerResult.rows.length === 0) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const customer = customerResult.rows[0];
    const customerName = `${customer.first_name}${customer.last_name ? ' ' + customer.last_name : ''}`;

    // Generate reset token
    const token = await generatePasswordResetToken(email);

    if (!token) {
      throw new Error('Failed to generate reset token');
    }

    // Send password reset email (non-blocking)
    try {
      await sendPasswordResetEmail({
        customerEmail: email,
        customerName,
        resetToken: token,
      });
      console.log(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request if email fails, user already has token in DB
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process password reset request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
