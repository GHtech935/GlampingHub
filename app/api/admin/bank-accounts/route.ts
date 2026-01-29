import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, isStaffSession } from '@/lib/auth';
import { validateBankAccountData } from '@/lib/bank-accounts';

// Disable caching
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bank-accounts
 * List all bank accounts with pagination, search, filter
 * Auth: Admin and Owner
 */
export async function GET(request: NextRequest) {
  try {
    // Check auth - allow admin and owner
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'owner', 'glamping_owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const is_active = searchParams.get('is_active');
    const search = searchParams.get('search');
    const glamping_zone_id = searchParams.get('glamping_zone_id');

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by glamping zone: only accounts assigned to this zone
    if (glamping_zone_id) {
      conditions.push(
        `ba.id IN (SELECT bank_account_id FROM glamping_zones WHERE id = $${paramIndex} AND bank_account_id IS NOT NULL)`
      );
      params.push(glamping_zone_id);
      paramIndex++;
    }

    if (is_active !== null && is_active !== undefined && is_active !== '') {
      conditions.push(`ba.is_active = $${paramIndex}`);
      params.push(is_active === 'true');
      paramIndex++;
    }

    if (search) {
      conditions.push(
        `(ba.bank_name ILIKE $${paramIndex} OR ba.account_number ILIKE $${paramIndex} OR ba.account_holder ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM bank_accounts ba ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch bank accounts with usage stats
    const result = await pool.query(
      `
      SELECT
        ba.*,
        (SELECT COUNT(*) FROM campsites WHERE bank_account_id = ba.id) as campsite_count,
        (SELECT COUNT(*) FROM glamping_zones WHERE bank_account_id = ba.id) as glamping_zone_count,
        (SELECT COUNT(*) FROM sepay_transactions WHERE bank_account_id = ba.id AND status = 'matched') as transaction_count,
        (SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) FROM sepay_transactions WHERE bank_account_id = ba.id AND status = 'matched') as total_amount
      FROM bank_accounts ba
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, limit, offset]
    );

    const accountsWithStats = result.rows.map(account => ({
      id: account.id,
      bank_name: account.bank_name,
      bank_id: account.bank_id,
      account_number: account.account_number,
      account_holder: account.account_holder,
      is_default: account.is_default,
      is_active: account.is_active,
      notes: account.notes,
      created_by: account.created_by,
      updated_by: account.updated_by,
      created_at: account.created_at,
      updated_at: account.updated_at,
      _usage: {
        campsite_count: parseInt(account.campsite_count) || 0,
        glamping_zone_count: parseInt(account.glamping_zone_count) || 0,
        transaction_count: parseInt(account.transaction_count) || 0,
        total_amount: parseFloat(account.total_amount) || 0,
      },
    }));

    return NextResponse.json({
      success: true,
      data: accountsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/bank-accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/bank-accounts
 * Create new bank account
 * Auth: Admin and Owner
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth - allow admin and owner
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin' && session.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    let {
      bank_name,
      bank_id,
      account_number,
      account_holder,
      is_default = false,
      is_active = true,
      notes,
    } = body;

    // Owner cannot set is_default = true (only admin can)
    if (session.role === 'owner' && is_default === true) {
      is_default = false;
    }

    // Validate required fields
    if (!bank_name || !bank_id || !account_number || !account_holder) {
      return NextResponse.json(
        { error: 'Missing required fields: bank_name, bank_id, account_number, account_holder' },
        { status: 400 }
      );
    }

    // Validate data
    const validation = validateBankAccountData({
      bank_name,
      bank_id,
      account_number,
      account_holder,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Check for duplicate account_number + bank_id
    const existingResult = await pool.query(
      `SELECT id FROM bank_accounts
       WHERE account_number = $1 AND bank_id = $2 AND is_active = true`,
      [account_number, bank_id]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'This account number already exists for the selected bank' },
        { status: 400 }
      );
    }

    // If is_default = true, set all other accounts to false
    if (is_default) {
      await pool.query(
        `UPDATE bank_accounts SET is_default = false WHERE is_default = true`
      );
    }

    // Create bank account
    const result = await pool.query(
      `INSERT INTO bank_accounts
       (bank_name, bank_id, account_number, account_holder, is_default, is_active, notes, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        bank_name,
        bank_id.toUpperCase(),
        account_number,
        account_holder,
        is_default,
        is_active,
        notes,
        session.id,
        session.id,
      ]
    );

    const bankAccount = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        message: 'Bank account created successfully',
        data: bankAccount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/bank-accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
