import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { GLAMPING_EMAIL_TEMPLATES } from '@/lib/glamping-email-templates-html';

// PUT - Update glamping automation rule
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    // Validate template_slug if provided
    if (template_slug && !GLAMPING_EMAIL_TEMPLATES[template_slug]) {
      return NextResponse.json(
        { success: false, error: `Invalid template_slug: ${template_slug}` },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE glamping_email_automation_rules
      SET
        name = $1,
        description = $2,
        template_slug = $3,
        trigger_event = $4,
        trigger_timing = $5,
        trigger_offset_days = $6,
        trigger_offset_hours = $7,
        trigger_time = $8,
        trigger_conditions = $9,
        is_active = $10,
        updated_at = NOW()
      WHERE id = $11
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
        is_active,
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Glamping automation rule updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating glamping automation rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update glamping automation rule',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete glamping automation rule
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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
          error: 'Glamping automation rules table not yet created.'
        },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM glamping_email_automation_rules WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Glamping automation rule deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting glamping automation rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete glamping automation rule',
        details: error.message
      },
      { status: 500 }
    );
  }
}
