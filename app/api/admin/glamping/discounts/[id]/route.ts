import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get discount with rules
    const discountResult = await pool.query(
      `SELECT
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
        d.weekly_days,
        d.rules_id,
        d.status,
        d.application_type,
        d.created_at,
        d.updated_at
       FROM glamping_discounts d
       WHERE d.id = $1`,
      [id]
    );

    if (discountResult.rows.length === 0) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    const discount = discountResult.rows[0];

    // Convert apply_type and apply_after_tax back to application_method
    let application_method = 'per_booking_after_tax';
    if (discount.apply_type === 'per_booking' && discount.apply_after_tax) {
      application_method = 'per_booking_after_tax';
    } else if (discount.apply_type === 'per_booking' && !discount.apply_after_tax) {
      application_method = 'per_booking_before_tax';
    } else if (discount.apply_type === 'per_item') {
      application_method = 'per_item';
    }

    // Get associated items
    const itemsResult = await pool.query(
      `SELECT item_id FROM glamping_discount_items WHERE discount_id = $1`,
      [id]
    );

    const item_ids = itemsResult.rows.map(row => row.item_id);

    return NextResponse.json({
      discount: {
        ...discount,
        application_method,
        application_type: discount.application_type || 'tent',
        item_ids
      }
    });

  } catch (error) {
    console.error('Discount fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch discount' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      code,
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

      // Update discount
      const discountResult = await client.query(
        `UPDATE glamping_discounts SET
          name = $1,
          code = $2,
          type = $3,
          amount = $4,
          apply_type = $5,
          apply_after_tax = $6,
          start_date = $7,
          end_date = $8,
          recurrence = $9,
          weekly_days = $10,
          rules_id = $11,
          status = $12,
          application_type = $13,
          updated_at = NOW()
         WHERE id = $14
         RETURNING *`,
        [
          name,
          code || null,
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
          application_type,
          id
        ]
      );

      if (discountResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
      }

      const discount = discountResult.rows[0];

      // Update associated items
      // First, delete all existing associations
      await client.query(
        `DELETE FROM glamping_discount_items WHERE discount_id = $1`,
        [id]
      );

      // Then, insert new associations
      if (item_ids && item_ids.length > 0) {
        for (const item_id of item_ids) {
          await client.query(
            `INSERT INTO glamping_discount_items (discount_id, item_id)
             VALUES ($1, $2)`,
            [id, item_id]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        discount
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Discount update error:', error);
    return NextResponse.json({ error: 'Failed to update discount' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await pool.query(
      `DELETE FROM glamping_discounts WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Discount deleted successfully'
    });

  } catch (error) {
    console.error('Discount deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete discount' }, { status: 500 });
  }
}
