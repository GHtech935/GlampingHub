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

    // Get rule set with all its rules
    const ruleSetResult = await pool.query(
      `SELECT id, name, is_default, zone_id, created_at, updated_at
       FROM glamping_rule_sets
       WHERE id = $1`,
      [id]
    );

    if (ruleSetResult.rows.length === 0) {
      return NextResponse.json({ error: 'Rule set not found' }, { status: 404 });
    }

    const ruleSet = ruleSetResult.rows[0];

    // Get all rules for this rule set
    const rulesResult = await pool.query(
      `SELECT id, rule_type, value, unit, apply_to_customer, apply_to_staff, is_strict, status
       FROM glamping_rules
       WHERE rule_set_id = $1
       ORDER BY
         CASE WHEN status = 'active' THEN 0 ELSE 1 END,
         rule_type ASC`,
      [id]
    );

    return NextResponse.json({
      ruleSet: {
        ...ruleSet,
        rules: rulesResult.rows
      }
    });

  } catch (error) {
    console.error('Rule set fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch rule set' }, { status: 500 });
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
    const { name, rules } = body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update rule set name if provided
      if (name !== undefined) {
        const updateResult = await client.query(
          `UPDATE glamping_rule_sets
           SET name = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [name, id]
        );

        if (updateResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Rule set not found' }, { status: 404 });
        }
      }

      // Update rules if provided
      if (rules && Array.isArray(rules)) {
        for (const rule of rules) {
          const { rule_type, value, apply_to_customer, apply_to_staff, is_strict } = rule;

          // Determine status based on value
          const status = value !== null && value !== undefined && value !== '' ? 'active' : 'disabled';
          const finalValue = status === 'active' ? value : null;

          await client.query(
            `UPDATE glamping_rules
             SET value = $1,
                 apply_to_customer = $2,
                 apply_to_staff = $3,
                 is_strict = $4,
                 status = $5,
                 updated_at = NOW()
             WHERE rule_set_id = $6 AND rule_type = $7`,
            [finalValue, apply_to_customer ?? true, apply_to_staff ?? true, is_strict ?? false, status, id, rule_type]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch updated rule set with rules
      const ruleSetResult = await pool.query(
        `SELECT id, name, is_default, zone_id, created_at, updated_at
         FROM glamping_rule_sets
         WHERE id = $1`,
        [id]
      );

      const rulesResult = await pool.query(
        `SELECT id, rule_type, value, unit, apply_to_customer, apply_to_staff, is_strict, status
         FROM glamping_rules
         WHERE rule_set_id = $1
         ORDER BY
           CASE WHEN status = 'active' THEN 0 ELSE 1 END,
           rule_type ASC`,
        [id]
      );

      return NextResponse.json({
        success: true,
        ruleSet: {
          ...ruleSetResult.rows[0],
          rules: rulesResult.rows
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Rule set update error:', error);
    return NextResponse.json({ error: 'Failed to update rule set' }, { status: 500 });
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

    // Check if it's the default rule set
    const checkResult = await pool.query(
      `SELECT is_default FROM glamping_rule_sets WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Rule set not found' }, { status: 404 });
    }

    if (checkResult.rows[0].is_default) {
      return NextResponse.json({ error: 'Cannot delete default rule set' }, { status: 400 });
    }

    // Check if rule set is being used by discounts or events
    const usageCheck = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM glamping_discounts WHERE rules_id = $1) as discount_count,
        (SELECT COUNT(*) FROM glamping_item_events WHERE rules_id = $1) as event_count`,
      [id]
    );

    const usage = usageCheck.rows[0];
    if (parseInt(usage.discount_count) > 0 || parseInt(usage.event_count) > 0) {
      return NextResponse.json({
        error: 'Cannot delete rule set that is in use by discounts or events'
      }, { status: 400 });
    }

    // Delete the rule set (rules will be deleted by CASCADE)
    const result = await pool.query(
      `DELETE FROM glamping_rule_sets WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Rule set not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Rule set deleted successfully'
    });

  } catch (error) {
    console.error('Rule set deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete rule set' }, { status: 500 });
  }
}
