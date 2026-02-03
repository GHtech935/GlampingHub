import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Get glamping categories (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let zoneId = searchParams.get('zone_id');

    // Strip "zone-" prefix if present for backward compatibility
    if (zoneId && zoneId.startsWith('zone-')) {
      zoneId = zoneId.replace('zone-', '');
    }

    let query = `
      SELECT c.id, c.name, c.zone_id, c.weight, c.status
      FROM glamping_categories c
      JOIN glamping_zones z ON z.id = c.zone_id
      WHERE z.is_active = true AND c.status = 'active' AND c.is_tent_category = true
    `;

    const params: any[] = [];

    // Filter by zone_id if provided
    if (zoneId && zoneId !== 'all') {
      params.push(zoneId);
      query += ` AND c.zone_id = $${params.length}`;
    }

    query += ' ORDER BY c.weight DESC, c.name ASC';

    const result = await pool.query(query, params);

    return NextResponse.json({ categories: result.rows });
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
