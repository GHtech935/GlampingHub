import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: bookingCode } = await params;

    // First, get the booking ID from the booking code
    const bookingIdResult = await query(`
      SELECT id FROM glamping_bookings WHERE booking_code = $1
    `, [bookingCode]);

    if (bookingIdResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingId = bookingIdResult.rows[0].id;

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

    // Query 2: Get all tents with item and zone info
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
        i.name as item_name,
        z.id as zone_id,
        z.name as zone_name
      FROM glamping_booking_tents bt
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE bt.booking_id = $1
      ORDER BY bt.display_order
    `, [bookingId]);

    // Query 3: Get all booking items grouped by booking_tent_id
    const itemsResult = await query(`
      SELECT
        bi.id,
        bi.booking_tent_id,
        bi.item_id,
        bi.parameter_id,
        bi.quantity,
        bi.unit_price,
        bi.total_price,
        i.name as item_name,
        p.name as parameter_name,
        p.color_code
      FROM glamping_booking_items bi
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_parameters p ON bi.parameter_id = p.id
      WHERE bi.booking_id = $1
      ORDER BY bi.created_at
    `, [bookingId]);

    // Query 4: Get all parameters grouped by booking_tent_id
    const parametersResult = await query(`
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
    `, [bookingId]);

    // Query 5: Get all menu products grouped by booking_tent_id
    const menuProductsResult = await query(`
      SELECT
        mp.id,
        mp.booking_tent_id,
        mp.menu_item_id,
        mp.quantity,
        mp.unit_price,
        mp.total_price,
        mp.serving_date,
        mi.name,
        mi.description,
        mi.unit,
        mi.image_url,
        mi.min_guests,
        mi.max_guests,
        mc.id as category_id,
        mc.name as category_name
      FROM glamping_booking_menu_products mp
      LEFT JOIN glamping_menu_items mi ON mp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE mp.booking_id = $1
      ORDER BY mc.weight, mi.sort_order, mi.name
    `, [bookingId]);

    // Group items, parameters, and menu products by booking_tent_id
    const itemsByTent = new Map<string, typeof itemsResult.rows>();
    const parametersByTent = new Map<string, typeof parametersResult.rows>();
    const menuProductsByTent = new Map<string, typeof menuProductsResult.rows>();

    itemsResult.rows.forEach(item => {
      const tentId = item.booking_tent_id || 'shared';
      if (!itemsByTent.has(tentId)) itemsByTent.set(tentId, []);
      itemsByTent.get(tentId)!.push(item);
    });

    parametersResult.rows.forEach(param => {
      const tentId = param.booking_tent_id || 'shared';
      if (!parametersByTent.has(tentId)) parametersByTent.set(tentId, []);
      parametersByTent.get(tentId)!.push(param);
    });

    menuProductsResult.rows.forEach(mp => {
      const tentId = mp.booking_tent_id || 'shared';
      if (!menuProductsByTent.has(tentId)) menuProductsByTent.set(tentId, []);
      menuProductsByTent.get(tentId)!.push(mp);
    });

    // Build tents array with grouped data
    const tents = tentsResult.rows.map(tent => {
      const tentParams = parametersByTent.get(tent.id) || [];
      return {
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
        items: (itemsByTent.get(tent.id) || []).map(item => ({
          id: item.id,
          itemId: item.item_id,
          itemName: item.item_name,
          parameterId: item.parameter_id,
          parameterName: item.parameter_name,
          colorCode: item.color_code,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price || 0),
          totalPrice: parseFloat(item.total_price || 0),
        })),
        parameters: tentParams.map(param => ({
          id: param.id,
          parameterId: param.parameter_id,
          label: param.label,
          bookedQuantity: param.booked_quantity,
          colorCode: param.color_code,
          visibility: param.visibility,
          countedForMenu: param.counted_for_menu,
        })),
        menuProducts: (menuProductsByTent.get(tent.id) || []).map(mp => ({
          id: mp.id,
          menuItemId: mp.menu_item_id,
          quantity: mp.quantity,
          unitPrice: parseFloat(mp.unit_price || 0),
          totalPrice: parseFloat(mp.total_price || 0),
          servingDate: mp.serving_date,
          name: mp.name,
          description: mp.description,
          unit: mp.unit,
          imageUrl: mp.image_url,
          minGuests: mp.min_guests,
          maxGuests: mp.max_guests,
          categoryId: mp.category_id,
          categoryName: mp.category_name,
        })),
      };
    });

    // Get shared menu products (booking_tent_id = null)
    const sharedMenuProducts = (menuProductsByTent.get('shared') || []).map(mp => ({
      id: mp.id,
      menuItemId: mp.menu_item_id,
      quantity: mp.quantity,
      unitPrice: parseFloat(mp.unit_price || 0),
      totalPrice: parseFloat(mp.total_price || 0),
      servingDate: mp.serving_date,
      name: mp.name,
      description: mp.description,
      unit: mp.unit,
      imageUrl: mp.image_url,
      minGuests: mp.min_guests,
      maxGuests: mp.max_guests,
      categoryId: mp.category_id,
      categoryName: mp.category_name,
    }));

    // Calculate hours until check-in (use earliest check-in date from tents)
    const earliestCheckIn = tents.length > 0
      ? new Date(Math.min(...tents.map(t => new Date(t.checkInDate).getTime())))
      : new Date(booking.check_in_date);
    const now = new Date();
    const msUntilCheckIn = earliestCheckIn.getTime() - now.getTime();
    const hoursUntilCheckIn = msUntilCheckIn / (1000 * 60 * 60);

    // canEditMenu: payment_status must be deposit_paid or fully_paid
    const canEditMenu = ['deposit_paid', 'fully_paid'].includes(booking.payment_status);

    // Build response - keep backward compatibility with accommodation field
    const firstTent = tents[0];
    const accommodation = firstTent ? {
      item_name: firstTent.itemName,
      zone_name: firstTent.zoneName,
      zone_id: firstTent.zoneId,
    } : {};

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
      tents,
      sharedMenuProducts,
      // Keep backward compatibility - flatten all parameters
      parameters: parametersResult.rows.map(p => ({
        label: p.label,
        booked_quantity: p.booked_quantity,
        color_code: p.color_code,
      })),
      // Keep backward compatibility - flatten all menu products
      menuProducts: menuProductsResult.rows.map(mp => ({
        id: mp.id,
        menu_item_id: mp.menu_item_id,
        quantity: mp.quantity,
        unit_price: parseFloat(mp.unit_price || 0),
        total_price: parseFloat(mp.total_price || 0),
        name: mp.name,
        description: mp.description,
        unit: mp.unit,
        image_url: mp.image_url,
        category_name: mp.category_name,
      })),
      canEditMenu,
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
