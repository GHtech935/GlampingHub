import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { GLAMPING_EMAIL_TEMPLATES } from '@/lib/glamping-email-templates-html';

// GET - List all glamping automation rules
export async function GET(request: NextRequest) {
  try {
    // Check if glamping_email_automation_rules table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'glamping_email_automation_rules'
      );
    `);

    if (!tableCheckResult.rows[0].exists) {
      // Table doesn't exist, return empty array
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Glamping automation rules table not yet created. Migration needed.'
      });
    }

    const result = await pool.query(
      `
      SELECT
        ear.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM glamping_email_automation_rules ear
      LEFT JOIN users u ON ear.created_by = u.id
      ORDER BY ear.created_at DESC
      `
    );

    // Map template_name from GLAMPING_EMAIL_TEMPLATES constant
    const rulesWithTemplateName = result.rows.map(rule => {
      const template = rule.template_slug ? GLAMPING_EMAIL_TEMPLATES[rule.template_slug] : null;
      return {
        ...rule,
        template_name: template?.name || rule.template_slug || 'Unknown',
        template_subject: template?.subject || '',
      };
    });

    return NextResponse.json({
      success: true,
      data: rulesWithTemplateName
    });

  } catch (error: any) {
    console.error('Error fetching glamping automation rules:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch glamping automation rules',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST - Create new glamping automation rule
export async function POST(request: NextRequest) {
  try {
    // Check if glamping_email_automation_rules table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'glamping_email_automation_rules'
      );
    `);

    if (!tableCheckResult.rows[0].exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Glamping automation rules table not yet created. Please run the migration first.'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      template_slug,
      trigger_event,
      trigger_timing,
      trigger_offset_days,
      trigger_offset_hours,
      trigger_time,
      trigger_conditions,
      is_active
    } = body;

    // Validate required fields
    if (!name || !template_slug || !trigger_event || !trigger_timing) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate template_slug exists in GLAMPING_EMAIL_TEMPLATES
    if (!GLAMPING_EMAIL_TEMPLATES[template_slug]) {
      return NextResponse.json(
        { success: false, error: `Invalid template_slug: ${template_slug}` },
        { status: 400 }
      );
    }

    // Insert rule
    const result = await pool.query(
      `
      INSERT INTO glamping_email_automation_rules (
        name, description, template_slug, trigger_event, trigger_timing,
        trigger_offset_days, trigger_offset_hours, trigger_time,
        trigger_conditions, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        name,
        description || null,
        template_slug,
        trigger_event,
        trigger_timing,
        trigger_offset_days || 0,
        trigger_offset_hours || 0,
        trigger_time || null,
        JSON.stringify(trigger_conditions || {}),
        is_active !== undefined ? is_active : true
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Glamping automation rule created successfully'
    });

  } catch (error: any) {
    console.error('Error creating glamping automation rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create glamping automation rule',
        details: error.message
      },
      { status: 500 }
    );
  }
}
