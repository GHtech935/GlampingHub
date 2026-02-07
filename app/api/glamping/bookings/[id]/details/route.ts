import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';
import { getGlampingBookingLiveTotal } from '@/lib/booking-recalculate';

// Types for tents data
interface TentParameter {
  id: string;
  parameterId: string;
  label: string;
  bookedQuantity: number;
  colorCode?: string;
  visibility?: string;
  countedForMenu?: boolean;
}

interface TentMenuProduct {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  servingDate?: string;
  name: any;
  description?: any;
  unit?: any;
  imageUrl?: string;
  minGuests?: number | null;
  maxGuests?: number | null;
  categoryId?: string;
  categoryName?: any;
  voucherCode?: string | null;
  discountAmount?: number;
}

interface TentCommonItem {
  addonItemId: string;
  itemName: any;
  parameterId: string;
  parameterName: string;
  quantity: number;
  unitPrice: number;
  pricingMode: string;
  dates?: { from: string; to: string } | null;
  voucher?: { code: string; id: string; discountAmount: number; discountType: string; discountValue: number } | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // Query 1: Main booking + customer info
    const bookingResult = await query(`
      SELECT
        b.id, b.booking_code, b.status, b.payment_status,
        b.check_in_date, b.check_out_date,
        b.subtotal_amount, b.tax_amount, b.discount_amount,
        b.total_amount, b.deposit_due, b.balance_due,
        b.guests, b.total_guests, b.special_requirements, b.currency,
        c.email, c.first_name, c.last_name, c.phone, c.country, c.address_line1
      FROM glamping_bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Calculate live total from individual items (not the potentially stale stored value)
    const client = await pool.connect();
    let liveTotal: { subtotal: number; taxAmount: number; discountAmount: number; totalAmount: number };
    try {
      liveTotal = await getGlampingBookingLiveTotal(client, bookingId);
    } finally {
      client.release();
    }

    // Recalculate deposit_due based on live total and stored deposit ratio
    const storedTotal = parseFloat(booking.total_amount || '0');
    const storedDeposit = parseFloat(booking.deposit_due || '0');
    const depositRatio = storedTotal > 0 && storedDeposit > 0 ? storedDeposit / storedTotal : 1;
    booking.deposit_due = Math.round(liveTotal.totalAmount * depositRatio);

    // Override stored pricing with live-calculated values
    booking.subtotal_amount = liveTotal.subtotal;
    booking.tax_amount = liveTotal.taxAmount;
    booking.discount_amount = liveTotal.discountAmount;
    booking.total_amount = liveTotal.totalAmount;

    // Compute balance_due dynamically from actual payments
    const paymentsResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM glamping_booking_payments
       WHERE booking_id = $1 AND status IN ('successful', 'completed', 'paid')`,
      [bookingId]
    );
    const totalPaid = parseFloat(paymentsResult.rows[0].total_paid || '0');
    booking.balance_due = Math.max(0, liveTotal.totalAmount - totalPaid);

    // Query 2: Accommodation details (legacy, kept for backward compatibility)
    const accommodationResult = await query(`
      SELECT i.name as item_name, z.name as zone_name, z.id as zone_id
      FROM glamping_booking_items bi
      JOIN glamping_items i ON bi.item_id = i.id
      JOIN glamping_zones z ON i.zone_id = z.id
      WHERE bi.booking_id = $1 LIMIT 1
    `, [bookingId]);

    const accommodation = accommodationResult.rows[0] || {};

    // Query 3: Tents from glamping_booking_tents (including discount fields)
    const tentsResult = await query(`
      SELECT
        bt.id,
        bt.item_id,
        bt.check_in_date,
        bt.check_out_date,
        bt.nights,
        bt.subtotal,
        bt.special_requests,
        bt.display_order,
        bt.voucher_code,
        bt.discount_type,
        bt.discount_value,
        bt.discount_amount,
        i.name as item_name,
        z.id as zone_id,
        z.name as zone_name
      FROM glamping_booking_tents bt
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE bt.booking_id = $1
      ORDER BY bt.display_order
    `, [bookingId]);

    // Query 4: Parameters per tent from glamping_booking_parameters
    const paramsResult = await query(`
      SELECT
        bp.id,
        bp.booking_tent_id,
        bp.parameter_id,
        bp.label,
        bp.booked_quantity,
        p.color_code,
        p.visibility,
        p.counted_for_menu
      FROM glamping_booking_parameters bp
      LEFT JOIN glamping_parameters p ON bp.parameter_id = p.id
      WHERE bp.booking_id = $1
      ORDER BY p.display_order ASC, p.name ASC
    `, [bookingId]);

    // Query 5: Menu products per tent from glamping_booking_menu_products
    const menuResult = await query(`
      SELECT
        bmp.id,
        bmp.booking_tent_id,
        bmp.menu_item_id,
        bmp.quantity,
        bmp.unit_price,
        bmp.total_price,
        bmp.serving_date,
        bmp.voucher_code as menu_voucher_code,
        bmp.discount_type as menu_discount_type,
        bmp.discount_value as menu_discount_value,
        bmp.discount_amount as menu_discount_amount,
        mi.name,
        mi.description,
        mi.unit,
        mi.image_url,
        mi.min_guests,
        mi.max_guests,
        mc.id as category_id,
        mc.name as category_name
      FROM glamping_booking_menu_products bmp
      LEFT JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE bmp.booking_id = $1
      ORDER BY bmp.serving_date NULLS LAST, mc.weight, mi.sort_order
    `, [bookingId]);

    // Query 6: Common items (addons) per tent from glamping_booking_items
    const commonItemsResult = await query(`
      SELECT
        bi.id,
        bi.booking_tent_id,
        bi.item_id,
        bi.addon_item_id,
        bi.parameter_id,
        bi.quantity,
        bi.unit_price,
        bi.metadata,
        gi.name as addon_item_name,
        gp.name as parameter_name
      FROM glamping_booking_items bi
      LEFT JOIN glamping_items gi ON bi.addon_item_id = gi.id
      LEFT JOIN glamping_parameters gp ON bi.parameter_id = gp.id
      WHERE bi.booking_id = $1
        AND bi.metadata->>'type' = 'addon'
      ORDER BY bi.created_at
    `, [bookingId]);

    // Group common items by tent_id
    const commonItemsByTentId = new Map<string, TentCommonItem[]>();
    for (const row of commonItemsResult.rows) {
      const tentId = row.booking_tent_id || 'shared';
      if (!commonItemsByTentId.has(tentId)) {
        commonItemsByTentId.set(tentId, []);
      }
      const metadata = row.metadata || {};
      commonItemsByTentId.get(tentId)!.push({
        addonItemId: row.addon_item_id,
        itemName: row.addon_item_name,
        parameterId: row.parameter_id,
        parameterName: row.parameter_name,
        quantity: row.quantity,
        unitPrice: parseFloat(row.unit_price),
        pricingMode: metadata.pricingMode || 'per_person',
        dates: metadata.dates || null,
        voucher: metadata.voucher || null,
      });
    }

    // Group parameters by tent_id
    const paramsByTentId = new Map<string, TentParameter[]>();
    for (const row of paramsResult.rows) {
      const tentId = row.booking_tent_id || 'shared';
      if (!paramsByTentId.has(tentId)) {
        paramsByTentId.set(tentId, []);
      }
      paramsByTentId.get(tentId)!.push({
        id: row.id,
        parameterId: row.parameter_id,
        label: row.label,
        bookedQuantity: row.booked_quantity,
        colorCode: row.color_code,
        visibility: row.visibility,
        countedForMenu: row.counted_for_menu,
      });
    }

    // Group menu products by tent_id
    const menuByTentId = new Map<string, TentMenuProduct[]>();
    for (const row of menuResult.rows) {
      const tentId = row.booking_tent_id || 'shared';
      if (!menuByTentId.has(tentId)) {
        menuByTentId.set(tentId, []);
      }
      menuByTentId.get(tentId)!.push({
        id: row.id,
        menuItemId: row.menu_item_id,
        quantity: row.quantity,
        unitPrice: parseFloat(row.unit_price),
        totalPrice: parseFloat(row.total_price),
        servingDate: row.serving_date,
        name: row.name,
        description: row.description,
        unit: row.unit,
        imageUrl: row.image_url,
        minGuests: row.min_guests,
        maxGuests: row.max_guests,
        categoryId: row.category_id,
        categoryName: row.category_name,
        voucherCode: row.menu_voucher_code || null,
        discountAmount: parseFloat(row.menu_discount_amount || 0),
      });
    }

    // Map tents with their parameters and menu products
    const tents = tentsResult.rows.map((tent) => ({
      id: tent.id,
      itemId: tent.item_id,
      itemName: tent.item_name,
      zoneName: tent.zone_name,
      zoneId: tent.zone_id,
      checkInDate: tent.check_in_date,
      checkOutDate: tent.check_out_date,
      nights: tent.nights,
      subtotal: parseFloat(tent.subtotal || 0),
      specialRequests: tent.special_requests,
      displayOrder: tent.display_order,
      voucherCode: tent.voucher_code || null,
      discountType: tent.discount_type || null,
      discountValue: parseFloat(tent.discount_value || 0),
      discountAmount: parseFloat(tent.discount_amount || 0),
      parameters: paramsByTentId.get(tent.id) || [],
      menuProducts: menuByTentId.get(tent.id) || [],
      commonItems: commonItemsByTentId.get(tent.id) || [],
    }));

    // Legacy: Parameters (flat list for backward compatibility)
    const parametersResult = await query(`
      SELECT bp.label, bp.booked_quantity, p.color_code
      FROM glamping_booking_parameters bp
      LEFT JOIN glamping_parameters p ON bp.parameter_id = p.id
      WHERE bp.booking_id = $1
      ORDER BY p.display_order ASC, p.name ASC
    `, [bookingId]);

    // Legacy: Menu products (flat list for backward compatibility)
    const menuProductsResult = await query(`
      SELECT
        mp.id, mp.menu_item_id, mp.quantity, mp.unit_price, mp.total_price,
        mi.name, mi.description, mi.unit, mi.image_url,
        mc.name as category_name
      FROM glamping_booking_menu_products mp
      LEFT JOIN glamping_menu_items mi ON mp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE mp.booking_id = $1
      ORDER BY mc.weight, mi.sort_order, mi.name
    `, [bookingId]);

    // Calculate 24-hour restriction
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const msUntilCheckIn = checkInDate.getTime() - now.getTime();
    const hoursUntilCheckIn = msUntilCheckIn / (1000 * 60 * 60);
    const canEditMenu = hoursUntilCheckIn >= 24 && booking.status === 'confirmed' && ['deposit_paid', 'fully_paid'].includes(booking.payment_status);

    // Build response
    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        accommodation,
        customer: {
          email: booking.email,
          first_name: booking.first_name,
          last_name: booking.last_name,
          phone: booking.phone,
          country: booking.country,
          address_line1: booking.address_line1,
        }
      },
      tents, // At root level to match frontend interface
      parameters: parametersResult.rows,
      menuProducts: menuProductsResult.rows,
      canEditMenu,
      canEditCommonItems: canEditMenu,
      hoursUntilCheckIn: Math.max(0, hoursUntilCheckIn),
    });
  } catch (error: any) {
    console.error('Error fetching booking details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
