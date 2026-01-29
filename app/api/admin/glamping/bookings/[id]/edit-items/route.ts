import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function getLocalizedString(value: any, fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.vi || value.en || fallback;
  return fallback;
}

/**
 * GET /api/admin/glamping/bookings/[id]/edit-items
 * Fetch all editable items (tents + menu products) for the Edit tab
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify booking exists and get tax info
    const bookingResult = await client.query(
      `SELECT id, tax_invoice_required, tax_rate
       FROM glamping_bookings WHERE id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingResult.rows[0];
    const taxEnabled = booking.tax_invoice_required || false;
    const taxRate = parseFloat(booking.tax_rate || '10');

    // Fetch tents with parameters
    const tentsResult = await client.query(
      `SELECT
        bt.id,
        bt.item_id,
        bt.check_in_date,
        bt.check_out_date,
        bt.nights,
        bt.adults,
        bt.children,
        bt.total_guests,
        bt.subtotal,
        bt.special_requests,
        bt.display_order,
        bt.voucher_code,
        bt.discount_type,
        bt.discount_value,
        bt.discount_amount,
        i.name as item_name,
        i.sku as item_sku
      FROM glamping_booking_tents bt
      LEFT JOIN glamping_items i ON bt.item_id = i.id
      WHERE bt.booking_id = $1
      ORDER BY bt.display_order`,
      [id]
    );

    // Fetch parameters for each tent
    const tentIds = tentsResult.rows.map(t => t.id);
    let parametersMap: Record<string, Array<{ parameterId: string; parameterName: string; quantity: number; unitPrice: number }>> = {};

    if (tentIds.length > 0) {
      const paramsResult = await client.query(
        `SELECT
          bi.booking_tent_id,
          bi.parameter_id,
          bi.quantity,
          bi.unit_price,
          p.name as parameter_name
        FROM glamping_booking_items bi
        LEFT JOIN glamping_parameters p ON bi.parameter_id = p.id
        WHERE bi.booking_id = $1 AND bi.booking_tent_id = ANY($2)
        ORDER BY bi.created_at`,
        [id, tentIds]
      );

      for (const row of paramsResult.rows) {
        if (!parametersMap[row.booking_tent_id]) {
          parametersMap[row.booking_tent_id] = [];
        }
        parametersMap[row.booking_tent_id].push({
          parameterId: row.parameter_id,
          parameterName: getLocalizedString(row.parameter_name),
          quantity: row.quantity,
          unitPrice: parseFloat(row.unit_price || '0'),
        });
      }
    }

    const tents = tentsResult.rows.map(tent => {
      const subtotal = parseFloat(tent.subtotal || '0');
      const discountAmount = parseFloat(tent.discount_amount || '0');
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = taxEnabled ? Math.round(afterDiscount * (taxRate / 100)) : 0;

      return {
        id: tent.id,
        itemId: tent.item_id,
        itemName: getLocalizedString(tent.item_name),
        itemSku: tent.item_sku,
        checkInDate: tent.check_in_date,
        checkOutDate: tent.check_out_date,
        nights: tent.nights,
        adults: tent.adults,
        children: tent.children,
        totalGuests: tent.total_guests,
        subtotal,
        taxAmount,
        specialRequests: tent.special_requests,
        displayOrder: tent.display_order,
        voucherCode: tent.voucher_code || null,
        discountType: tent.discount_type || null,
        discountValue: parseFloat(tent.discount_value || '0'),
        discountAmount,
        parameters: parametersMap[tent.id] || [],
      };
    });

    // Fetch menu products
    const menuResult = await client.query(
      `SELECT
        mp.id,
        mp.menu_item_id,
        mp.booking_tent_id,
        mp.quantity,
        mp.unit_price,
        mp.total_price,
        mp.serving_date,
        mp.voucher_code,
        mp.discount_type,
        mp.discount_value,
        mp.discount_amount,
        mi.name as product_name,
        mi.description as product_description,
        mc.name as category_name
      FROM glamping_booking_menu_products mp
      LEFT JOIN glamping_menu_items mi ON mp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE mp.booking_id = $1
      ORDER BY mp.serving_date, mp.created_at`,
      [id]
    );

    const menuProducts = menuResult.rows.map(mp => {
      const totalPrice = parseFloat(mp.total_price || '0');
      const discountAmount = parseFloat(mp.discount_amount || '0');
      const afterDiscount = totalPrice - discountAmount;
      const taxAmount = taxEnabled ? Math.round(afterDiscount * (taxRate / 100)) : 0;

      return {
        id: mp.id,
        menuItemId: mp.menu_item_id,
        productName: getLocalizedString(mp.product_name),
        categoryName: getLocalizedString(mp.category_name),
        quantity: mp.quantity,
        unitPrice: parseFloat(mp.unit_price || '0'),
        totalPrice,
        taxAmount,
        servingDate: mp.serving_date || null,
        bookingTentId: mp.booking_tent_id || null,
        voucherCode: mp.voucher_code || null,
        discountType: mp.discount_type || null,
        discountValue: parseFloat(mp.discount_value || '0'),
        discountAmount,
      };
    });

    // Calculate totals
    const tentSubtotal = tents.reduce((sum, t) => sum + t.subtotal, 0);
    const tentDiscount = tents.reduce((sum, t) => sum + t.discountAmount, 0);
    const tentTax = tents.reduce((sum, t) => sum + t.taxAmount, 0);

    const menuSubtotal = menuProducts.reduce((sum, p) => sum + p.totalPrice, 0);
    const menuDiscount = menuProducts.reduce((sum, p) => sum + p.discountAmount, 0);
    const menuTax = menuProducts.reduce((sum, p) => sum + p.taxAmount, 0);

    const totals = {
      subtotal: tentSubtotal + menuSubtotal,
      discountTotal: tentDiscount + menuDiscount,
      taxTotal: tentTax + menuTax,
      grandTotal: (tentSubtotal + menuSubtotal) - (tentDiscount + menuDiscount) + (tentTax + menuTax),
    };

    return NextResponse.json({
      tents,
      menuProducts,
      totals,
      taxEnabled,
      taxRate,
    });
  } catch (error) {
    console.error("Error fetching edit items:", error);
    return NextResponse.json(
      { error: "Failed to fetch edit items" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
