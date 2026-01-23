import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { GLAMPING_EMAIL_TEMPLATES } from '@/lib/glamping-email-templates-html';

// GET - List glamping email logs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('bookingId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query email_logs for glamping bookings
    // Note: This requires glamping_booking_id column in email_logs table
    // If column doesn't exist yet, this will return empty results
    let query = `
      SELECT
        el.*,
        gb.booking_code as booking_reference
      FROM email_logs el
      LEFT JOIN glamping_bookings gb ON el.glamping_booking_id = gb.id
      WHERE el.glamping_booking_id IS NOT NULL
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (bookingId) {
      query += ` AND el.glamping_booking_id = $${paramIndex}`;
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

    let result;
    try {
      result = await pool.query(query, params);
    } catch (dbError: any) {
      // If glamping_booking_id column doesn't exist, return empty array
      if (dbError.message?.includes('glamping_booking_id')) {
        console.warn('glamping_booking_id column not found in email_logs table. Returning empty results.');
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false
          },
          note: 'Email logging for glamping bookings not yet configured. Migration needed.'
        });
      }
      throw dbError;
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM email_logs el WHERE el.glamping_booking_id IS NOT NULL';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (bookingId) {
      countQuery += ` AND el.glamping_booking_id = $${countParamIndex}`;
      countParams.push(bookingId);
      countParamIndex++;
    }

    if (status && status !== 'all') {
      countQuery += ` AND el.status = $${countParamIndex}`;
      countParams.push(status);
    }

    let totalCount = 0;
    try {
      const countResult = await pool.query(countQuery, countParams);
      totalCount = parseInt(countResult.rows[0].count);
    } catch (countError) {
      // If error, use result length as fallback
      totalCount = result.rows.length;
    }

    // Map template_name from metadata or GLAMPING_EMAIL_TEMPLATES constant
    const logsWithTemplateName = result.rows.map(log => {
      // Try to get template_slug from metadata
      let templateSlug = null;
      if (log.metadata) {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        templateSlug = metadata.template_slug;
      }

      // Get template name from GLAMPING_EMAIL_TEMPLATES if slug is available
      const templateName = templateSlug && GLAMPING_EMAIL_TEMPLATES[templateSlug]
        ? GLAMPING_EMAIL_TEMPLATES[templateSlug].name
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
    console.error('Error fetching glamping email logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch glamping email logs',
        details: error.message
      },
      { status: 500 }
    );
  }
}
