import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAdminPasswordResetToken } from '@/lib/password-reset';
import { sendAdminPasswordResetEmail } from '@/lib/email';
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

    // Check if admin/staff user exists
    const userResult = await query(
      'SELECT id, first_name, last_name, email, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // For security: always return success even if email not found
    // This prevents email enumeration attacks
    if (userResult.rows.length === 0) {
      console.log(`Admin password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      console.log(`Admin password reset requested for inactive user: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;

    // Generate reset token
    const token = await generateAdminPasswordResetToken(email);

    if (!token) {
      throw new Error('Failed to generate reset token');
    }

    // Send password reset email (non-blocking)
    try {
      await sendAdminPasswordResetEmail({
        userEmail: email,
        userName,
        resetToken: token,
      });
      console.log(`Admin password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send admin password reset email:', emailError);
      // Don't fail the request if email fails, user already has token in DB
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Admin forgot password error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process password reset request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
