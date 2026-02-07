import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

// POST endpoint for inserting pricing records
// Supports both single and batch inserts
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Support both single pricing object and batch array
    const pricingRecords = Array.isArray(body) ? body : [body];

    if (pricingRecords.length === 0) {
      return NextResponse.json({ error: 'No pricing records provided' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertedIds = [];

      for (const pricing of pricingRecords) {
        const {
          item_id,
          parameter_id,
          event_id,
          rate_type,
          group_min,
          group_max,
          amount
        } = pricing;

        // Validate required fields
        if (!item_id || amount === undefined || amount === null) {
          throw new Error('item_id and amount are required');
        }

        // Insert pricing record
        const result = await client.query(
          `INSERT INTO glamping_pricing (
            item_id, parameter_id, event_id, rate_type, group_min, group_max, amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
          [
            item_id,
            parameter_id || null,
            event_id || null,
            (rate_type?.startsWith('timeslot_') ? 'per_timeslot' : rate_type) || 'per_night',
            group_min || null,
            group_max || null,
            amount
          ]
        );

        insertedIds.push(result.rows[0].id);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        count: insertedIds.length,
        ids: insertedIds
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Pricing insert error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to insert pricing records'
    }, { status: 500 });
  }
}
