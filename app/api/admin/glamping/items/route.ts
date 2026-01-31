import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAccessibleGlampingZoneIds, canAccessGlampingZone } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get accessible zone IDs (null = all, [] = none)
    const accessibleZoneIds = getAccessibleGlampingZoneIds(session);

    // Get filters from query params
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get('zone_id');
    const categoryId = searchParams.get('category_id');
    const sku = searchParams.get('sku');

    let query = `
      SELECT
        i.id,
        i.name,
        i.sku,
        i.zone_id,
        i.category_id,
        c.name as category_name,
        z.name->>'vi' as zone_name,
        COALESCE(a.inventory_quantity, 1) as inventory_quantity,
        COALESCE(a.unlimited_inventory, false) as unlimited_inventory,
        COALESCE(a.default_calendar_status, 'available') as status,
        COALESCE(a.is_active, true) as is_active,
        a.visibility,
        a.allocation_type,
        (SELECT url FROM glamping_item_media WHERE item_id = i.id AND type = 'image' ORDER BY display_order ASC, created_at ASC LIMIT 1) as image_url,
        (SELECT MIN(amount) FROM glamping_pricing WHERE item_id = i.id AND event_id IS NULL AND amount > 0) as base_price,
        (SELECT COUNT(DISTINCT gb.id)::int FROM glamping_bookings gb
          JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
          WHERE gbi.item_id = i.id AND gb.status IN ('confirmed', 'checked_in')
        ) as active_bookings,
        COALESCE(ds.type, 'system_default') as deposit_type,
        COALESCE(ds.amount, 0) as deposit_value
      FROM glamping_items i
      LEFT JOIN glamping_categories c ON i.category_id = c.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
      LEFT JOIN glamping_deposit_settings ds ON i.id = ds.item_id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Filter by accessible zones for glamping_owner (before other filters)
    if (accessibleZoneIds !== null) {
      if (accessibleZoneIds.length === 0) {
        // No zones assigned - return empty
        return NextResponse.json({ items: [] });
      }
      conditions.push(`i.zone_id = ANY($${params.length + 1}::uuid[])`);
      params.push(accessibleZoneIds);
    }

    // Filter by zone_id if provided (skip if "all")
    if (zoneId && zoneId !== 'all') {
      // Validate zone access first
      if (accessibleZoneIds !== null && !accessibleZoneIds.includes(zoneId)) {
        return NextResponse.json(
          { error: 'You do not have access to this zone' },
          { status: 403 }
        );
      }
      conditions.push(`i.zone_id = $${params.length + 1}`);
      params.push(zoneId);
    }

    // Filter by category_id if provided
    if (categoryId) {
      conditions.push(`i.category_id = $${params.length + 1}`);
      params.push(categoryId);
    }

    // Filter by SKU if provided (for uniqueness check)
    if (sku) {
      conditions.push(`i.sku = $${params.length + 1}`);
      params.push(sku);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY i.created_at DESC';

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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      sku,
      zone_id,
      category_id,
      summary,
      inventory_quantity,
      unlimited_inventory,
      allocation_type,
      visibility,
      default_calendar_status,
      tags,
      parameters,
      // New fields for Phase 6.3
      images,
      youtube_url,
      video_start_time,
      pricing_rate,
      group_pricing,
      parameter_base_prices,
      event_pricing,
      deposit_type,
      deposit_value,
      menu_products,
      // Allocation fields
      fixed_length_value,
      fixed_length_unit,
      fixed_start_time,
      default_length_hours,
      timeslots,
      // Tax fields
      taxes,
      // Active status
      is_active,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!zone_id || zone_id === 'all') {
      return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
    }

    // Validate zone access for glamping_owner
    if (!canAccessGlampingZone(session, zone_id)) {
      return NextResponse.json(
        { error: 'You do not have access to this zone' },
        { status: 403 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert item
      const itemResult = await client.query(
        `INSERT INTO glamping_items (name, sku, zone_id, category_id, summary)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [name, sku || null, zone_id, category_id || null, summary || null]
      );

      const itemId = itemResult.rows[0].id;

      // Insert item attributes
      await client.query(
        `INSERT INTO glamping_item_attributes (
          item_id,
          inventory_quantity,
          unlimited_inventory,
          allocation_type,
          fixed_length_value,
          fixed_length_unit,
          fixed_start_time,
          default_length_hours,
          visibility,
          default_calendar_status,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          itemId,
          unlimited_inventory ? 0 : (inventory_quantity || 1),
          unlimited_inventory || false,
          allocation_type || 'per_night',
          fixed_length_value || null,
          fixed_length_unit || null,
          fixed_start_time || null,
          default_length_hours || null,
          visibility || 'everyone',
          default_calendar_status || 'available',
          is_active !== undefined ? is_active : true
        ]
      );

      // Insert tags if provided
      if (tags && tags.length > 0) {
        for (const tagId of tags) {
          await client.query(
            'INSERT INTO glamping_item_tags (item_id, tag_id) VALUES ($1, $2)',
            [itemId, tagId]
          );
        }
      }

      // Insert parameters if provided
      if (parameters && parameters.length > 0) {
        for (const param of parameters) {
          await client.query(
            `INSERT INTO glamping_item_parameters (
              item_id, parameter_id, min_quantity, max_quantity, display_order
            ) VALUES ($1, $2, $3, $4, $5)`,
            [itemId, param.parameter_id, param.min_quantity, param.max_quantity, param.display_order]
          );
        }
      }

      // Insert media (images) if provided
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          await client.query(
            `INSERT INTO glamping_item_media (
              item_id, type, url, caption, display_order
            ) VALUES ($1, $2, $3, $4, $5)`,
            [itemId, 'image', img.url, img.caption || '', i]
          );
        }
      }

      // Insert YouTube URL if provided
      if (youtube_url) {
        try {
          await client.query(
            `INSERT INTO glamping_item_media (
              item_id, type, url, display_order, video_start_time
            ) VALUES ($1, $2, $3, $4, $5)`,
            [itemId, 'youtube', youtube_url, 999, video_start_time || 0]
          );
        } catch {
          // Fallback if video_start_time column doesn't exist yet
          await client.query(
            `INSERT INTO glamping_item_media (
              item_id, type, url, display_order
            ) VALUES ($1, $2, $3, $4)`,
            [itemId, 'youtube', youtube_url, 999]
          );
        }
      }

      // Insert pricing data if provided
      if (group_pricing && typeof group_pricing === 'object') {
        for (const [key, groups] of Object.entries(group_pricing)) {
          const paramId = key === 'inventory' ? null : key;

          if (Array.isArray(groups)) {
            for (const group of groups) {
              await client.query(
                `INSERT INTO glamping_pricing (
                  item_id, parameter_id, rate_type, group_min, group_max, amount
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  itemId,
                  paramId,
                  pricing_rate || 'per_night',
                  group.min,
                  group.max,
                  group.price
                ]
              );
            }
          }
        }
      }

      // Insert parameter base prices if provided
      if (parameter_base_prices && typeof parameter_base_prices === 'object') {
        for (const [paramId, price] of Object.entries(parameter_base_prices)) {
          // Allow 0 for free pricing
          if (price !== undefined && price !== null && typeof price === 'number') {
            await client.query(
              `INSERT INTO glamping_pricing (
                item_id, parameter_id, rate_type, group_min, group_max, amount
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                itemId,
                paramId,
                pricing_rate || 'per_night',
                null,  // No group for base prices
                null,  // No group for base prices
                price
              ]
            );
          }
        }
      }

      // Insert event pricing if provided
      if (event_pricing && typeof event_pricing === 'object') {
        for (const [eventId, eventData] of Object.entries(event_pricing)) {
          // SKIP TEMP EVENTS - they don't exist in database yet!
          // Temp events will be created later and their pricing will be inserted separately
          if (eventId.startsWith('temp_')) continue;

          const typedEventData = eventData as any;
          // Insert inventory price for event - allow 0 for free pricing
          if (typedEventData.inventory && typedEventData.inventory.amount !== undefined && typedEventData.inventory.amount !== null) {
            await client.query(
              `INSERT INTO glamping_pricing (
                item_id, parameter_id, event_id, rate_type, group_min, group_max, amount
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                itemId,
                null,  // Inventory has null parameter_id
                eventId,
                pricing_rate || 'per_night',
                null,
                null,
                typedEventData.inventory.amount
              ]
            );
          }

          // Insert parameter prices for event
          if (typedEventData.parameters && typeof typedEventData.parameters === 'object') {
            for (const [paramId, paramData] of Object.entries(typedEventData.parameters)) {
              const typedParamData = paramData as any;
              // Insert base parameter price for event - allow 0 for free pricing
              if (typedParamData.amount !== undefined && typedParamData.amount !== null) {
                await client.query(
                  `INSERT INTO glamping_pricing (
                    item_id, parameter_id, event_id, rate_type, group_min, group_max, amount
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    itemId,
                    paramId,
                    eventId,
                    pricing_rate || 'per_night',
                    null,
                    null,
                    typedParamData.amount
                  ]
                );
              }

              // Insert group pricing for parameter in event - allow 0 for free pricing
              if (typedParamData.groups && Array.isArray(typedParamData.groups)) {
                for (const group of typedParamData.groups) {
                  if (group && group.price !== undefined && group.price !== null) {
                    await client.query(
                      `INSERT INTO glamping_pricing (
                        item_id, parameter_id, event_id, rate_type, group_min, group_max, amount
                      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                      [
                        itemId,
                        paramId,
                        eventId,
                        pricing_rate || 'per_night',
                        group.min,
                        group.max,
                        group.price
                      ]
                    );
                  }
                }
              }
            }
          }

          // Insert group pricing for inventory in event - allow 0 for free pricing
          if (typedEventData.groupPricing && typedEventData.groupPricing.inventory && Array.isArray(typedEventData.groupPricing.inventory)) {
            for (const group of typedEventData.groupPricing.inventory) {
              if (group && group.price !== undefined && group.price !== null) {
                await client.query(
                  `INSERT INTO glamping_pricing (
                    item_id, parameter_id, event_id, rate_type, group_min, group_max, amount
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    itemId,
                    null,  // Inventory has null parameter_id
                    eventId,
                    pricing_rate || 'per_night',
                    group.min,
                    group.max,
                    group.price
                  ]
                );
              }
            }
          }
        }
      }

      // Insert deposit settings if provided
      if (deposit_type && deposit_type !== 'system_default') {
        await client.query(
          `INSERT INTO glamping_deposit_settings (
            item_id, type, amount
          ) VALUES ($1, $2, $3)`,
          [itemId, deposit_type, deposit_value || 50]
        );
      }

      // Insert menu products (food/beverages) if provided
      if (menu_products && menu_products.length > 0) {
        for (let i = 0; i < menu_products.length; i++) {
          const mp = menu_products[i];
          await client.query(
            `INSERT INTO glamping_item_menu_products (
              item_id, menu_item_id, is_required, display_order
            ) VALUES ($1, $2, $3, $4)`,
            [
              itemId,
              mp.menu_item_id,
              mp.opt_in === 'required',
              i
            ]
          );
        }
      }

      // Insert timeslots if allocation type is 'timeslots'
      if (allocation_type === 'timeslots' && timeslots && timeslots.length > 0) {
        for (const slot of timeslots) {
          await client.query(
            `INSERT INTO glamping_timeslots (
              item_id, start_time, end_time, days_of_week
            ) VALUES ($1, $2, $3, $4)`,
            [itemId, slot.start_time, slot.end_time, slot.days_of_week]
          );
        }
      }

      // Insert taxes if provided
      if (taxes && Array.isArray(taxes) && taxes.length > 0) {
        for (const tax of taxes) {
          // Check if tax already exists by name
          const existingTax = await client.query(
            'SELECT id FROM glamping_taxes WHERE name = $1',
            [tax.name]
          );

          let taxId;
          if (existingTax.rows.length > 0) {
            // Use existing tax
            taxId = existingTax.rows[0].id;
          } else {
            // Create new tax
            const newTax = await client.query(
              `INSERT INTO glamping_taxes (
                name, type, apply_to, amount, is_percentage, status
              ) VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id`,
              [
                tax.name,
                'normal', // Default type
                tax.apply_to || 'all_customers',
                tax.amount,
                tax.amount_type === 'percent', // Convert to boolean
                true // Default status
              ]
            );
            taxId = newTax.rows[0].id;
          }

          // Link tax to item
          await client.query(
            'INSERT INTO glamping_item_taxes (item_id, tax_id) VALUES ($1, $2)',
            [itemId, taxId]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        id: itemId
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Item creation error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
