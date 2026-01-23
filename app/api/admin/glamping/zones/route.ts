import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET - List all glamping zones
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: admin, owner
    if (!['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Optional filters
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const province = searchParams.get('province');
    const isActive = searchParams.get('is_active');
    const isFeatured = searchParams.get('is_featured');

    let query = `
      SELECT
        z.*,
        COUNT(DISTINCT i.id) as items_count,
        COUNT(DISTINCT c.id) as categories_count,
        COUNT(DISTINCT zi.id) as images_count
      FROM glamping_zones z
      LEFT JOIN glamping_items i ON i.zone_id = z.id
      LEFT JOIN glamping_categories c ON c.zone_id = z.id
      LEFT JOIN glamping_zone_images zi ON zi.zone_id = z.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Search filter (name vi/en, address, city, province)
    if (search) {
      query += ` AND (
        z.name->>'vi' ILIKE $${paramIndex} OR
        z.name->>'en' ILIKE $${paramIndex} OR
        z.address ILIKE $${paramIndex} OR
        z.city ILIKE $${paramIndex} OR
        z.province ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (city) {
      query += ` AND z.city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (province) {
      query += ` AND z.province ILIKE $${paramIndex}`;
      params.push(`%${province}%`);
      paramIndex++;
    }

    if (isActive !== null && isActive !== undefined) {
      query += ` AND z.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    if (isFeatured !== null && isFeatured !== undefined) {
      query += ` AND z.is_featured = $${paramIndex}`;
      params.push(isFeatured === 'true');
      paramIndex++;
    }

    query += `
      GROUP BY z.id
      ORDER BY z.is_featured DESC, z.created_at DESC
    `;

    const { rows } = await pool.query(query, params);

    // Convert bigint counts to numbers
    const zones = rows.map(zone => ({
      ...zone,
      items_count: parseInt(zone.items_count) || 0,
      categories_count: parseInt(zone.categories_count) || 0,
      images_count: parseInt(zone.images_count) || 0,
    }));

    return NextResponse.json({ zones });
  } catch (error) {
    console.error('Error fetching glamping zones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zones' },
      { status: 500 }
    );
  }
}

// POST - Create new glamping zone
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: admin, owner
    if (!['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      address,
      city,
      province,
      latitude,
      longitude,
      is_active,
      is_featured,
      bank_account_id,
    } = body;

    // Validation
    if (!name || !name.vi) {
      return NextResponse.json(
        { error: 'Vietnamese name is required' },
        { status: 400 }
      );
    }

    // Validate bank_account_id if provided
    if (bank_account_id) {
      const bankAccountCheck = await pool.query(
        'SELECT id, is_active FROM bank_accounts WHERE id = $1',
        [bank_account_id]
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

    // Insert zone
    const insertQuery = `
      INSERT INTO glamping_zones (
        name,
        description,
        address,
        city,
        province,
        latitude,
        longitude,
        is_active,
        is_featured,
        bank_account_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const { rows } = await pool.query(insertQuery, [
      JSON.stringify(name),
      description ? JSON.stringify(description) : JSON.stringify({ vi: '', en: '' }),
      address || null,
      city || null,
      province || null,
      latitude || null,
      longitude || null,
      is_active !== undefined ? is_active : true,
      is_featured !== undefined ? is_featured : false,
      bank_account_id || null,
    ]);

    return NextResponse.json({ success: true, zone: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating glamping zone:', error);
    return NextResponse.json(
      { error: 'Failed to create zone' },
      { status: 500 }
    );
  }
}
