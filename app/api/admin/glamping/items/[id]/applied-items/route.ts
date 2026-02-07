import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await pool.query(
      `SELECT item_id FROM glamping_item_addons WHERE addon_item_id = $1`,
      [id]
    );

    return NextResponse.json({
      item_ids: result.rows.map(r => r.item_id)
    });
  } catch (error) {
    console.error('Failed to fetch applied items:', error);
    return NextResponse.json({ error: 'Failed to fetch applied items' }, { status: 500 });
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

    const { id: addonItemId } = await params;
    const { item_ids: newItemIds } = await request.json();

    if (!Array.isArray(newItemIds)) {
      return NextResponse.json({ error: 'item_ids must be an array' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current relationships
      const currentResult = await client.query(
        `SELECT item_id FROM glamping_item_addons WHERE addon_item_id = $1`,
        [addonItemId]
      );
      const currentIds = currentResult.rows.map(r => r.item_id);

      const toAdd = newItemIds.filter((id: string) => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !newItemIds.includes(id));

      // Delete removed relationships
      if (toRemove.length > 0) {
        await client.query(
          `DELETE FROM glamping_item_addons WHERE addon_item_id = $1 AND item_id = ANY($2::uuid[])`,
          [addonItemId, toRemove]
        );
      }

      // Insert new relationships with defaults
      for (const itemId of toAdd) {
        await client.query(
          `INSERT INTO glamping_item_addons (item_id, addon_item_id, price_percentage, is_required, display_order, dates_setting)
           VALUES ($1, $2, 100, false, 0, 'inherit_parent')`,
          [itemId, addonItemId]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({ success: true, added: toAdd.length, removed: toRemove.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to update applied items:', error);
    return NextResponse.json({ error: 'Failed to update applied items' }, { status: 500 });
  }
}
