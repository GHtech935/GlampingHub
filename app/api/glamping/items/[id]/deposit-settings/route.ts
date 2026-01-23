import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Get deposit settings for an item (public endpoint)
// Returns either item-specific deposit settings or zone default deposit settings
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First, check if the item has custom deposit settings
    const itemDepositQuery = `
      SELECT type, amount
      FROM glamping_deposit_settings
      WHERE item_id = $1
    `;
    const { rows: itemDepositRows } = await pool.query(itemDepositQuery, [id]);

    // If item has custom deposit settings, return them
    if (itemDepositRows.length > 0) {
      const depositSetting = itemDepositRows[0];
      // Map database type to component expected type
      const mappedType = depositSetting.type === 'fixed' ? 'fixed_amount' : depositSetting.type;

      return NextResponse.json({
        hasDeposit: true,
        depositType: mappedType,
        depositValue: parseFloat(depositSetting.amount),
        source: 'item' // Indicates this is item-specific setting
      });
    }

    // If no item-specific settings, get zone default deposit settings
    const zoneDepositQuery = `
      SELECT z.deposit_type, z.deposit_value
      FROM glamping_items i
      JOIN glamping_zones z ON i.zone_id = z.id
      WHERE i.id = $1
    `;
    const { rows: zoneDepositRows } = await pool.query(zoneDepositQuery, [id]);

    if (zoneDepositRows.length > 0 && zoneDepositRows[0].deposit_type && zoneDepositRows[0].deposit_value) {
      // Map database type to component expected type
      const mappedType = zoneDepositRows[0].deposit_type === 'fixed_amount'
        ? 'fixed_amount'
        : zoneDepositRows[0].deposit_type;

      return NextResponse.json({
        hasDeposit: true,
        depositType: mappedType,
        depositValue: parseFloat(zoneDepositRows[0].deposit_value),
        source: 'zone' // Indicates this is zone default setting
      });
    }

    // No deposit settings found
    return NextResponse.json({
      hasDeposit: false,
      depositType: null,
      depositValue: 0,
      source: null
    });

  } catch (error) {
    console.error('Error fetching deposit settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deposit settings' },
      { status: 500 }
    );
  }
}
