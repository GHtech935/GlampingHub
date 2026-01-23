import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAccessibleGlampingZoneIds, canAccessGlampingZone } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get accessible zone IDs (null = all, [] = none)
    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);

    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');

    let query = `
      SELECT
        d.id,
        d.name,
        d.code,
        d.zone_id,
        d.type as discount_type,
        d.amount as discount_value,
        d.apply_type,
        d.apply_after_tax,
        d.start_date,
        d.end_date,
        d.recurrence,
        d.status,
        d.created_at,
        d.updated_at,
        rs.name as rules_name
       FROM glamping_discounts d
       LEFT JOIN glamping_rule_sets rs ON d.rules_id = rs.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Filter by accessible zones for glamping_owner
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        return NextResponse.json({ discounts: [] });
      }
      conditions.push(`d.zone_id = ANY($${params.length + 1}::uuid[])`);
      params.push(accessibleZoneIds);
    }

    // Filter by zone_id if provided (skip if "all")
    if (zoneId && zoneId !== 'all') {
      if (accessibleZoneIds !== null && !accessibleZoneIds.includes(zoneId)) {
        return NextResponse.json(
          { error: 'You do not have access to this zone' },
          { status: 403 }
        );
      }
      conditions.push(`d.zone_id = $${params.length + 1}`);
      params.push(zoneId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);

    return NextResponse.json({
      discounts: result.rows
    });

  } catch (error) {
    console.error('Discounts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      code,
      zone_id,
      discount_type,
      discount_value,
      application_method,
      start_date,
      end_date,
      recurrence,
      weekly_days,
      rules_id,
      status,
      application_type,
      item_ids
    } = body;

    if (!name || !discount_type || discount_value === undefined) {
      return NextResponse.json(
        { error: 'Name, discount type, and discount value are required' },
        { status: 400 }
      );
    }

    if (!zone_id || zone_id === 'all') {
      return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
    }

    // Validate zone access for glamping_owner
    if (!canAccessGlampingZone(session, zone_id)) {
      return NextResponse.json(
        { error: 'You do not have access to this zone' },
        { status: 403 }
      );
    }

    // Validate application_type
    if (!application_type || !['tent', 'menu'].includes(application_type)) {
      return NextResponse.json(
        { error: 'Valid application_type (tent or menu) is required' },
        { status: 400 }
      );
    }

    // Convert application_method to apply_type and apply_after_tax
    let apply_type = 'per_booking';
    let apply_after_tax = false;

    if (application_method === 'per_booking_after_tax') {
      apply_type = 'per_booking';
      apply_after_tax = true;
    } else if (application_method === 'per_booking_before_tax') {
      apply_type = 'per_booking';
      apply_after_tax = false;
    } else if (application_method === 'per_item') {
      apply_type = 'per_item';
      apply_after_tax = false;
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create discount
      const discountResult = await client.query(
        `INSERT INTO glamping_discounts (
          name, code, zone_id, type, amount, apply_type, apply_after_tax,
          start_date, end_date, recurrence, weekly_days, rules_id, status, application_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          name,
          code || null,
          zone_id,
          discount_type,
          discount_value,
          apply_type,
          apply_after_tax,
          start_date || null,
          end_date || null,
          recurrence || 'always',
          weekly_days || [],
          rules_id || null,
          status || 'active',
          application_type
        ]
      );

      const discount = discountResult.rows[0];

      // Associate with items if provided
      if (item_ids && item_ids.length > 0) {
        for (const item_id of item_ids) {
          await client.query(
            `INSERT INTO glamping_discount_items (discount_id, item_id)
             VALUES ($1, $2)`,
            [discount.id, item_id]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        discount
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Discount creation error:', error);
    return NextResponse.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}
