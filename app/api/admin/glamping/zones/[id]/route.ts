import { NextRequest, NextResponse } from 'next/server';
import pool, { getClient } from '@/lib/db';
import { getSession, canAccessGlampingZone } from '@/lib/auth';

// GET - Get single glamping zone with details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: admin, sale, glamping_owner, operations
    if (!['admin', 'sale', 'glamping_owner', 'operations'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Validate zone access for glamping_owner
    if (!canAccessGlampingZone(session, id)) {
      return NextResponse.json(
        { error: 'You do not have access to this zone' },
        { status: 403 }
      );
    }

    // Get zone data + all counts + images in parallel (avoids 6-way LEFT JOIN)
    const [
      { rows: zoneRows },
      { rows: [items] },
      { rows: [categories] },
      { rows: [tags] },
      { rows: [parameters] },
      { rows: [events] },
      { rows: [discounts] },
      { rows: images },
    ] = await Promise.all([
      pool.query('SELECT * FROM glamping_zones WHERE id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as count FROM glamping_items WHERE zone_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as count FROM glamping_categories WHERE zone_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as count FROM glamping_tags WHERE zone_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as count FROM glamping_parameters WHERE zone_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as count FROM glamping_item_events WHERE zone_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as count FROM glamping_discounts WHERE zone_id = $1', [id]),
      pool.query(
        'SELECT * FROM glamping_zone_images WHERE zone_id = $1 ORDER BY display_order ASC, created_at ASC',
        [id]
      ),
    ]);

    if (zoneRows.length === 0) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    const zone = {
      ...zoneRows[0],
      items_count: items.count,
      categories_count: categories.count,
      tags_count: tags.count,
      parameters_count: parameters.count,
      events_count: events.count,
      discounts_count: discounts.count,
      images,
    };

    return NextResponse.json({ zone });
  } catch (error) {
    console.error('Error fetching glamping zone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zone' },
      { status: 500 }
    );
  }
}

// Shared update logic for PUT and PATCH
async function updateZone(
  req: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: admin, glamping_owner
    if (!['admin', 'glamping_owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Validate zone access for glamping_owner
    if (!canAccessGlampingZone(session, id)) {
      return NextResponse.json(
        { error: 'You do not have access to this zone' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate bank_account_id if provided
    if (body.bank_account_id !== undefined && body.bank_account_id !== null) {
      const bankAccountCheck = await pool.query(
        'SELECT id, is_active FROM bank_accounts WHERE id = $1',
        [body.bank_account_id]
      );

      if (bankAccountCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Bank account not found' },
          { status: 400 }
        );
      }

      if (!bankAccountCheck.rows[0].is_active) {
        return NextResponse.json(
          { error: 'Bank account is not active' },
          { status: 400 }
        );
      }
    }

    const allowedFields = [
      'name',
      'description',
      'address',
      'city',
      'province',
      'latitude',
      'longitude',
      'is_active',
      'is_featured',
      'bank_account_id',
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Handle JSONB fields
        if (field === 'name' || field === 'description') {
          updates.push(`${field} = $${paramIndex}`);
          values.push(JSON.stringify(body[field]));
        } else {
          updates.push(`${field} = $${paramIndex}`);
          values.push(body[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);

    values.push(id); // For WHERE clause

    const updateQuery = `
      UPDATE glamping_zones
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await pool.query(updateQuery, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, zone: rows[0] });
  } catch (error) {
    console.error('Error updating glamping zone:', error);
    return NextResponse.json(
      { error: 'Failed to update zone' },
      { status: 500 }
    );
  }
}

// PUT - Update glamping zone
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateZone(req, params);
}

// PATCH - Update glamping zone (partial update)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateZone(req, params);
}

// DELETE - Delete glamping zone (CASCADE will delete all related data)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getClient();

  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: admin only for delete
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id } = await params;

    await client.query('BEGIN');

    // Check if zone exists
    const checkQuery = 'SELECT * FROM glamping_zones WHERE id = $1';
    const { rows: zoneRows } = await client.query(checkQuery, [id]);

    if (zoneRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    // Get counts for confirmation message
    const countsQuery = `
      SELECT
        COUNT(DISTINCT i.id) as items_count,
        COUNT(DISTINCT c.id) as categories_count,
        COUNT(DISTINCT e.id) as events_count
      FROM glamping_zones z
      LEFT JOIN glamping_items i ON i.zone_id = z.id
      LEFT JOIN glamping_categories c ON c.zone_id = z.id
      LEFT JOIN glamping_item_events e ON e.zone_id = z.id
      WHERE z.id = $1
    `;

    const { rows: countRows } = await client.query(countsQuery, [id]);
    const counts = countRows[0];

    // Delete zone (CASCADE will handle related data)
    const deleteQuery = 'DELETE FROM glamping_zones WHERE id = $1';
    await client.query(deleteQuery, [id]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Zone deleted successfully',
      deleted_items: parseInt(counts.items_count),
      deleted_categories: parseInt(counts.categories_count),
      deleted_events: parseInt(counts.events_count),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting glamping zone:', error);
    return NextResponse.json(
      { error: 'Failed to delete zone' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
