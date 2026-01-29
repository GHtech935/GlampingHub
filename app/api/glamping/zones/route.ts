import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch all active glamping zones with id, name, province, description, and images
    const query = `
      SELECT
        z.id,
        z.name,
        z.province,
        z.description,
        z.id::text as slug,
        COALESCE(
          (SELECT json_agg(image_url ORDER BY display_order ASC, created_at ASC)
           FROM glamping_zone_images
           WHERE zone_id = z.id),
          '[]'::json
        ) as images
      FROM glamping_zones z
      WHERE z.is_active = true
      ORDER BY z.is_featured DESC, z.name->>'vi'
    `;

    const { rows: zones } = await pool.query(query);

    return NextResponse.json(zones || []);
  } catch (error) {
    console.error('Error in glamping zones API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
