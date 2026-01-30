import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";
import { getBookingItemTaxRates } from "@/lib/glamping-tax-utils";

export const dynamic = 'force-dynamic';

// Helper to extract localized string from JSONB
function getLocalizedString(value: any, fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.vi || value.en || fallback;
  }
  return fallback;
}

/**
 * GET /api/admin/glamping/bookings/[id]/pricing-details
 * Get detailed pricing breakdown for a glamping booking
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

    // Get booking info
    const bookingResult = await client.query(
      `SELECT
        b.id,
        b.booking_code,
        b.check_in_date,
        b.check_out_date,
        b.nights,
        b.total_guests,
        b.guests,
        b.subtotal_amount,
        b.tax_amount,
        b.tax_rate,
        b.tax_invoice_required,
        b.discount_amount,
        b.total_amount,
        b.deposit_due,
        b.balance_due,
        b.status,
        b.payment_status,
        b.created_at
      FROM glamping_bookings b
      WHERE b.id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Get booking items (accommodation) with tent reference
    const itemsResult = await client.query(
      `SELECT
        bi.id,
        bi.item_id,
        bi.booking_tent_id,
        bi.parameter_id,
        bi.quantity,
        bi.unit_price,
        bi.total_price,
        i.name as item_name,
        p.name as parameter_name,
        z.name as zone_name
      FROM glamping_booking_items bi
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_parameters p ON bi.parameter_id = p.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE bi.booking_id = $1
      ORDER BY bi.created_at`,
      [id]
    );

    // Get booking tents with discount info
    const tentsResult = await client.query(
      `SELECT
        bt.id,
        bt.item_id,
        bt.voucher_code,
        bt.discount_type,
        bt.discount_value,
        bt.discount_amount
      FROM glamping_booking_tents bt
      WHERE bt.booking_id = $1
      ORDER BY bt.display_order`,
      [id]
    );
    const tentsDiscountMap = new Map(tentsResult.rows.map(t => [t.id, t]));

    // Get menu products with tent reference + discount fields
    const productsResult = await client.query(
      `SELECT
        bp.id,
        bp.menu_item_id,
        bp.booking_tent_id,
        bp.quantity,
        bp.unit_price,
        bp.total_price,
        bp.voucher_code,
        bp.discount_type,
        bp.discount_value,
        bp.discount_amount,
        bp.serving_date,
        mi.name as product_name,
        mc.name as category_name
      FROM glamping_booking_menu_products bp
      LEFT JOIN glamping_menu_items mi ON bp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE bp.booking_id = $1
      ORDER BY bp.created_at`,
      [id]
    );

    // Get per-item tax rates
    const { itemTaxMap, menuTaxMap } = await getBookingItemTaxRates(client, id);

    // Build nightly pricing (simplified for glamping - one entry per item)
    const nightlyPricing = itemsResult.rows.map((item) => {
      const unitPrice = parseFloat(item.unit_price) || 0;
      const totalPrice = parseFloat(item.total_price) || 0;

      // Look up per-item tax rate
      const itemTaxInfo = item.item_id ? itemTaxMap.get(item.item_id) : undefined;
      const itemTaxRate = booking.tax_invoice_required && itemTaxInfo ? itemTaxInfo.taxRate : 0;
      const taxAmount = itemTaxRate > 0 ? totalPrice * (itemTaxRate / 100) : 0;

      // Get tent discount info
      const tentDiscount = item.booking_tent_id ? tentsDiscountMap.get(item.booking_tent_id) : null;

      return {
        date: new Date(booking.check_in_date).toISOString().split('T')[0],
        subtotalBeforeDiscounts: totalPrice,
        subtotalAfterDiscounts: totalPrice,
        discounts: [],
        itemName: getLocalizedString(item.item_name, 'Accommodation'),
        parameterName: getLocalizedString(item.parameter_name),
        zoneName: getLocalizedString(item.zone_name),
        quantity: item.quantity || 1,
        unitPrice: unitPrice,
        taxRate: itemTaxRate,
        taxAmount: taxAmount,
        bookingTentId: item.booking_tent_id || null,
        itemId: item.item_id || null,
        tentVoucherCode: tentDiscount?.voucher_code || null,
        tentDiscountAmount: parseFloat(tentDiscount?.discount_amount || 0),
      };
    });

    // Build products list (with per-product discount and per-product tax)
    const products = productsResult.rows.map(p => {
      const unitPrice = parseFloat(p.unit_price) || 0;
      const totalPrice = parseFloat(p.total_price) || 0;
      const productDiscountAmount = parseFloat(p.discount_amount || 0);

      // Look up per-product tax rate from menu item
      const productTaxRate = booking.tax_invoice_required ? (menuTaxMap.get(p.menu_item_id) || 0) : 0;
      const taxAmount = productTaxRate > 0 ? totalPrice * (productTaxRate / 100) : 0;

      return {
        name: getLocalizedString(p.product_name, 'Product'),
        category: getLocalizedString(p.category_name),
        quantity: p.quantity || 1,
        originalUnitPrice: unitPrice,
        discount: productDiscountAmount > 0 ? {
          voucherCode: p.voucher_code,
          discountType: p.discount_type,
          discountValue: parseFloat(p.discount_value || 0),
          discountAmount: productDiscountAmount,
        } : null,
        finalUnitPrice: unitPrice,
        subtotal: totalPrice,
        taxRate: productTaxRate,
        taxAmount: taxAmount,
        total: totalPrice + taxAmount,
        bookingTentId: p.booking_tent_id || null,
        menuItemId: p.menu_item_id || null,
        voucherCode: p.voucher_code || null,
        discountAmount: productDiscountAmount,
        servingDate: p.serving_date || null,
      };
    });

    // Fetch additional costs
    const additionalCostsResult = await client.query(
      `SELECT id, name, quantity, unit_price, total_price, tax_rate, tax_amount, notes
       FROM glamping_booking_additional_costs
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    const additionalCosts = additionalCostsResult.rows.map(ac => ({
      id: ac.id,
      name: ac.name,
      quantity: ac.quantity,
      unitPrice: parseFloat(ac.unit_price || '0'),
      totalPrice: parseFloat(ac.total_price || '0'),
      taxRate: parseFloat(ac.tax_rate || '0'),
      taxAmount: parseFloat(ac.tax_amount || '0'),
      notes: ac.notes || null,
    }));

    // Calculate totals (including per-item discounts)
    const accommodationTotal = itemsResult.rows.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    const productsTotal = productsResult.rows.reduce((sum, p) => sum + (parseFloat(p.total_price) || 0), 0);
    const additionalCostsTotal = additionalCosts.reduce((sum, c) => sum + c.totalPrice, 0);

    // Sum per-tent discounts
    const totalTentDiscounts = tentsResult.rows.reduce((sum, t) => sum + (parseFloat(t.discount_amount) || 0), 0);
    // Sum per-product discounts
    const totalProductDiscounts = productsResult.rows.reduce((sum, p) => sum + (parseFloat(p.discount_amount) || 0), 0);

    const subtotal = accommodationTotal + productsTotal + additionalCostsTotal;

    // Sum tax from per-item amounts
    const accommodationTax = nightlyPricing.reduce((sum, n) => sum + n.taxAmount, 0);
    const productsTax = products.reduce((sum, p) => sum + p.taxAmount, 0);
    const additionalCostsTax = additionalCosts.reduce((sum, c) => sum + c.taxAmount, 0);
    const totalTax = accommodationTax + productsTax + additionalCostsTax;

    return NextResponse.json({
      booking: {
        id: booking.id,
        reference: booking.booking_code,
        checkIn: booking.check_in_date,
        checkOut: booking.check_out_date,
        nights: booking.nights,
        totalGuests: booking.total_guests,
        guests: booking.guests,
        taxRate: parseFloat(booking.tax_rate) || 10,
        taxEnabled: booking.tax_invoice_required,
        status: booking.status,
        paymentStatus: booking.payment_status,
        createdAt: booking.created_at,
      },
      nightlyPricing,
      products,
      additionalCosts,
      voucherApplied: null,
      tentDiscounts: tentsResult.rows
        .filter(t => t.voucher_code)
        .map(t => ({
          tentId: t.id,
          itemId: t.item_id,
          voucherCode: t.voucher_code,
          discountType: t.discount_type,
          discountValue: parseFloat(t.discount_value || 0),
          discountAmount: parseFloat(t.discount_amount || 0),
        })),
      totals: {
        accommodationBeforeDiscount: accommodationTotal,
        accommodationDiscounts: totalTentDiscounts,
        accommodationAfterDiscount: accommodationTotal - totalTentDiscounts,
        productsBeforeDiscount: productsTotal,
        productsDiscounts: totalProductDiscounts,
        productsAfterDiscount: productsTotal - totalProductDiscounts,
        productsTax: productsTax,
        additionalCostsTotal: additionalCostsTotal,
        additionalCostsTax: additionalCostsTax,
        subtotal: subtotal,
        accommodationTax: accommodationTax,
        totalTax: totalTax,
        totalDiscount: parseFloat(booking.discount_amount) || 0,
        grandTotal: parseFloat(booking.total_amount),
      },
    });
  } catch (error) {
    console.error("Error fetching glamping pricing details:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing details" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
