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

    // Get booking items (accommodation only, excluding addons) with tent reference
    // Filter out addon items to show only tent parameters in Financial tab
    const itemsResult = await client.query(
      `SELECT
        bi.id,
        bi.item_id,
        bi.addon_item_id,
        bi.booking_tent_id,
        bi.parameter_id,
        bi.quantity,
        bi.unit_price,
        bi.total_price,
        bi.metadata,
        i.name as item_name,
        ai.name as addon_item_name,
        p.name as parameter_name,
        z.name as zone_name
      FROM glamping_booking_items bi
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_items ai ON bi.addon_item_id = ai.id
      LEFT JOIN glamping_parameters p ON bi.parameter_id = p.id
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      WHERE bi.booking_id = $1
        AND (bi.metadata IS NULL OR bi.metadata->>'type' IS NULL OR bi.metadata->>'type' != 'addon')
      ORDER BY bi.created_at`,
      [id]
    );

    // Get booking tents with discount info and subtotal override
    const tentsResult = await client.query(
      `SELECT
        bt.id,
        bt.item_id,
        bt.subtotal,
        bt.subtotal_override,
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

    // Get menu products with tent reference + discount fields + subtotal_override
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
        bp.subtotal_override,
        mi.name as product_name,
        mc.name as category_name
      FROM glamping_booking_menu_products bp
      LEFT JOIN glamping_menu_items mi ON bp.menu_item_id = mi.id
      LEFT JOIN glamping_menu_categories mc ON mi.category_id = mc.id
      WHERE bp.booking_id = $1
      ORDER BY bp.created_at`,
      [id]
    );

    // Get addon items (common items) - stored in glamping_booking_items with metadata.type = 'addon'
    const addonsResult = await client.query(
      `SELECT
        bi.id,
        bi.item_id,
        bi.addon_item_id,
        bi.booking_tent_id,
        bi.parameter_id,
        bi.quantity,
        bi.unit_price,
        bi.total_price,
        bi.metadata,
        i.name as item_name,
        ai.name as addon_item_name,
        p.name as parameter_name
      FROM glamping_booking_items bi
      LEFT JOIN glamping_items i ON bi.item_id = i.id
      LEFT JOIN glamping_items ai ON bi.addon_item_id = ai.id
      LEFT JOIN glamping_parameters p ON bi.parameter_id = p.id
      WHERE bi.booking_id = $1
        AND bi.metadata->>'type' = 'addon'
      ORDER BY bi.created_at`,
      [id]
    );

    // Get per-item tax rates
    const { itemTaxMap, menuTaxMap } = await getBookingItemTaxRates(client, id);

    // Build nightly pricing (simplified for glamping - one entry per item)
    const nightlyPricing = itemsResult.rows.map((item) => {
      const unitPrice = parseFloat(item.unit_price) || 0;
      const quantity = item.quantity || 1;
      const metadata = item.metadata || {};
      const pricingMode = metadata.pricingMode || 'per_person';
      const isAddon = metadata.type === 'addon';

      // For per_group pricing, the subtotal is just the unit_price (package price for whole group)
      // For per_person pricing, the subtotal is unit_price × quantity
      const calculatedSubtotal = pricingMode === 'per_group' ? unitPrice : unitPrice * quantity;

      // Check for price override in metadata (supports both priceOverride and legacy subtotalOverride)
      const priceOverride = metadata.priceOverride !== undefined && metadata.priceOverride !== null
        ? parseFloat(metadata.priceOverride)
        : (metadata.subtotalOverride !== undefined && metadata.subtotalOverride !== null
          ? parseFloat(metadata.subtotalOverride)
          : null);

      // Use override if present, otherwise use calculated
      const effectiveSubtotal = priceOverride !== null ? priceOverride : calculatedSubtotal;

      // Look up per-item tax rate
      const itemTaxInfo = item.item_id ? itemTaxMap.get(item.item_id) : undefined;
      const itemTaxRate = booking.tax_invoice_required && itemTaxInfo ? itemTaxInfo.taxRate : 0;
      const taxAmount = itemTaxRate > 0 ? effectiveSubtotal * (itemTaxRate / 100) : 0;

      // Get tent discount info and override
      const tentDiscount = item.booking_tent_id ? tentsDiscountMap.get(item.booking_tent_id) : null;
      const tentSubtotalOverride = tentDiscount?.subtotal_override !== null && tentDiscount?.subtotal_override !== undefined
        ? parseFloat(tentDiscount.subtotal_override)
        : null;

      // Extract addon voucher from metadata (common items store voucher in metadata.voucher)
      const addonVoucher = isAddon && metadata.voucher ? metadata.voucher : null;

      // For addon items, use addon_item_name; otherwise use item_name
      const itemName = isAddon && item.addon_item_name
        ? getLocalizedString(item.addon_item_name, 'Addon')
        : getLocalizedString(item.item_name, 'Accommodation');

      return {
        date: new Date(booking.check_in_date).toISOString().split('T')[0],
        subtotalBeforeDiscounts: effectiveSubtotal,
        subtotalAfterDiscounts: effectiveSubtotal,
        discounts: [],
        itemName: itemName,
        parameterName: getLocalizedString(item.parameter_name),
        zoneName: getLocalizedString(item.zone_name),
        quantity: quantity,
        unitPrice: unitPrice,
        pricingMode: pricingMode,
        taxRate: itemTaxRate,
        taxAmount: taxAmount,
        bookingTentId: item.booking_tent_id || null,
        itemId: item.item_id || null,
        addonItemId: item.addon_item_id || null,
        tentVoucherCode: tentDiscount?.voucher_code || null,
        tentDiscountAmount: parseFloat(tentDiscount?.discount_amount || 0),
        tentSubtotalOverride: tentSubtotalOverride,
        voucherCode: addonVoucher?.code || null,
        discountAmount: parseFloat(addonVoucher?.discountAmount || 0),
        isAddon: isAddon,
        priceOverride: priceOverride,
      };
    });

    // Build products list (with per-product discount and per-product tax)
    const products = productsResult.rows.map(p => {
      const unitPrice = parseFloat(p.unit_price) || 0;
      const quantity = p.quantity || 1;
      const calculatedTotalPrice = unitPrice * quantity;
      const productDiscountAmount = parseFloat(p.discount_amount || 0);

      // Check for price override from subtotal_override column
      const subtotalOverride = p.subtotal_override !== null && p.subtotal_override !== undefined
        ? parseFloat(p.subtotal_override)
        : null;

      // Use override if present, otherwise use total_price from DB (or calculated)
      const effectiveTotalPrice = subtotalOverride !== null
        ? subtotalOverride
        : (parseFloat(p.total_price) || calculatedTotalPrice);

      // Look up per-product tax rate from menu item
      const productTaxRate = booking.tax_invoice_required ? (menuTaxMap.get(p.menu_item_id) || 0) : 0;
      const taxAmount = productTaxRate > 0 ? effectiveTotalPrice * (productTaxRate / 100) : 0;

      return {
        name: getLocalizedString(p.product_name, 'Product'),
        category: getLocalizedString(p.category_name),
        quantity: quantity,
        originalUnitPrice: unitPrice,
        discount: productDiscountAmount > 0 ? {
          voucherCode: p.voucher_code,
          discountType: p.discount_type,
          discountValue: parseFloat(p.discount_value || 0),
          discountAmount: productDiscountAmount,
        } : null,
        finalUnitPrice: unitPrice,
        subtotal: effectiveTotalPrice,
        taxRate: productTaxRate,
        taxAmount: taxAmount,
        total: effectiveTotalPrice + taxAmount,
        bookingTentId: p.booking_tent_id || null,
        menuItemId: p.menu_item_id || null,
        voucherCode: p.voucher_code || null,
        discountAmount: productDiscountAmount,
        servingDate: p.serving_date || null,
        subtotalOverride: subtotalOverride,
      };
    });

    // Build addon items list (common items)
    const addonItems = addonsResult.rows.map(item => {
      const unitPrice = parseFloat(item.unit_price) || 0;
      const quantity = item.quantity || 1;
      const metadata = item.metadata || {};
      const pricingMode = metadata.pricingMode || 'per_person';

      // For per_group pricing, the subtotal is just the unit_price (package price for whole group)
      // For per_person pricing, the subtotal is unit_price × quantity
      const calculatedSubtotal = pricingMode === 'per_group' ? unitPrice : unitPrice * quantity;

      // Check for price override in metadata (supports both priceOverride and legacy subtotalOverride)
      const priceOverride = metadata.priceOverride !== undefined && metadata.priceOverride !== null
        ? parseFloat(metadata.priceOverride)
        : (metadata.subtotalOverride !== undefined && metadata.subtotalOverride !== null
          ? parseFloat(metadata.subtotalOverride)
          : null);

      // Use override if present, otherwise use calculated
      const effectiveSubtotal = priceOverride !== null ? priceOverride : calculatedSubtotal;

      // Look up per-item tax rate from addon_item_id
      const addonItemId = item.addon_item_id;
      const itemTaxInfo = addonItemId ? itemTaxMap.get(addonItemId) : undefined;
      const itemTaxRate = booking.tax_invoice_required && itemTaxInfo ? itemTaxInfo.taxRate : 0;
      const taxAmount = itemTaxRate > 0 ? effectiveSubtotal * (itemTaxRate / 100) : 0;

      // Extract addon voucher from metadata (common items store voucher in metadata.voucher)
      const addonVoucher = metadata.voucher || null;

      // For addon items, use addon_item_name
      const itemName = item.addon_item_name
        ? getLocalizedString(item.addon_item_name, 'Addon')
        : getLocalizedString(item.item_name, 'Item chung');

      return {
        id: item.id,
        name: itemName,
        parameterName: getLocalizedString(item.parameter_name),
        quantity: quantity,
        unitPrice: unitPrice,
        pricingMode: pricingMode,
        subtotal: effectiveSubtotal,
        taxRate: itemTaxRate,
        taxAmount: taxAmount,
        total: effectiveSubtotal + taxAmount,
        bookingTentId: item.booking_tent_id || null,
        addonItemId: addonItemId || null,
        voucherCode: addonVoucher?.code || null,
        discountAmount: parseFloat(addonVoucher?.discountAmount || 0),
        priceOverride: priceOverride,
        dates: metadata.dates || null,
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
    // For tents: use subtotal_override if set, otherwise use calculated subtotal from booking_items
    // Group booking_items by tent to calculate per-tent totals
    const tentCalculatedTotals = new Map<string, number>();
    nightlyPricing.forEach(item => {
      if (item.bookingTentId) {
        const current = tentCalculatedTotals.get(item.bookingTentId) || 0;
        tentCalculatedTotals.set(item.bookingTentId, current + item.subtotalAfterDiscounts);
      }
    });

    // Calculate accommodation total using stored tent subtotals from DB
    // (not recalculated from booking_items, which may have missing pricingMode for older bookings)
    const accommodationTotal = tentsResult.rows.reduce((sum, tent) => {
      const hasOverride = tent.subtotal_override !== null && tent.subtotal_override !== undefined;
      const effectiveSubtotal = hasOverride
        ? parseFloat(tent.subtotal_override)
        : parseFloat(tent.subtotal || '0');
      return sum + effectiveSubtotal;
    }, 0);

    const productsTotal = productsResult.rows.reduce((sum, p) => {
      // Use subtotal_override if present, otherwise use total_price
      const override = p.subtotal_override !== null && p.subtotal_override !== undefined
        ? parseFloat(p.subtotal_override)
        : null;
      return sum + (override !== null ? override : (parseFloat(p.total_price) || 0));
    }, 0);
    // Group addon items by (addonItemId + bookingTentId) to handle priceOverride correctly
    // When priceOverride exists, each row has the full override as subtotal,
    // but the override is for the whole group → must count only once per group
    const addonGroupTotalsMap = new Map<string, { subtotal: number; priceOverride: number | null }>();
    addonItems.forEach(a => {
      const key = `${a.addonItemId || 'none'}_${a.bookingTentId || 'none'}`;
      if (!addonGroupTotalsMap.has(key)) {
        addonGroupTotalsMap.set(key, { subtotal: 0, priceOverride: a.priceOverride });
      }
      const group = addonGroupTotalsMap.get(key)!;
      group.subtotal += a.subtotal;
    });
    let addonsTotal = 0;
    addonGroupTotalsMap.forEach(group => {
      if (group.priceOverride !== null) {
        addonsTotal += group.priceOverride; // Use override once per group
      } else {
        addonsTotal += group.subtotal;
      }
    });

    const additionalCostsTotal = additionalCosts.reduce((sum, c) => sum + c.totalPrice, 0);

    // Sum per-tent discounts
    const totalTentDiscounts = tentsResult.rows.reduce((sum, t) => sum + (parseFloat(t.discount_amount) || 0), 0);
    // Sum per-product discounts
    const totalProductDiscounts = productsResult.rows.reduce((sum, p) => sum + (parseFloat(p.discount_amount) || 0), 0);
    // Sum per-addon discounts (grouped to avoid double-counting per-row)
    const addonDiscountGroupMap = new Map<string, number>();
    addonItems.forEach(a => {
      const key = `${a.addonItemId || 'none'}_${a.bookingTentId || 'none'}`;
      if (!addonDiscountGroupMap.has(key)) {
        addonDiscountGroupMap.set(key, a.discountAmount);
      }
    });
    const totalAddonDiscounts = Array.from(addonDiscountGroupMap.values()).reduce((sum, d) => sum + d, 0);

    const subtotal = accommodationTotal + productsTotal + addonsTotal + additionalCostsTotal;

    // Calculate accommodation tax based on stored tent subtotals (with overrides)
    const accommodationTax = booking.tax_invoice_required
      ? tentsResult.rows.reduce((sum, tent) => {
          const hasOverride = tent.subtotal_override !== null && tent.subtotal_override !== undefined;
          const effectiveSubtotal = hasOverride
            ? parseFloat(tent.subtotal_override)
            : parseFloat(tent.subtotal || '0');
          // Get tax rate for this tent's item
          const itemTaxInfo = tent.item_id ? itemTaxMap.get(tent.item_id) : undefined;
          const taxRate = itemTaxInfo ? itemTaxInfo.taxRate : 0;
          return sum + (effectiveSubtotal * (taxRate / 100));
        }, 0)
      : 0;
    const productsTax = products.reduce((sum, p) => sum + p.taxAmount, 0);
    // Calculate addon tax using grouped totals (consistent with addonsTotal grouping)
    let addonsTax = 0;
    const addonGroupTaxMap = new Map<string, { taxAmount: number; priceOverride: number | null; items: typeof addonItems }>();
    addonItems.forEach(a => {
      const key = `${a.addonItemId || 'none'}_${a.bookingTentId || 'none'}`;
      if (!addonGroupTaxMap.has(key)) {
        addonGroupTaxMap.set(key, { taxAmount: 0, priceOverride: a.priceOverride, items: [] });
      }
      const group = addonGroupTaxMap.get(key)!;
      group.taxAmount += a.taxAmount;
      group.items.push(a);
    });
    addonGroupTaxMap.forEach(group => {
      if (group.priceOverride !== null && group.items.length > 1) {
        // Recalculate tax for the single override amount
        const avgTaxRate = group.items.reduce((sum, i) => sum + i.taxRate, 0) / group.items.length;
        addonsTax += group.priceOverride * (avgTaxRate / 100);
      } else {
        addonsTax += group.taxAmount;
      }
    });
    const additionalCostsTax = additionalCosts.reduce((sum, c) => sum + c.taxAmount, 0);
    const totalTax = accommodationTax + productsTax + addonsTax + additionalCostsTax;

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
      addonItems,
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
      tentOverrides: tentsResult.rows
        .filter(t => t.subtotal_override !== null && t.subtotal_override !== undefined)
        .map(t => ({
          tentId: t.id,
          itemId: t.item_id,
          calculatedSubtotal: parseFloat(t.subtotal || 0),
          overrideSubtotal: parseFloat(t.subtotal_override),
        })),
      // Per-tent stored subtotals from DB (used by financial tab for correct totals
      // when booking_items metadata.pricingMode is missing for older bookings)
      tentSubtotals: tentsResult.rows.map(t => ({
        tentId: t.id,
        storedSubtotal: parseFloat(t.subtotal || 0),
        overrideSubtotal: t.subtotal_override !== null && t.subtotal_override !== undefined
          ? parseFloat(t.subtotal_override)
          : null,
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
