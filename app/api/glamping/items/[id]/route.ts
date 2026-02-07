import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Get single glamping item with details (public endpoint)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let { id } = await params;

    // Strip "item-" prefix if present for backward compatibility
    if (id.startsWith('item-')) {
      id = id.replace('item-', '');
    }

    // Get item basic info
    const itemQuery = `
      SELECT
        i.id,
        i.name,
        i.sku,
        i.zone_id,
        i.category_id,
        i.summary,
        c.name as category_name,
        z.name as zone_name,
        a.inventory_quantity,
        a.unlimited_inventory,
        a.allocation_type,
        a.default_calendar_status as status,
        a.visibility
      FROM glamping_items i
      LEFT JOIN glamping_categories c ON i.category_id = c.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
      WHERE i.id = $1 AND z.is_active = true AND COALESCE(a.is_active, true) = true
    `;

    const { rows: itemRows } = await pool.query(itemQuery, [id]);

    if (itemRows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = itemRows[0];

    // Get media
    const mediaQuery = `
      SELECT type, url, caption, display_order
      FROM glamping_item_media
      WHERE item_id = $1
      ORDER BY display_order ASC
    `;
    const { rows: media } = await pool.query(mediaQuery, [id]);

    // Get base pricing (minimum price without event)
    const pricingQuery = `
      SELECT MIN(amount) as base_price, rate_type
      FROM glamping_pricing
      WHERE item_id = $1 AND event_id IS NULL
      GROUP BY rate_type
      ORDER BY MIN(amount) ASC
      LIMIT 1
    `;
    const { rows: pricingRows } = await pool.query(pricingQuery, [id]);

    const base_price = pricingRows.length > 0 ? pricingRows[0].base_price : 0;
    const pricing_rate = pricingRows.length > 0 ? pricingRows[0].rate_type : 'per_night';

    // Get tags
    const tagsQuery = `
      SELECT t.id, t.name
      FROM glamping_tags t
      JOIN glamping_item_tags it ON it.tag_id = t.id
      WHERE it.item_id = $1
      ORDER BY t.name
    `;
    const { rows: tags } = await pool.query(tagsQuery, [id]);

    // Get parameters
    const parametersQuery = `
      SELECT p.id, p.name, p.color_code, ip.min_quantity, ip.max_quantity, ip.display_order
      FROM glamping_parameters p
      JOIN glamping_item_parameters ip ON ip.parameter_id = p.id
      WHERE ip.item_id = $1
      ORDER BY ip.display_order
    `;
    const { rows: parameters } = await pool.query(parametersQuery, [id]);

    // Get menu products linked to this item
    // Note: glamping_menu_items uses 'status' (active/hidden) and 'is_available' columns
    // Filter by show_to_customer: only show categories that are visible to customers
    const menuProductsQuery = `
      SELECT
        mi.id as menu_item_id,
        mi.name as menu_item_name,
        mi.description as menu_item_description,
        mi.price as menu_item_price,
        mi.unit as menu_item_unit,
        mi.image_url as menu_item_image,
        mi.status as menu_item_status,
        mi.is_available as menu_item_available,
        mi.min_guests,
        mi.max_guests,
        imp.is_required,
        imp.display_order,
        mc.id as category_id,
        mc.name as category_name
      FROM glamping_item_menu_products imp
      JOIN glamping_menu_items mi ON imp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE imp.item_id = $1
        AND (mc.show_to_customer = true OR mc.show_to_customer IS NULL OR mc.id IS NULL)
      ORDER BY imp.display_order, mi.name
    `;
    const { rows: menuProducts } = await pool.query(menuProductsQuery, [id]);
    console.log('[Public Item API] Item ID:', id, 'Menu products found:', menuProducts.length, menuProducts);

    // Filter only active and available menu items for display
    const activeMenuProducts = menuProducts.filter(mp =>
      mp.menu_item_status === 'active' && mp.menu_item_available !== false
    );

    // Get item add-ons (common items attached in admin step 5)
    const addonsQuery = `
      SELECT
        a.addon_item_id,
        a.price_percentage,
        a.is_required,
        a.dates_setting,
        a.custom_start_date,
        a.custom_end_date,
        a.display_order,
        i.name as addon_name,
        i.sku as addon_sku
      FROM glamping_item_addons a
      JOIN glamping_items i ON a.addon_item_id = i.id
      WHERE a.item_id = $1
      ORDER BY a.display_order
    `;
    const { rows: addons } = await pool.query(addonsQuery, [id]);

    // For each addon, fetch its parameters and check for product grouping
    const addonsWithParams = await Promise.all(
      addons.map(async (addon) => {
        const addonParamsQuery = `
          SELECT p.id, p.name, p.color_code, ip.min_quantity, ip.max_quantity
          FROM glamping_parameters p
          JOIN glamping_item_parameters ip ON ip.parameter_id = p.id
          WHERE ip.item_id = $1
          ORDER BY ip.display_order
        `;
        const { rows: addonParams } = await pool.query(addonParamsQuery, [addon.addon_item_id]);

        // Check if this addon is a product group parent
        const pgSettingsQuery = `
          SELECT show_unavailable_children, show_starting_price,
                 show_child_prices_in_dropdown, display_price
          FROM glamping_product_group_settings
          WHERE item_id = $1
        `;
        const { rows: pgSettings } = await pool.query(pgSettingsQuery, [addon.addon_item_id]);

        let productGroupData: any = {};
        if (pgSettings.length > 0) {
          // Fetch children with their parameters
          const childrenQuery = `
            SELECT pg.child_item_id, i.name, i.sku, pg.display_order,
                   (SELECT MIN(amount) FROM glamping_pricing WHERE item_id = i.id AND event_id IS NULL AND amount > 0) as base_price
            FROM glamping_product_groups pg
            JOIN glamping_items i ON pg.child_item_id = i.id
            LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
            WHERE pg.parent_item_id = $1
              AND COALESCE(a.is_active, true) = true
            ORDER BY pg.display_order
          `;
          const { rows: children } = await pool.query(childrenQuery, [addon.addon_item_id]);

          // Fetch parameters for each child
          const childrenWithParams = await Promise.all(
            children.map(async (child) => {
              const { rows: childParams } = await pool.query(addonParamsQuery, [child.child_item_id]);
              return {
                child_item_id: child.child_item_id,
                name: child.name,
                sku: child.sku,
                base_price: parseFloat(child.base_price || 0),
                parameters: childParams,
              };
            })
          );

          productGroupData = {
            is_product_group_parent: true,
            product_group_children: childrenWithParams,
            product_group_settings: {
              show_child_prices_in_dropdown: pgSettings[0].show_child_prices_in_dropdown,
              show_unavailable_children: pgSettings[0].show_unavailable_children,
              show_starting_price: pgSettings[0].show_starting_price,
              display_price: parseFloat(pgSettings[0].display_price || 0),
            },
          };
        }

        return {
          addon_item_id: addon.addon_item_id,
          name: addon.addon_name,
          sku: addon.addon_sku,
          price_percentage: addon.price_percentage,
          is_required: addon.is_required,
          dates_setting: addon.dates_setting || 'inherit_parent',
          custom_start_date: addon.custom_start_date || null,
          custom_end_date: addon.custom_end_date || null,
          display_order: addon.display_order,
          parameters: addonParams,
          ...productGroupData,
        };
      })
    );

    // Get taxes for this item
    const taxesQuery = `
      SELECT t.id, t.name, t.amount, t.is_percentage, t.apply_to, t.type
      FROM glamping_taxes t
      JOIN glamping_item_taxes it ON it.tax_id = t.id
      WHERE it.item_id = $1
    `;
    const { rows: taxes } = await pool.query(taxesQuery, [id]);

    const itemWithDetails = {
      ...item,
      base_price,
      pricing_rate,
      media,
      tags,
      parameters,
      inventory_quantity: item.unlimited_inventory ? -1 : item.inventory_quantity,
      menu_products: activeMenuProducts.map(mp => ({
        id: mp.menu_item_id,
        name: mp.menu_item_name,
        description: mp.menu_item_description,
        price: parseFloat(mp.menu_item_price || 0),
        unit: mp.menu_item_unit,
        image_url: mp.menu_item_image,
        is_required: mp.is_required,
        display_order: mp.display_order,
        category_id: mp.category_id,
        category_name: mp.category_name,
        min_guests: mp.min_guests,
        max_guests: mp.max_guests,
      })),
      taxes: taxes.map(t => ({
        id: t.id,
        name: t.name,
        amount: parseFloat(t.amount || 0),
        is_percentage: t.is_percentage,
        apply_to: t.apply_to,
        type: t.type,
      })),
      addons: addonsWithParams,
    };

    return NextResponse.json({ item: itemWithDetails });
  } catch (error) {
    console.error('Error fetching item details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item details' },
      { status: 500 }
    );
  }
}
