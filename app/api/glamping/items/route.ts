import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Get glamping items (public endpoint with zone filter)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let zoneId = searchParams.get('zone_id');
    const categoryId = searchParams.get('category_id');

    // Strip "zone-" prefix if present for backward compatibility
    if (zoneId && zoneId.startsWith('zone-')) {
      zoneId = zoneId.replace('zone-', '');
    }

    let query = `
      SELECT
        i.id,
        i.name,
        i.sku,
        i.zone_id,
        i.category_id,
        i.summary,
        i.display_order,
        c.name as category_name,
        z.name as zone_name,
        COALESCE(a.inventory_quantity, 1) as inventory_quantity,
        COALESCE(a.unlimited_inventory, false) as unlimited_inventory,
        COALESCE(a.default_calendar_status, 'available') as status
      FROM glamping_items i
      LEFT JOIN glamping_categories c ON i.category_id = c.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
      WHERE z.is_active = true
        AND COALESCE(a.is_active, true) = true
        AND COALESCE(c.is_tent_category, true) = true
    `;

    const params: any[] = [];

    // Filter by zone_id if provided
    if (zoneId && zoneId !== 'all') {
      params.push(zoneId);
      query += ` AND i.zone_id = $${params.length}`;
    }

    // Filter by category_id if provided
    if (categoryId && categoryId !== 'all') {
      params.push(categoryId);
      query += ` AND i.category_id = $${params.length}`;
    }

    query += ' ORDER BY COALESCE(i.display_order, 999999) ASC, i.created_at DESC';

    const result = await pool.query(query, params);

    // Handle unlimited inventory display
    const items = result.rows.map(item => ({
      ...item,
      inventory_quantity: item.unlimited_inventory ? -1 : item.inventory_quantity
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Items fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}
