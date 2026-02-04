import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

// Deposit type mapping functions
function mapDepositTypeToDb(formType: string): string {
  const mapping: Record<string, string> = {
    'custom_percentage': 'percentage',
    'fixed_amount': 'fixed',
    'per_hour': 'per_hour',
    'per_qty': 'per_quantity'
  };
  return mapping[formType] || formType;
}

function mapDepositTypeFromDb(dbType: string): string {
  const reverseMapping: Record<string, string> = {
    'percentage': 'custom_percentage',
    'fixed': 'fixed_amount',
    'per_hour': 'per_hour',
    'per_quantity': 'per_qty'
  };
  return reverseMapping[dbType] || 'system_default';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params before using (Next.js 15 requirement)
    const { id } = await params;

    // Get item with all relationships
    const itemResult = await pool.query(`
      SELECT
        i.id,
        i.name,
        i.sku,
        i.category_id,
        i.summary,
        i.created_at,
        i.updated_at,
        COALESCE(i.display_order, 0) as display_order,
        c.name as category_name,
        a.inventory_quantity,
        a.unlimited_inventory,
        a.allocation_type,
        a.fixed_length_value,
        a.fixed_length_unit,
        a.fixed_start_time,
        a.default_length_hours,
        a.visibility,
        a.default_calendar_status,
        COALESCE(a.is_active, true) as is_active
      FROM glamping_items i
      LEFT JOIN glamping_categories c ON i.category_id = c.id
      LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
      WHERE i.id = $1
    `, [id]);

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = itemResult.rows[0];

    // Get tags
    const tagsResult = await pool.query(`
      SELECT t.id, t.name
      FROM glamping_tags t
      INNER JOIN glamping_item_tags it ON t.id = it.tag_id
      WHERE it.item_id = $1
      ORDER BY t.name
    `, [id]);

    // Get parameters
    const parametersResult = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.color_code,
        p.controls_inventory,
        p.visibility,
        ip.min_quantity,
        ip.max_quantity,
        ip.display_order
      FROM glamping_parameters p
      INNER JOIN glamping_item_parameters ip ON p.id = ip.parameter_id
      WHERE ip.item_id = $1
      ORDER BY ip.display_order, p.name
    `, [id]);

    // Get media
    const mediaResult = await pool.query(`
      SELECT id, type, url, thumbnail_url, display_order, caption
      FROM glamping_item_media
      WHERE item_id = $1
      ORDER BY display_order
    `, [id]);

    // Get YouTube URL from media
    let youtubeResult;
    try {
      youtubeResult = await pool.query(`
        SELECT url, video_start_time
        FROM glamping_item_media
        WHERE item_id = $1 AND type = 'youtube'
        LIMIT 1
      `, [id]);
    } catch {
      // Fallback if video_start_time column doesn't exist yet
      youtubeResult = await pool.query(`
        SELECT url
        FROM glamping_item_media
        WHERE item_id = $1 AND type = 'youtube'
        LIMIT 1
      `, [id]);
    }

    // Get pricing rows
    const pricingResult = await pool.query(`
      SELECT
        rate_type,
        parameter_id,
        event_id,
        group_min,
        group_max,
        amount,
        COALESCE(pricing_mode, 'per_person') as pricing_mode
      FROM glamping_pricing
      WHERE item_id = $1
      ORDER BY event_id NULLS FIRST, parameter_id, group_min
    `, [id]);

    // Get deposit settings
    const depositResult = await pool.query(`
      SELECT type, amount
      FROM glamping_deposit_settings
      WHERE item_id = $1
    `, [id]);

    // Get menu products (food/beverages)
    const menuProductsResult = await pool.query(`
      SELECT
        mp.menu_item_id,
        mi.name as menu_item_name,
        mi.price as menu_item_price,
        mi.unit as menu_item_unit,
        mp.is_required,
        mp.display_order
      FROM glamping_item_menu_products mp
      LEFT JOIN glamping_menu_items mi ON mp.menu_item_id = mi.id
      WHERE mp.item_id = $1
      ORDER BY mp.display_order
    `, [id]);

    // Get item add-ons (package items)
    const addonsResult = await pool.query(`
      SELECT
        a.addon_item_id as item_id,
        i.name as item_name,
        i.sku as item_sku,
        a.price_percentage,
        a.is_required,
        a.display_order,
        a.dates_setting,
        a.custom_start_date,
        a.custom_end_date
      FROM glamping_item_addons a
      LEFT JOIN glamping_items i ON a.addon_item_id = i.id
      WHERE a.item_id = $1
      ORDER BY a.display_order
    `, [id]);

    // Get package settings
    const packageSettingsResult = await pool.query(`
      SELECT show_starting_price
      FROM glamping_package_settings
      WHERE item_id = $1
    `, [id]);

    // Get timeslots
    const timeslotsResult = await pool.query(`
      SELECT start_time, end_time, days_of_week
      FROM glamping_timeslots
      WHERE item_id = $1
      ORDER BY start_time
    `, [id]);

    // Fetch taxes
    const taxesResult = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.amount,
        t.is_percentage,
        t.apply_to,
        t.type
      FROM glamping_taxes t
      INNER JOIN glamping_item_taxes it ON t.id = it.tax_id
      WHERE it.item_id = $1
    `, [id]);

    // Transform to UI format
    const taxes = taxesResult.rows.map(tax => ({
      id: tax.id,
      name: tax.name,
      amount: parseFloat(tax.amount),
      amount_type: tax.is_percentage ? 'percent' : 'fixed',
      account_number: '', // Not stored in DB
      apply_to: tax.apply_to,
      is_compound: false, // Not stored in DB
      is_inclusive: false, // Not stored in DB
      is_inclusive_hidden: false, // Not stored in DB
      apply_by_default: true, // Assume true for linked taxes
      selected_items: [], // Not needed for item-specific taxes
      enabled: true // Always true for linked taxes
    }));

    // Fetch events attached to this item with pricing configuration
    const eventsResult = await pool.query(`
      SELECT
        e.id,
        e.name,
        e.type,
        e.start_date,
        e.end_date,
        e.recurrence,
        e.days_of_week,
        e.pricing_type,
        e.status,
        e.dynamic_pricing_value,
        e.dynamic_pricing_mode,
        e.yield_thresholds
      FROM glamping_item_events e
      INNER JOIN glamping_item_event_items ei ON e.id = ei.event_id
      WHERE ei.item_id = $1
      ORDER BY e.start_date
    `, [id]);

    // Transform to frontend format
    const events = eventsResult.rows.map(event => ({
      id: event.id,
      name: event.name,
      type: event.type,
      start_date: event.start_date,
      end_date: event.end_date,
      recurrence: event.recurrence,
      days_of_week: event.days_of_week,
      pricing_type: event.pricing_type,
      status: event.status,
      dynamic_pricing_value: event.dynamic_pricing_value,
      dynamic_pricing_mode: event.dynamic_pricing_mode,
      yield_thresholds: event.yield_thresholds
    }));

    // Transform pricing rows into group pricing structure
    const transformGroupPricing = (pricingRows: any[]) => {
      const grouped: Record<string, Array<{min: number; max: number; price: number; pricing_mode: string}>> = {};

      pricingRows.forEach(row => {
        // Explicit null check - allow 0 as valid value
        if (row.group_min !== null && row.group_min !== undefined &&
            row.group_max !== null && row.group_max !== undefined) {
          const key = row.parameter_id || 'inventory';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            min: row.group_min,
            max: row.group_max,
            price: parseFloat(row.amount),
            pricing_mode: row.pricing_mode || 'per_person'
          });
        }
      });

      return grouped;
    };

    // Extract parameter base prices (rows with NULL group_min/group_max)
    // Also ensure parameters with groups have a base price entry (default to 0)
    const transformParameterBasePrices = (pricingRows: any[], groupPricingData: Record<string, any[]>) => {
      const basePrices: Record<string, number> = {};

      pricingRows.forEach(row => {
        // Base prices have NULL group_min and group_max
        if ((row.group_min === null || row.group_min === undefined) &&
            (row.group_max === null || row.group_max === undefined) &&
            row.parameter_id) {
          basePrices[row.parameter_id] = parseFloat(row.amount);
        }
      });

      // Ensure parameters with group pricing have a base price entry (default to 0)
      // This fixes the bug where parameters with basePrice=0 and groups don't show in PricingTable
      Object.keys(groupPricingData).forEach(paramId => {
        if (paramId !== 'inventory' && !(paramId in basePrices)) {
          basePrices[paramId] = 0;
        }
      });

      return basePrices;
    };

    // Extract base price for inventory with fallback logic
    const getInventoryBasePrice = (pricingRows: any[]) => {
      // Debug log
      console.log('Pricing rows for item:', item.name, pricingRows);

      if (pricingRows.length === 0) return 0;

      // 1. Try to find pure base price (parameter_id=NULL, group=NULL)
      const pureBaseRow = pricingRows.find(row =>
        (row.parameter_id === null || row.parameter_id === undefined) &&
        (row.group_min === null || row.group_min === undefined) &&
        (row.group_max === null || row.group_max === undefined)
      );
      if (pureBaseRow) return parseFloat(pureBaseRow.amount);

      // 2. Fallback: Find base price for inventory with groups (parameter_id=NULL, has group)
      const inventoryGroupRows = pricingRows.filter(row =>
        (row.parameter_id === null || row.parameter_id === undefined) &&
        (row.group_min !== null || row.group_max !== null)
      );
      if (inventoryGroupRows.length > 0) {
        // Return the minimum price from group pricing
        return Math.min(...inventoryGroupRows.map(r => parseFloat(r.amount)));
      }

      // 3. Fallback: Find any base price without groups
      const anyBaseRow = pricingRows.find(row =>
        (row.group_min === null || row.group_min === undefined) &&
        (row.group_max === null || row.group_max === undefined)
      );
      if (anyBaseRow) return parseFloat(anyBaseRow.amount);

      // 4. Last resort: return minimum price from all pricing
      const allPrices = pricingRows.map(r => parseFloat(r.amount)).filter(p => p > 0);
      return allPrices.length > 0 ? Math.min(...allPrices) : 0;
    };

    // Transform pricing with event separation
    const transformPricingWithEvents = (pricingRows: any[]) => {
      const eventPricing: Record<string, any> = {};

      pricingRows.forEach(row => {
        // Only process event pricing rows (event_id is not null)
        if (row.event_id !== null && row.event_id !== undefined) {
          // Initialize event object if not exists
          if (!eventPricing[row.event_id]) {
            eventPricing[row.event_id] = {
              inventory: { amount: 0 },
              parameters: {},
              groupPricing: {}
            };
          }

          if (row.parameter_id === null || row.parameter_id === undefined) {
            // Inventory pricing for event
            if (row.group_min === null && row.group_max === null) {
              // Base inventory price for event
              eventPricing[row.event_id].inventory.amount = parseFloat(row.amount);
            } else {
              // Inventory group pricing for event
              if (!eventPricing[row.event_id].groupPricing.inventory) {
                eventPricing[row.event_id].groupPricing.inventory = [];
              }
              eventPricing[row.event_id].groupPricing.inventory.push({
                min: row.group_min,
                max: row.group_max,
                price: parseFloat(row.amount)
              });
            }
          } else {
            // Parameter pricing for event
            if (row.group_min === null && row.group_max === null) {
              // Base parameter price for event
              // FIX: Don't overwrite existing groups - only update amount
              if (!eventPricing[row.event_id].parameters[row.parameter_id]) {
                eventPricing[row.event_id].parameters[row.parameter_id] = {
                  amount: parseFloat(row.amount),
                  groups: []
                };
              } else {
                // Only update amount, preserve existing groups
                eventPricing[row.event_id].parameters[row.parameter_id].amount = parseFloat(row.amount);
              }
            } else {
              // Parameter group pricing for event
              if (!eventPricing[row.event_id].parameters[row.parameter_id]) {
                eventPricing[row.event_id].parameters[row.parameter_id] = {
                  amount: 0,
                  groups: []
                };
              }
              eventPricing[row.event_id].parameters[row.parameter_id].groups.push({
                min: row.group_min,
                max: row.group_max,
                price: parseFloat(row.amount)
              });
            }
          }
        }
      });

      return eventPricing;
    };

    // Filter base pricing rows (event_id is null)
    const basePricingRows = pricingResult.rows.filter((row: any) =>
      row.event_id === null || row.event_id === undefined
    );

    // Transform group pricing first, then use it for parameter base prices
    const groupPricingData = transformGroupPricing(basePricingRows);

    return NextResponse.json({
      item: {
        ...item,
        tags: tagsResult.rows,
        parameters: parametersResult.rows,
        media: mediaResult.rows,
        youtube_url: youtubeResult.rows[0]?.url || '',
        video_start_time: youtubeResult.rows[0]?.video_start_time || 0,
        pricing_rate: pricingResult.rows[0]?.rate_type || 'per_night',
        calendar_status: item.default_calendar_status || 'available',
        base_price: getInventoryBasePrice(basePricingRows),
        group_pricing: groupPricingData,
        parameter_base_prices: transformParameterBasePrices(basePricingRows, groupPricingData),
        event_pricing: transformPricingWithEvents(pricingResult.rows),
        deposit_type: depositResult.rows[0]?.type
          ? mapDepositTypeFromDb(depositResult.rows[0].type)
          : 'system_default',
        deposit_value: depositResult.rows[0]?.amount ? parseFloat(depositResult.rows[0].amount) : 50,
        menu_products: menuProductsResult.rows.map((mp: any) => ({
          menu_item_id: mp.menu_item_id,
          menu_item_name: mp.menu_item_name,
          menu_item_price: mp.menu_item_price,
          menu_item_unit: mp.menu_item_unit,
          opt_in: mp.is_required ? 'required' : 'optional',
          display_order: mp.display_order
        })),
        package_items: addonsResult.rows.map((a: any) => ({
          item_id: a.item_id,
          item_name: a.item_name,
          item_sku: a.item_sku,
          price_percentage: a.price_percentage,
          opt_in: a.is_required ? 'required' : 'optional',
          dates_setting: a.dates_setting || 'inherit_parent',
          custom_start_date: a.custom_start_date || null,
          custom_end_date: a.custom_end_date || null,
        })),
        show_package_price: packageSettingsResult.rows[0]?.show_starting_price || false,
        timeslots: timeslotsResult.rows,
        taxes: taxes,
        events: events,
      }
    });

  } catch (error) {
    console.error('Item fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params before using (Next.js 15 requirement)
    const { id } = await params;

    const body = await request.json();
    const {
      name,
      sku,
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
      package_items,
      show_package_price,
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
      // Display order
      display_order,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate category_id - skip temp IDs
      let validCategoryId = category_id || null;
      if (validCategoryId && typeof validCategoryId === 'string' && validCategoryId.startsWith('temp-')) {
        console.warn('Skipping temp category_id:', validCategoryId);
        validCategoryId = null;
      }

      // Update item
      await client.query(
        `UPDATE glamping_items
         SET name = $1, sku = $2, category_id = $3, summary = $4, display_order = COALESCE($5, display_order), updated_at = NOW()
         WHERE id = $6`,
        [name, sku || null, validCategoryId, summary || null, display_order, id]
      );

      // Update or insert attributes
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (item_id)
        DO UPDATE SET
          inventory_quantity = $2,
          unlimited_inventory = $3,
          allocation_type = $4,
          fixed_length_value = $5,
          fixed_length_unit = $6,
          fixed_start_time = $7,
          default_length_hours = $8,
          visibility = $9,
          default_calendar_status = $10,
          is_active = $11,
          updated_at = NOW()`,
        [
          id,
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

      // Update tags if provided
      if (tags) {
        await client.query('DELETE FROM glamping_item_tags WHERE item_id = $1', [id]);

        if (tags.length > 0) {
          for (const tag of tags) {
            let tagId: string;

            // Check if this is a new tag (temp ID or object with name)
            if (typeof tag === 'object' && tag.name) {
              // It's a tag object, check if it exists or create new
              if (tag.id && !String(tag.id).startsWith('temp-')) {
                tagId = tag.id;
              } else {
                // Create new tag
                const newTagResult = await client.query(
                  `INSERT INTO glamping_tags (name) VALUES ($1)
                   ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                   RETURNING id`,
                  [tag.name]
                );
                tagId = newTagResult.rows[0].id;
              }
            } else if (typeof tag === 'string') {
              // It's a string ID
              if (tag.startsWith('temp-')) {
                // Skip temp tags without name - shouldn't happen but safety check
                console.warn('Skipping temp tag without name:', tag);
                continue;
              }
              tagId = tag;
            } else {
              // Unknown format, skip
              continue;
            }

            await client.query(
              'INSERT INTO glamping_item_tags (item_id, tag_id) VALUES ($1, $2)',
              [id, tagId]
            );
          }
        }
      }

      // Update parameters if provided
      if (parameters) {
        await client.query('DELETE FROM glamping_item_parameters WHERE item_id = $1', [id]);

        if (parameters.length > 0) {
          for (const param of parameters) {
            await client.query(
              `INSERT INTO glamping_item_parameters (
                item_id, parameter_id, min_quantity, max_quantity, display_order
              ) VALUES ($1, $2, $3, $4, $5)`,
              [id, param.parameter_id, param.min_quantity, param.max_quantity, param.display_order]
            );
          }
        }
      }

      // Update media (images) if provided
      if (images !== undefined) {
        // Delete existing image media (not youtube)
        await client.query(
          `DELETE FROM glamping_item_media WHERE item_id = $1 AND type != 'youtube'`,
          [id]
        );

        // Insert new images
        if (images && images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            await client.query(
              `INSERT INTO glamping_item_media (
                item_id, type, url, caption, display_order
              ) VALUES ($1, $2, $3, $4, $5)`,
              [id, 'image', img.url, img.caption || '', i]
            );
          }
        }
      }

      // Update YouTube URL if provided
      if (youtube_url !== undefined) {
        // Delete existing youtube media
        await client.query(
          `DELETE FROM glamping_item_media WHERE item_id = $1 AND type = 'youtube'`,
          [id]
        );

        // Insert new youtube URL if not empty
        if (youtube_url) {
          try {
            await client.query(
              `INSERT INTO glamping_item_media (
                item_id, type, url, display_order, video_start_time
              ) VALUES ($1, $2, $3, $4, $5)`,
              [id, 'youtube', youtube_url, 999, video_start_time || 0]
            );
          } catch {
            // Fallback if video_start_time column doesn't exist yet
            await client.query(
              `INSERT INTO glamping_item_media (
                item_id, type, url, display_order
              ) VALUES ($1, $2, $3, $4)`,
              [id, 'youtube', youtube_url, 999]
            );
          }
        }
      }

      // Update pricing data if provided
      if (pricing_rate !== undefined || group_pricing !== undefined || parameter_base_prices !== undefined || event_pricing !== undefined) {
        // Delete existing pricing
        await client.query('DELETE FROM glamping_pricing WHERE item_id = $1', [id]);

        // Insert group pricing rows if provided
        if (group_pricing && typeof group_pricing === 'object') {
          for (const [key, groups] of Object.entries(group_pricing)) {
            const paramId = key === 'inventory' ? null : key;

            if (Array.isArray(groups)) {
              for (const group of groups) {
                await client.query(
                  `INSERT INTO glamping_pricing (
                    item_id, parameter_id, rate_type, group_min, group_max, amount, pricing_mode
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    id,
                    paramId,
                    pricing_rate || 'per_night',
                    group.min,
                    group.max,
                    group.price,
                    group.pricing_mode || 'per_person'
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
                  id,
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
            // Skip temporary events (not yet created in database)
            if (eventId.startsWith('temp_')) continue;

            const typedEventData = eventData as any;
            // Insert inventory price for event - allow 0 for free pricing
            if (typedEventData.inventory && typedEventData.inventory.amount !== undefined && typedEventData.inventory.amount !== null) {
              await client.query(
                `INSERT INTO glamping_pricing (
                  item_id, parameter_id, event_id, rate_type, group_min, group_max, amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  id,
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
                      id,
                      paramId,
                      eventId,
                      pricing_rate || 'per_night',
                      null,
                      null,
                      typedParamData.amount
                    ]
                  );
                }

                // Insert group pricing for parameter in event
                if (typedParamData.groups && Array.isArray(typedParamData.groups)) {
                  for (const group of typedParamData.groups) {
                    // FIX: Allow saving price >= 0 (not just > 0)
                    if (group && group.price !== undefined && group.price !== null) {
                      await client.query(
                        `INSERT INTO glamping_pricing (
                          item_id, parameter_id, event_id, rate_type, group_min, group_max, amount, pricing_mode
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                          id,
                          paramId,
                          eventId,
                          pricing_rate || 'per_night',
                          group.min,
                          group.max,
                          group.price,
                          group.pricing_mode || 'per_person'
                        ]
                      );
                    }
                  }
                }
              }
            }

            // Insert group pricing for inventory in event
            if (typedEventData.groupPricing && typedEventData.groupPricing.inventory && Array.isArray(typedEventData.groupPricing.inventory)) {
              for (const group of typedEventData.groupPricing.inventory) {
                // FIX: Allow saving price >= 0 (not just > 0)
                if (group && group.price !== undefined && group.price !== null) {
                  await client.query(
                    `INSERT INTO glamping_pricing (
                      item_id, parameter_id, event_id, rate_type, group_min, group_max, amount, pricing_mode
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                      id,
                      null,  // Inventory has null parameter_id
                      eventId,
                      pricing_rate || 'per_night',
                      group.min,
                      group.max,
                      group.price,
                      group.pricing_mode || 'per_person'
                    ]
                  );
                }
              }
            }
          }
        }
      }

      // Update taxes if provided
      if (taxes !== undefined) {
        // Delete existing tax links
        await client.query(
          'DELETE FROM glamping_item_taxes WHERE item_id = $1',
          [id]
        );

        // Re-create tax links for enabled taxes
        if (Array.isArray(taxes) && taxes.length > 0) {
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
                  'normal',
                  tax.apply_to || 'all_customers',
                  tax.amount,
                  tax.amount_type === 'percent',
                  true
                ]
              );
              taxId = newTax.rows[0].id;
            }

            // Link tax to item
            await client.query(
              'INSERT INTO glamping_item_taxes (item_id, tax_id) VALUES ($1, $2)',
              [id, taxId]
            );
          }
        }
      }

      // Update deposit settings if provided
      if (deposit_type !== undefined) {
        // Delete existing deposit settings
        await client.query(
          'DELETE FROM glamping_deposit_settings WHERE item_id = $1',
          [id]
        );

        // Insert new deposit settings if not system default
        if (deposit_type !== 'system_default' && deposit_type !== 'no_deposit') {
          await client.query(
            `INSERT INTO glamping_deposit_settings (
              item_id, type, amount
            ) VALUES ($1, $2, $3)`,
            [id, mapDepositTypeToDb(deposit_type), deposit_value || 50]
          );
        }
      }

      // Update menu products (food/beverages) if provided
      if (menu_products !== undefined) {
        // Delete existing menu products
        await client.query(
          'DELETE FROM glamping_item_menu_products WHERE item_id = $1',
          [id]
        );

        // Insert new menu products
        if (menu_products && menu_products.length > 0) {
          for (let i = 0; i < menu_products.length; i++) {
            const mp = menu_products[i];
            await client.query(
              `INSERT INTO glamping_item_menu_products (
                item_id, menu_item_id, is_required, display_order
              ) VALUES ($1, $2, $3, $4)`,
              [
                id,
                mp.menu_item_id,
                mp.opt_in === 'required',
                i
              ]
            );
          }
        }
      }

      // Update package items (add-ons) if provided
      if (package_items !== undefined) {
        await client.query(
          'DELETE FROM glamping_item_addons WHERE item_id = $1',
          [id]
        );

        if (package_items && package_items.length > 0) {
          for (let i = 0; i < package_items.length; i++) {
            const pi = package_items[i];
            await client.query(
              `INSERT INTO glamping_item_addons (
                item_id, addon_item_id, price_percentage, is_required, display_order, dates_setting, custom_start_date, custom_end_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                id,
                pi.item_id,
                pi.price_percentage ?? 100,
                pi.opt_in === 'required',
                i,
                pi.dates_setting || 'inherit_parent',
                pi.custom_start_date || null,
                pi.custom_end_date || null
              ]
            );
          }
        }
      }

      // Update package settings if provided
      if (show_package_price !== undefined) {
        await client.query(
          'DELETE FROM glamping_package_settings WHERE item_id = $1',
          [id]
        );

        if (show_package_price) {
          await client.query(
            `INSERT INTO glamping_package_settings (item_id, show_starting_price)
             VALUES ($1, $2)`,
            [id, true]
          );
        }
      }

      // Update timeslots if provided
      if (timeslots !== undefined) {
        // Delete existing timeslots
        await client.query(
          'DELETE FROM glamping_timeslots WHERE item_id = $1',
          [id]
        );

        // Insert new timeslots if allocation type is 'timeslots'
        if (allocation_type === 'timeslots' && timeslots && timeslots.length > 0) {
          for (const slot of timeslots) {
            await client.query(
              `INSERT INTO glamping_timeslots (
                item_id, start_time, end_time, days_of_week
              ) VALUES ($1, $2, $3, $4)`,
              [id, slot.start_time, slot.end_time, slot.days_of_week]
            );
          }
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Item updated successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Item update error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Item patch error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params before using (Next.js 15 requirement)
    const { id } = await params;

    // Check if item exists
    const checkResult = await pool.query(
      'SELECT id FROM glamping_items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Delete item (cascades to related tables)
    await pool.query('DELETE FROM glamping_items WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Item deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
