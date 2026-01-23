import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, isStaffSession } from '@/lib/auth';
import { validateBankAccountData, getBankAccountUsageCount } from '@/lib/bank-accounts';

// Disable caching
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bank-accounts/{id}
 * Get single bank account with details
 * Auth: Admin and Owner
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check auth - allow admin and owner
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin' && session.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get bank account
    const result = await pool.query(
      `SELECT * FROM bank_accounts WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const bankAccount = result.rows[0];

    // Get campsites using this account
    const campsitesResult = await pool.query(
      `SELECT id, name, slug FROM campsites WHERE bank_account_id = $1`,
      [id]
    );

    // Get glamping zones using this account
    const glampingZonesResult = await pool.query(
      `SELECT id, name FROM glamping_zones WHERE bank_account_id = $1`,
      [id]
    );

    // Get transaction stats
    const txStatsResult = await pool.query(
      `SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_amount
       FROM sepay_transactions
       WHERE bank_account_id = $1 AND status = 'matched'`,
      [id]
    );

    const stats = txStatsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        ...bankAccount,
        campsites: campsitesResult.rows || [],
        glamping_zones: glampingZonesResult.rows || [],
        stats: {
          total_transactions: parseInt(stats.total_transactions) || 0,
          total_amount: parseFloat(stats.total_amount) || 0,
          campsite_count: campsitesResult.rows.length || 0,
          glamping_zone_count: glampingZonesResult.rows.length || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/bank-accounts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/bank-accounts/{id}
 * Update bank account
 * Auth: Admin and Owner
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check auth - allow admin and owner
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin' && session.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get existing bank account
    const existingResult = await pool.query(
      `SELECT * FROM bank_accounts WHERE id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const existing = existingResult.rows[0];

    // Owner can only update accounts they created
    if (session.role === 'owner' && existing.created_by !== session.id) {
      return NextResponse.json(
        { error: 'You can only update bank accounts you created' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    let {
      bank_name,
      bank_id,
      account_number,
      account_holder,
      is_default,
      is_active,
      notes,
    } = body;

    // Owner cannot set is_default = true (only admin can)
    if (session.role === 'owner' && is_default === true) {
      is_default = false;
    }

    // Validate data (only fields that are provided)
    const validation = validateBankAccountData({
      bank_name: bank_name || existing.bank_name,
      bank_id: bank_id || existing.bank_id,
      account_number: account_number || existing.account_number,
      account_holder: account_holder || existing.account_holder,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Check for duplicate account_number + bank_id (if account_number or bank_id is being changed)
    if (account_number || bank_id) {
      const newAccountNumber = account_number || existing.account_number;
      const newBankId = bank_id || existing.bank_id;

      // Only check if different from current
      if (newAccountNumber !== existing.account_number || newBankId !== existing.bank_id) {
        const duplicateResult = await pool.query(
          `SELECT id FROM bank_accounts
           WHERE account_number = $1 AND bank_id = $2 AND is_active = true AND id != $3`,
          [newAccountNumber, newBankId.toUpperCase(), id]
        );

        if (duplicateResult.rows.length > 0) {
          return NextResponse.json(
            { error: 'This account number already exists for the selected bank' },
            { status: 400 }
          );
        }
      }
    }

    // If setting is_active = false, check usage
    if (is_active === false) {
      const usageCount = await getBankAccountUsageCount(id);
      if (usageCount > 0) {
        return NextResponse.json(
          { error: `Cannot deactivate bank account. It is being used by ${usageCount} campsites/zones.` },
          { status: 400 }
        );
      }
    }

    // If is_default = true, set all other accounts to false
    if (is_default === true) {
      await pool.query(
        `UPDATE bank_accounts SET is_default = false WHERE is_default = true`
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (bank_name !== undefined) {
      updates.push(`bank_name = $${paramIndex}`);
      values.push(bank_name);
      paramIndex++;
    }
    if (bank_id !== undefined) {
      updates.push(`bank_id = $${paramIndex}`);
      values.push(bank_id.toUpperCase());
      paramIndex++;
    }
    if (account_number !== undefined) {
      updates.push(`account_number = $${paramIndex}`);
      values.push(account_number);
      paramIndex++;
    }
    if (account_holder !== undefined) {
      updates.push(`account_holder = $${paramIndex}`);
      values.push(account_holder);
      paramIndex++;
    }
    if (is_default !== undefined) {
      updates.push(`is_default = $${paramIndex}`);
      values.push(is_default);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    updates.push(`updated_by = $${paramIndex}`);
    values.push(session.id);
    paramIndex++;

    updates.push(`updated_at = NOW()`);

    values.push(id); // For WHERE clause

    // Update bank account
    const result = await pool.query(
      `UPDATE bank_accounts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    const updated = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Bank account updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/bank-accounts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/bank-accounts/{id}
 * Delete bank account
 * Auth: Admin and Owner
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check auth - allow admin and owner
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin' && session.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get existing bank account
    const existingResult = await pool.query(
      `SELECT is_default, created_by FROM bank_accounts WHERE id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const existing = existingResult.rows[0];

    // Owner can only delete accounts they created
    if (session.role === 'owner' && existing.created_by !== session.id) {
      return NextResponse.json(
        { error: 'You can only delete bank accounts you created' },
        { status: 403 }
      );
    }

    // Cannot delete default account
    if (existing.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default bank account. Please set another account as default first.' },
        { status: 400 }
      );
    }

    // Check usage
    const usageCount = await getBankAccountUsageCount(id);
    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete bank account. It is being used by ${usageCount} campsites/zones.` },
        { status: 400 }
      );
    }

    // Check if has transactions
    const txCountResult = await pool.query(
      `SELECT COUNT(*) FROM sepay_transactions WHERE bank_account_id = $1`,
      [id]
    );

    const txCount = parseInt(txCountResult.rows[0].count);

    if (txCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete bank account. It has ${txCount} transactions linked to it.` },
        { status: 400 }
      );
    }

    // Delete bank account
    await pool.query(`DELETE FROM bank_accounts WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Bank account deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/bank-accounts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
