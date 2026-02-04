import { NextRequest, NextResponse } from 'next/server';
import { getSession, canAccessGlampingZone } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch the source tent with all basic information
      const sourceItemResult = await client.query(`
        SELECT
          i.id,
          i.name,
          i.sku,
          i.zone_id,
          i.category_id,
          i.summary,
          COALESCE(i.display_order, 0) as display_order,
          a.inventory_quantity,
          a.unlimited_inventory,
          a.allocation_type,
          a.fixed_length_value,
          a.fixed_length_unit,
          a.fixed_start_time,
          a.default_length_hours,
          a.visibility,
          a.default_calendar_status,
          COALESCE(a.is_active, true) as is_active,
          i.is_tent
        FROM glamping_items i
        LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
        WHERE i.id = $1
      `, [id]);

      if (sourceItemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Source tent not found' }, { status: 404 });
      }

      const sourceItem = sourceItemResult.rows[0];

      // Validate zone access
      if (!canAccessGlampingZone(session, sourceItem.zone_id)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You do not have access to this zone' },
          { status: 403 }
        );
      }

      // 2. Generate new values for unique fields
      const newName = `${sourceItem.name} (Copy)`;
      const timestamp = Date.now();
      const newSku = sourceItem.sku ? `${sourceItem.sku}-${timestamp}` : null;

      // 3. Get max display_order for the zone
      const maxOrderResult = await client.query(
        `SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM glamping_items WHERE zone_id = $1`,
        [sourceItem.zone_id]
      );
      const nextDisplayOrder = maxOrderResult.rows[0].next_order;

      // 4. Insert new tent
      const newItemResult = await client.query(
        `INSERT INTO glamping_items (name, sku, zone_id, category_id, summary, display_order, is_tent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [newName, newSku, sourceItem.zone_id, sourceItem.category_id, sourceItem.summary, nextDisplayOrder, sourceItem.is_tent || true]
      );

      const newItemId = newItemResult.rows[0].id;

      // 5. Copy item attributes
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
          newItemId,
          sourceItem.inventory_quantity,
          sourceItem.unlimited_inventory,
          sourceItem.allocation_type,
          sourceItem.fixed_length_value,
          sourceItem.fixed_length_unit,
          sourceItem.fixed_start_time,
          sourceItem.default_length_hours,
          sourceItem.visibility,
          sourceItem.default_calendar_status,
          sourceItem.is_active
        ]
      );

      // 6. Copy tags
      await client.query(`
        INSERT INTO glamping_item_tags (item_id, tag_id)
        SELECT $1, tag_id
        FROM glamping_item_tags
        WHERE item_id = $2
      `, [newItemId, id]);

      // 7. Copy parameters
      await client.query(`
        INSERT INTO glamping_item_parameters (
          item_id, parameter_id, min_quantity, max_quantity, display_order
        )
        SELECT $1, parameter_id, min_quantity, max_quantity, display_order
        FROM glamping_item_parameters
        WHERE item_id = $2
      `, [newItemId, id]);

      // 8. Copy media (images and YouTube)
      await client.query(`
        INSERT INTO glamping_item_media (
          item_id, type, url, thumbnail_url, caption, display_order, video_start_time
        )
        SELECT $1, type, url, thumbnail_url, caption, display_order, video_start_time
        FROM glamping_item_media
        WHERE item_id = $2
        ORDER BY display_order
      `, [newItemId, id]);

      // 9. Copy pricing (base, group, and event pricing)
      await client.query(`
        INSERT INTO glamping_pricing (
          item_id, parameter_id, event_id, rate_type, group_min, group_max, amount, pricing_mode
        )
        SELECT $1, parameter_id, event_id, rate_type, group_min, group_max, amount, pricing_mode
        FROM glamping_pricing
        WHERE item_id = $2
      `, [newItemId, id]);

      // 10. Copy deposit settings
      await client.query(`
        INSERT INTO glamping_deposit_settings (item_id, type, amount)
        SELECT $1, type, amount
        FROM glamping_deposit_settings
        WHERE item_id = $2
      `, [newItemId, id]);

      // 11. Copy menu products
      await client.query(`
        INSERT INTO glamping_item_menu_products (
          item_id, menu_item_id, is_required, display_order
        )
        SELECT $1, menu_item_id, is_required, display_order
        FROM glamping_item_menu_products
        WHERE item_id = $2
      `, [newItemId, id]);

      // 12. Copy package items (add-ons)
      await client.query(`
        INSERT INTO glamping_item_addons (
          item_id, addon_item_id, price_percentage, is_required, display_order,
          dates_setting, custom_start_date, custom_end_date
        )
        SELECT $1, addon_item_id, price_percentage, is_required, display_order,
               dates_setting, custom_start_date, custom_end_date
        FROM glamping_item_addons
        WHERE item_id = $2
      `, [newItemId, id]);

      // 13. Copy package settings
      await client.query(`
        INSERT INTO glamping_package_settings (item_id, show_starting_price)
        SELECT $1, show_starting_price
        FROM glamping_package_settings
        WHERE item_id = $2
      `, [newItemId, id]);

      // 14. Copy timeslots (if allocation_type is 'timeslots')
      if (sourceItem.allocation_type === 'timeslots') {
        await client.query(`
          INSERT INTO glamping_timeslots (item_id, start_time, end_time, days_of_week)
          SELECT $1, start_time, end_time, days_of_week
          FROM glamping_timeslots
          WHERE item_id = $2
        `, [newItemId, id]);
      }

      // 15. Copy tax links
      await client.query(`
        INSERT INTO glamping_item_taxes (item_id, tax_id)
        SELECT $1, tax_id
        FROM glamping_item_taxes
        WHERE item_id = $2
      `, [newItemId, id]);

      // 16. Copy event attachments
      await client.query(`
        INSERT INTO glamping_item_event_items (item_id, event_id)
        SELECT $1, event_id
        FROM glamping_item_event_items
        WHERE item_id = $2
      `, [newItemId, id]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        id: newItemId
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Copy tent error:', error);
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Copy tent error:', error);
    return NextResponse.json({ error: 'Failed to copy tent' }, { status: 500 });
  }
}
