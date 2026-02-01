import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Get single glamping zone (public endpoint)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let { id } = await params;

    // Strip "zone-" prefix if present for backward compatibility
    if (id.startsWith('zone-')) {
      id = id.replace('zone-', '');
    }

    // Get zone details
    const zoneQuery = `
      SELECT
        z.id,
        z.name,
        z.description,
        z.address,
        z.city,
        z.province,
        z.latitude,
        z.longitude,
        z.is_featured,
        z.cancellation_policy,
        z.house_rules,
        z.deposit_type,
        z.deposit_value,
        COALESCE(z.enable_single_person_surcharge_alert, false) as enable_single_person_surcharge_alert,
        COALESCE(z.single_person_surcharge_alert_text, '{"vi": "Số tiền đã bao gồm phụ thu 1 người", "en": "Price includes single person surcharge"}'::jsonb) as single_person_surcharge_alert_text,
        COUNT(DISTINCT i.id) as items_count
      FROM glamping_zones z
      LEFT JOIN glamping_items i ON i.zone_id = z.id
      WHERE z.id = $1 AND z.is_active = true
      GROUP BY z.id, z.cancellation_policy, z.house_rules, z.deposit_type, z.deposit_value, z.enable_single_person_surcharge_alert, z.single_person_surcharge_alert_text
    `;

    const { rows: zoneRows } = await pool.query(zoneQuery, [id]);

    if (zoneRows.length === 0) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    // Get zone images
    const imagesQuery = `
      SELECT image_url, is_featured, display_order
      FROM glamping_zone_images
      WHERE zone_id = $1
      ORDER BY display_order ASC, created_at ASC
    `;

    const { rows: images } = await pool.query(imagesQuery, [id]);

    const zone = {
      ...zoneRows[0],
      images: images.map(img => img.image_url),
    };

    return NextResponse.json({ zone });
  } catch (error) {
    console.error('Error fetching glamping zone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zone' },
      { status: 500 }
    );
  }
}
