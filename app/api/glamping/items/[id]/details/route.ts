import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;

    // Fetch item with zone and category info
    const itemQuery = `
      SELECT
        i.*,
        z.id as zone_id,
        z.name as zone_name,
        z.address as zone_address,
        z.city as zone_city,
        z.province as zone_province,
        c.id as category_id,
        c.name as category_name
      FROM glamping_items i
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      LEFT JOIN glamping_categories c ON i.category_id = c.id
      WHERE i.id = $1
    `;

    const itemResult = await pool.query(itemQuery, [itemId]);

    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const itemRow = itemResult.rows[0];

    // Fetch parameters (only visible to everyone)
    const parametersQuery = `
      SELECT
        ip.id,
        p.id as parameter_id,
        p.name as parameter_name,
        p.color_code,
        p.controls_inventory,
        p.sets_pricing,
        p.counted_for_menu,
        ip.display_order,
        ip.min_quantity,
        ip.max_quantity
      FROM glamping_item_parameters ip
      LEFT JOIN glamping_parameters p ON ip.parameter_id = p.id
      WHERE ip.item_id = $1
        AND p.visibility = 'everyone'
      ORDER BY ip.display_order, p.name
    `;

    const parametersResult = await pool.query(parametersQuery, [itemId]);

    // Fetch tags
    const tagsQuery = `
      SELECT
        t.id as tag_id,
        t.name as tag_name
      FROM glamping_item_tags it
      LEFT JOIN glamping_tags t ON it.tag_id = t.id
      WHERE it.item_id = $1
    `;

    const tagsResult = await pool.query(tagsQuery, [itemId]);

    // Fetch media
    const mediaQuery = `
      SELECT *
      FROM glamping_item_media
      WHERE item_id = $1
      ORDER BY display_order
    `;

    const mediaResult = await pool.query(mediaQuery, [itemId]);

    // Format images
    const images = mediaResult.rows
      .filter((m) => m.type === 'image')
      .map((m) => ({
        url: m.url,
        caption: m.caption || '',
        display_order: m.display_order,
      }));

    // Format response
    const response = {
      item: {
        id: itemRow.id,
        name: itemRow.name,
        sku: itemRow.sku,
        summary: itemRow.summary,
        category_name: itemRow.category_name || '',
        zone_id: itemRow.zone_id,
        zone_name: itemRow.zone_name || { vi: '', en: '' },
        zone_city: itemRow.zone_city || '',
        zone_province: itemRow.zone_province || '',
        zone_address: itemRow.zone_address || '',
        max_guests: 2, // Default
        inventory_quantity: itemRow.inventory_quantity || 1,
        unlimited_inventory: itemRow.unlimited_inventory || false,
        status: itemRow.status || 'active',
        base_price: parseFloat(itemRow.base_price || 0),
        extra_adult_price: 0, // Add if you have this field
        extra_child_price: 0, // Add if you have this field
      },
      parameters: parametersResult.rows.map((p) => ({
        id: p.parameter_id || '',
        parameter_id: p.parameter_id || '',
        name: p.parameter_name || '',
        color_code: p.color_code || '',
        controls_inventory: p.controls_inventory || false,
        sets_pricing: p.sets_pricing || false,
        counted_for_menu: p.counted_for_menu || false,
        min_quantity: p.min_quantity,
        max_quantity: p.max_quantity,
      })),
      tags: tagsResult.rows.map((t) => ({
        id: t.tag_id || '',
        name: t.tag_name || '',
      })),
      images,
      media: mediaResult.rows,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in item details API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
