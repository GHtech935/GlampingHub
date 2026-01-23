import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { EMAIL_TEMPLATES } from '@/lib/email-templates-html';

// GET - List email logs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('bookingId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query email_logs without joining email_templates table
    let query = `
      SELECT
        el.*,
        b.booking_reference
      FROM email_logs el
      LEFT JOIN bookings b ON el.booking_id = b.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (bookingId) {
      query += ` AND el.booking_id = $${paramIndex}`;
      params.push(bookingId);
      paramIndex++;
    }

    if (status && status !== 'all') {
      query += ` AND el.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY el.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM email_logs el WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (bookingId) {
      countQuery += ` AND el.booking_id = $${countParamIndex}`;
      countParams.push(bookingId);
      countParamIndex++;
    }

    if (status && status !== 'all') {
      countQuery += ` AND el.status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Map template_name from metadata or EMAIL_TEMPLATES constant
    const logsWithTemplateName = result.rows.map(log => {
      // Try to get template_slug from metadata
      let templateSlug = null;
      if (log.metadata) {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        templateSlug = metadata.template_slug;
      }

      // Get template name from EMAIL_TEMPLATES if slug is available
      const templateName = templateSlug && EMAIL_TEMPLATES[templateSlug]
        ? EMAIL_TEMPLATES[templateSlug].name
        : templateSlug || 'Unknown';

      return {
        ...log,
        template_name: templateName,
      };
    });

    return NextResponse.json({
      success: true,
      data: logsWithTemplateName,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch email logs',
        details: error.message
      },
      { status: 500 }
    );
  }
}
