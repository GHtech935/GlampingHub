import { NextRequest, NextResponse } from 'next/server';
import { getSession, isCustomerSession, hashPassword, verifyPassword } from '@/lib/auth';
import pool from '@/lib/db';

// PUT - Change customer password
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !isCustomerSession(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM customers WHERE id = $1',
      [session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = result.rows[0];

    // If customer has a password, verify current password
    if (customer.password_hash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        );
      }

      const isValid = await verifyPassword(currentPassword, customer.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await pool.query(
      `UPDATE customers
       SET password_hash = $2, is_registered = true, updated_at = NOW()
       WHERE id = $1`,
      [session.id, newPasswordHash]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
