import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, isStaffSession } from "@/lib/auth";

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

    // Get booking items (accommodation)
    const itemsResult = await client.query(
      `SELECT
        bi.id,
        bi.item_id,
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

    // Get menu products
    const productsResult = await client.query(
      `SELECT
        bp.id,
        bp.menu_item_id,
        bp.quantity,
        bp.unit_price,
        bp.total_price,
        mi.name as product_name,
        mc.name as category_name
      FROM glamping_booking_menu_products bp
      LEFT JOIN glamping_menu_items mi ON bp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE bp.booking_id = $1
      ORDER BY bp.created_at`,
      [id]
    );

    // Calculate tax rate
    const taxRate = booking.tax_invoice_required ? (parseFloat(booking.tax_rate) || 10) : 0;

    // Build nightly pricing (simplified for glamping - one entry per item)
    const nightlyPricing = itemsResult.rows.map((item, index) => {
      const unitPrice = parseFloat(item.unit_price) || 0;
      const totalPrice = parseFloat(item.total_price) || 0;
      const taxAmount = booking.tax_invoice_required ? totalPrice * (taxRate / 100) : 0;

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
        taxAmount: taxAmount,
      };
    });

    // Build products list
    const products = productsResult.rows.map(p => {
      const unitPrice = parseFloat(p.unit_price) || 0;
      const totalPrice = parseFloat(p.total_price) || 0;
      const taxAmount = booking.tax_invoice_required ? totalPrice * (taxRate / 100) : 0;

      return {
        name: getLocalizedString(p.product_name, 'Product'),
        category: getLocalizedString(p.category_name),
        quantity: p.quantity || 1,
        originalUnitPrice: unitPrice,
        discount: null,
        finalUnitPrice: unitPrice,
        subtotal: totalPrice,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: totalPrice + taxAmount,
      };
    });

    // Calculate totals
    const accommodationTotal = itemsResult.rows.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    const productsTotal = productsResult.rows.reduce((sum, p) => sum + (parseFloat(p.total_price) || 0), 0);
    const subtotal = accommodationTotal + productsTotal;
    const totalTax = booking.tax_invoice_required ? subtotal * (taxRate / 100) : 0;

    return NextResponse.json({
      booking: {
        id: booking.id,
        reference: booking.booking_code,
        checkIn: booking.check_in_date,
        checkOut: booking.check_out_date,
        nights: booking.nights,
        totalGuests: booking.total_guests,
        guests: booking.guests,
        taxRate: taxRate,
        taxEnabled: booking.tax_invoice_required,
        status: booking.status,
        paymentStatus: booking.payment_status,
        createdAt: booking.created_at,
      },
      nightlyPricing,
      products,
      voucherApplied: null,
      totals: {
        accommodationBeforeDiscount: accommodationTotal,
        accommodationDiscounts: 0,
        accommodationAfterDiscount: accommodationTotal,
        productsBeforeDiscount: productsTotal,
        productsDiscounts: 0,
        productsAfterDiscount: productsTotal,
        productsTax: booking.tax_invoice_required ? productsTotal * (taxRate / 100) : 0,
        subtotal: subtotal,
        accommodationTax: booking.tax_invoice_required ? accommodationTotal * (taxRate / 100) : 0,
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
