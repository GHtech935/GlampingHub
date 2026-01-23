import { NextRequest, NextResponse } from 'next/server';
import pool, { tableExists } from '@/lib/db';
import { getSession, isStaffSession, hashPassword } from '@/lib/auth';

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check authentication - admin can update any user, owner can update themselves
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.role === "admin";
    const isOwnerEditingSelf = session.role === "owner" && session.id === id;

    if (!isAdmin && !isOwnerEditingSelf) {
      return NextResponse.json({ error: "Unauthorized to update this user" }, { status: 403 });
    }

    const hasUserCampsites = await tableExists('user_campsites');

    const body = await request.json();

    // If owner is editing themselves, only allow specific fields
    if (isOwnerEditingSelf) {
      const allowedFields = ['phone', 'owner_bank_name', 'owner_bank_id', 'owner_account_number', 'owner_account_holder', 'owner_bank_branch'];
      const providedFields = Object.keys(body);
      const unauthorizedFields = providedFields.filter(field => !allowedFields.includes(field));

      if (unauthorizedFields.length > 0) {
        return NextResponse.json(
          { error: `Owner can only update: ${allowedFields.join(', ')}` },
          { status: 403 }
        );
      }
    }

    const {
      first_name,
      last_name,
      phone,
      role,
      campsite_ids,  // Array of campsite IDs for operations/owner (DEPRECATED)
      glamping_zone_id,  // DEPRECATED: For backward compatibility, use glampingZoneIds
      glampingZoneIds,  // NEW: For glamping_owner role - array of zone IDs
      permissions,
      notes,
      is_active,
      password,  // Optional: only if changing password
      owner_bank_name,
      owner_bank_id,
      owner_account_number,
      owner_account_holder,
      owner_bank_branch
    } = body;

    const normalizedRole = role?.trim();

    const existingUserResult = await pool.query(
      'SELECT role, permissions FROM users WHERE id = $1',
      [id]
    );

    if (existingUserResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingUser = existingUserResult.rows[0];
    const effectiveRole = normalizedRole || existingUser.role;

    // Validate bank account fields if provided
    if (owner_account_number !== undefined) {
      const cleanAccountNumber = owner_account_number.replace(/\s/g, '');
      if (cleanAccountNumber && !/^\d{6,50}$/.test(cleanAccountNumber)) {
        return NextResponse.json(
          { success: false, error: 'Account number must contain only digits and be 6-50 characters long' },
          { status: 400 }
        );
      }
    }

    if (owner_account_holder !== undefined) {
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

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(first_name);
      paramIndex++;
    }

    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(last_name);
      paramIndex++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (glamping_zone_id !== undefined) {
      updates.push(`glamping_zone_id = $${paramIndex}`);
      values.push(glamping_zone_id || null);
      paramIndex++;
    }

    let pendingAssignedIds: string[] | null = null;

    if (permissions !== undefined) {
      const effectivePermissions = { ...(permissions || {}) };
      if (!hasUserCampsites && effectiveRole === 'operations') {
        effectivePermissions.assigned_campsite_ids = Array.isArray(campsite_ids)
          ? campsite_ids
          : (effectivePermissions.assigned_campsite_ids || []);
      }

      updates.push(`permissions = $${paramIndex}`);
      values.push(JSON.stringify(effectivePermissions));
      paramIndex++;
    } else if (!hasUserCampsites && campsite_ids !== undefined) {
      if (effectiveRole === 'operations') {
        pendingAssignedIds = Array.isArray(campsite_ids) ? campsite_ids : [];
      } else {
        pendingAssignedIds = [];
      }
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    // If password is being changed, hash it
    if (password) {
      const password_hash = await hashPassword(password);
      updates.push(`password_hash = $${paramIndex}`);
      values.push(password_hash);
      paramIndex++;
    }

    // Bank account fields
    if (owner_bank_name !== undefined) {
      updates.push(`owner_bank_name = $${paramIndex}`);
      values.push(owner_bank_name || null);
      paramIndex++;
    }

    if (owner_bank_id !== undefined) {
      updates.push(`owner_bank_id = $${paramIndex}`);
      values.push(owner_bank_id || null);
      paramIndex++;
    }

    if (owner_account_number !== undefined) {
      updates.push(`owner_account_number = $${paramIndex}`);
      values.push(owner_account_number || null);
      paramIndex++;
    }

    if (owner_account_holder !== undefined) {
      updates.push(`owner_account_holder = $${paramIndex}`);
      values.push(owner_account_holder || null);
      paramIndex++;
    }

    if (owner_bank_branch !== undefined) {
      updates.push(`owner_bank_branch = $${paramIndex}`);
      values.push(owner_bank_branch || null);
      paramIndex++;
    }

    // Update users table if there are any updates
    if (updates.length > 0) {
      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, first_name, last_name, role, phone, is_active, glamping_zone_id,
                  owner_bank_name, owner_bank_id, owner_account_number, owner_account_holder, owner_bank_branch
      `;
      values.push(id);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    // Handle campsite assignments if provided
    if (campsite_ids !== undefined && Array.isArray(campsite_ids)) {
      // Get user's role (either from request body or from database)
      let userRole = effectiveRole;

      if (userRole === 'operations' || userRole === 'owner') {
        if (hasUserCampsites) {
          // Delete existing assignments for this user and role
          await pool.query(
            'DELETE FROM user_campsites WHERE user_id = $1 AND role = $2',
            [id, userRole]
          );

          // Insert new assignments
          if (campsite_ids.length > 0) {
            const values = campsite_ids.map((campsiteId, index) =>
              `($1, $${index + 2}::uuid, $${campsite_ids.length + 2}, NOW(), $${campsite_ids.length + 3})`
            ).join(', ');

            await pool.query(
              `INSERT INTO user_campsites (user_id, campsite_id, role, assigned_at, assigned_by)
               VALUES ${values}`,
              [id, ...campsite_ids, userRole, session.id]
            );
          }
        }

        if (userRole === 'operations') {
          const primaryCampsiteId = campsite_ids.length > 0 ? campsite_ids[0] : null;
          await pool.query(
            'UPDATE users SET campsite_id = $1 WHERE id = $2',
            [primaryCampsiteId, id]
          );
        }

        if (userRole === 'owner') {
          await pool.query(
            'UPDATE campsites SET owner_id = NULL WHERE owner_id = $1',
            [id]
          );

          if (campsite_ids.length > 0) {
            await pool.query(
              'UPDATE campsites SET owner_id = $1 WHERE id = ANY($2::uuid[])',
              [id, campsite_ids]
            );
          }
        }
      }
    }

    // Handle glamping zone assignments if provided
    const hasUserGlampingZones = await tableExists('user_glamping_zones');
    if (glampingZoneIds !== undefined && Array.isArray(glampingZoneIds)) {
      let userRole = effectiveRole;

      if (userRole === 'glamping_owner') {
        if (hasUserGlampingZones) {
          // Delete existing assignments for this user
          await pool.query(
            'DELETE FROM user_glamping_zones WHERE user_id = $1',
            [id]
          );

          // Insert new assignments
          if (glampingZoneIds.length > 0) {
            const values = glampingZoneIds.map((zoneId, index) =>
              `($1, $${index + 2}::uuid, $${glampingZoneIds.length + 2}, NOW(), $${glampingZoneIds.length + 3})`
            ).join(', ');

            await pool.query(
              `INSERT INTO user_glamping_zones (user_id, zone_id, role, assigned_at, assigned_by)
               VALUES ${values}`,
              [id, ...glampingZoneIds, 'glamping_owner', session.id]
            );
          }
        }
      }
    }

    // Log activity
    const activityMetadata: any = {
      campsite_ids: campsite_ids,
      glampingZoneIds: glampingZoneIds,
      role: role,
      updated_by: session.id
    };

    // Log bank account updates (mask account number for privacy)
    if (owner_bank_name !== undefined || owner_account_number !== undefined ||
        owner_account_holder !== undefined || owner_bank_id !== undefined ||
        owner_bank_branch !== undefined) {
      activityMetadata.bank_account_updated = true;
      activityMetadata.bank_name = owner_bank_name;
      // Mask account number - only show last 4 digits
      if (owner_account_number) {
        const masked = owner_account_number.slice(-4).padStart(owner_account_number.length, '*');
        activityMetadata.account_number_masked = masked;
      }
    }

    await pool.query(
      `INSERT INTO activity_logs (action, entity_type, entity_id, entity_name, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'update',
        'user',
        id,
        `${first_name || ''} ${last_name || ''}`.trim(),
        JSON.stringify(activityMetadata)
      ]
    );

    if (!hasUserCampsites && pendingAssignedIds !== null) {
      await pool.query(
        `UPDATE users
         SET permissions = jsonb_set(
           COALESCE(permissions, '{}'::jsonb),
           '{assigned_campsite_ids}',
           $2::jsonb
         )
         WHERE id = $1`,
        [id, JSON.stringify(pendingAssignedIds)]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Deactivate user (soft delete)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check authentication - only admin can deactivate users
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Only admin can deactivate users" }, { status: 403 });
    }

    // Get user details
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Soft delete: set is_active to false
    await pool.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (action, entity_type, entity_id, entity_name, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'deactivate',
        'user',
        id,
        `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        JSON.stringify({
          role: user.role,
          email: user.email,
          deactivated_by: session.id
        })
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Đã vô hiệu hóa user thành công'
    });

  } catch (error: any) {
    console.error('Error deactivating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deactivate user',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Activate user
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check authentication - only admin can activate users
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Only admin can activate users" }, { status: 403 });
    }

    // Get user details
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Activate: set is_active to true
    await pool.query(
      'UPDATE users SET is_active = true WHERE id = $1',
      [id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (action, entity_type, entity_id, entity_name, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'activate',
        'user',
        id,
        `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        JSON.stringify({
          role: user.role,
          email: user.email,
          activated_by: session.id
        })
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Đã kích hoạt user thành công'
    });

  } catch (error: any) {
    console.error('Error activating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to activate user',
        details: error.message
      },
      { status: 500 }
    );
  }
}
