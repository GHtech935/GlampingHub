import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

// All 12 rule types with their default configuration
const DEFAULT_RULES = [
  { rule_type: 'cutoff', unit: 'days' },
  { rule_type: 'forward_booking_window', unit: 'days' },
  { rule_type: 'past_booking_window', unit: 'days' },
  { rule_type: 'max_booking_quantity', unit: 'items' },
  { rule_type: 'max_duration_per_item', unit: 'nights' },
  { rule_type: 'max_items_per_booking', unit: 'items' },
  { rule_type: 'max_subtotal_value', unit: 'amount' },
  { rule_type: 'min_booking_quantity', unit: 'items' },
  { rule_type: 'min_duration_per_item', unit: 'nights' },
  { rule_type: 'min_subtotal_value', unit: 'amount' },
  { rule_type: 'overbooking_allowance', unit: 'items' },
  { rule_type: 'start_day_of_week', unit: 'days' },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');

    if (!zoneId || zoneId === 'all') {
      return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
    }

    // Get all rule sets for this zone
    const result = await pool.query(
      `SELECT
        rs.id,
        rs.name,
        rs.is_default,
        rs.zone_id,
        rs.created_at,
        rs.updated_at,
        (SELECT COUNT(*) FROM glamping_rules r WHERE r.rule_set_id = rs.id AND r.status = 'active') as active_rules_count
       FROM glamping_rule_sets rs
       WHERE rs.zone_id = $1
       ORDER BY rs.is_default DESC, rs.created_at ASC`,
      [zoneId]
    );

    return NextResponse.json({
      ruleSets: result.rows
    });

  } catch (error) {
    console.error('Rule sets fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch rule sets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, zone_id, is_default = false } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!zone_id || zone_id === 'all') {
      return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If creating default rule set, ensure no other default exists for this zone
      if (is_default) {
        await client.query(
          `UPDATE glamping_rule_sets SET is_default = FALSE WHERE zone_id = $1 AND is_default = TRUE`,
          [zone_id]
        );
      }

      // Create the rule set
      const ruleSetResult = await client.query(
        `INSERT INTO glamping_rule_sets (name, zone_id, is_default, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [name, zone_id, is_default]
      );

      const ruleSet = ruleSetResult.rows[0];

      // Create all 12 default rules with status='disabled'
      for (const rule of DEFAULT_RULES) {
        await client.query(
          `INSERT INTO glamping_rules (
            rule_set_id, rule_type, value, unit,
            apply_to_customer, apply_to_staff, is_strict, status,
            created_at, updated_at
          ) VALUES ($1, $2, NULL, $3, TRUE, TRUE, FALSE, 'disabled', NOW(), NOW())`,
          [ruleSet.id, rule.rule_type, rule.unit]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        ruleSet
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Rule set creation error:', error);
    return NextResponse.json({ error: 'Failed to create rule set' }, { status: 500 });
  }
}
