import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, isStaffSession } from '@/lib/auth';

// Disable caching
export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/bank-accounts/{id}/set-default
 * Set bank account as default
 * Auth: Admin only
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;

    // Check auth - admin only
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Check if bank account exists
    const result = await pool.query(
      `SELECT id, is_default, is_active FROM bank_accounts WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const bankAccount = result.rows[0];

    // Check if active
    if (!bankAccount.is_active) {
      return NextResponse.json(
        { error: 'Cannot set inactive bank account as default' },
        { status: 400 }
      );
    }

    // If already default, return success
    if (bankAccount.is_default) {
      return NextResponse.json({
        success: true,
        message: 'Bank account is already the default',
      });
    }

    // Use database transaction to ensure atomicity
    await client.query('BEGIN');

    try {
      // Set all other accounts to is_default = false
      await client.query(
        `UPDATE bank_accounts SET is_default = false WHERE is_default = true`
      );

      // Set this account to is_default = true
      await client.query(
        `UPDATE bank_accounts
         SET is_default = true, updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Bank account set as default successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in PUT /api/admin/bank-accounts/[id]/set-default:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
