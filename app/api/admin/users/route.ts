import { NextRequest, NextResponse } from 'next/server';
import pool, { tableExists } from '@/lib/db';
import { hashPassword, getSession, isStaffSession, getAccessibleCampsiteIds } from '@/lib/auth';

// GET - List all admin users
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and owner can list users
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const zoneId = searchParams.get('zoneId');

    let query = `
      SELECT
        a.id,
        a.email,
        a.first_name,
        a.last_name,
        a.role,
        a.permissions,
        a.is_active,
        a.phone,
        a.avatar_url,
        a.last_login_at,
        a.last_login_ip,
        a.failed_login_attempts,
        a.account_locked_until,
        a.notes,
        a.created_at,
        a.owner_bank_name,
        a.owner_bank_id,
        a.owner_account_number,
        a.owner_account_holder,
        a.owner_bank_branch,
        a.glamping_zone_id,
        COALESCE(gz.name->>'vi', gz.name->>'en') as glamping_zone_name,
        pp.description as role_description
      FROM users a
      LEFT JOIN permission_presets pp ON a.role = pp.role
      LEFT JOIN glamping_zones gz ON a.glamping_zone_id = gz.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter by zoneId if provided (only show users assigned to this zone)
    if (zoneId && zoneId !== 'all') {
      query += ` AND a.glamping_zone_id = $${paramIndex}`;
      params.push(zoneId);
      paramIndex++;
    }

    if (role && role !== 'all') {
      query += ` AND a.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (status === 'active') {
      query += ` AND a.is_active = true`;
    } else if (status === 'inactive') {
      query += ` AND a.is_active = false`;
    }

    if (search) {
      query += ` AND (
        a.first_name ILIKE $${paramIndex} OR
        a.last_name ILIKE $${paramIndex} OR
        a.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await pool.query(query, params);

    // Don't send password hashes
    const users = result.rows.map(user => {
      const { password_hash, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    });

    return NextResponse.json({
      success: true,
      data: users
    });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST - Create new admin user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication - only admin can create users
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can create users
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Only admin can create users" }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      campsite_id,
      campsite_ids, // For owner role - array of campsite IDs (DEPRECATED)
      glamping_zone_id, // NEW: For GlampingHub
      phone,
      permissions,
      notes,
      owner_bank_name,
      owner_bank_id,
      owner_account_number,
      owner_account_holder,
      owner_bank_branch
    } = body;

    const normalizedRole = role?.trim();

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate bank account fields for owner role
    if (normalizedRole === 'owner') {
      // Validate account number format if provided (digits only, 6-20 chars)
      if (owner_account_number) {
        const cleanAccountNumber = owner_account_number.replace(/\s/g, '');
        if (!/^\d{6,50}$/.test(cleanAccountNumber)) {
          return NextResponse.json(
            { success: false, error: 'Account number must contain only digits and be 6-50 characters long' },
            { status: 400 }
          );
        }
      }

      // Validate account holder name format if provided
      if (owner_account_holder) {
        const nameRegex = /^[a-zA-ZÀ-ỹ\s]{2,255}$/;
        if (!nameRegex.test(owner_account_holder.trim())) {
          return NextResponse.json(
            { success: false, error: 'Account holder name must contain only letters and spaces (2-255 characters)' },
            { status: 400 }
          );
        }
      }
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    const hasUserCampsites = await tableExists('user_campsites');

    // Derive legacy campsite_id for backward compatibility (operations role)
    const primaryCampsiteId =
      campsite_id ||
      (Array.isArray(campsite_ids) && campsite_ids.length > 0 ? campsite_ids[0] : null);

    // Hash password
    const password_hash = await hashPassword(password);

    // Insert user
    const result = await pool.query(
      `
      INSERT INTO users (
        email, password_hash, first_name, last_name, role,
        campsite_id, glamping_zone_id, phone, permissions, notes, is_active,
        owner_bank_name, owner_bank_id, owner_account_number, owner_account_holder, owner_bank_branch
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, $13, $14, $15)
      RETURNING id, email, first_name, last_name, role, campsite_id, glamping_zone_id, phone, is_active, created_at,
                owner_bank_name, owner_bank_id, owner_account_number, owner_account_holder, owner_bank_branch
      `,
      [
        email,
        password_hash,
        first_name,
        last_name,
        role,
        primaryCampsiteId,
        glamping_zone_id || null,
        phone || null,
        JSON.stringify((() => {
          const effectivePermissions = { ...(permissions || {}) };
          if (!hasUserCampsites && normalizedRole === 'operations') {
            effectivePermissions.assigned_campsite_ids = campsite_ids || [];
          }
          return effectivePermissions;
        })()),
        notes || null,
        owner_bank_name || null,
        owner_bank_id || null,
        owner_account_number || null,
        owner_account_holder || null,
        owner_bank_branch || null
      ]
    );

    const newUserId = result.rows[0].id;

    // For operations and owner roles, insert into junction table
    if (
      hasUserCampsites &&
      (role === 'operations' || role === 'owner') &&
      campsite_ids &&
      Array.isArray(campsite_ids) &&
      campsite_ids.length > 0
    ) {
      // Build dynamic values for bulk insert
      const values = campsite_ids.map((campsiteId, index) =>
        `($1, $${index + 2}::uuid, $${campsite_ids.length + 2}, NOW(), $${campsite_ids.length + 3})`
      ).join(', ');

      await pool.query(
        `INSERT INTO user_campsites (user_id, campsite_id, role, assigned_at, assigned_by)
         VALUES ${values}`,
        [newUserId, ...campsite_ids, role, session.id]
      );
    }

    // LEGACY: For owner role, also update campsites.owner_id for backward compatibility
    if (role === 'owner' && campsite_ids && Array.isArray(campsite_ids) && campsite_ids.length > 0) {
      await pool.query(
        'UPDATE campsites SET owner_id = $1 WHERE id = ANY($2::uuid[])',
        [newUserId, campsite_ids]
      );
    }

    // Log activity
    await pool.query(
      `
      INSERT INTO activity_logs (action, entity_type, entity_id, entity_name, metadata)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        'create',
        'admin',
        newUserId,
        `${first_name} ${last_name}`,
        JSON.stringify({ email, role, campsite_ids: role === 'owner' ? campsite_ids : undefined })
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'User created successfully'
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user',
        details: error.message
      },
      { status: 500 }
    );
  }
}
