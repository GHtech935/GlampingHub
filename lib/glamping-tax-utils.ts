/**
 * Glamping Per-Item Tax Utilities
 *
 * Shared logic for calculating VAT tax on a per-item basis.
 * Each tent may have its own tax rate (via glamping_item_taxes -> glamping_taxes),
 * and each menu product has its own tax_rate field.
 */

import { PoolClient } from 'pg';

export interface ItemTaxInfo {
  taxRate: number;
  isPercentage: boolean;
  taxName: string;
}

export interface PerItemTaxResult {
  totalTaxAmount: number;
  tentTaxDetails: Array<{
    bookingTentId: string;
    itemId: string;
    taxableAmount: number;
    taxRate: number;
    taxAmount: number;
  }>;
  productTaxDetails: Array<{
    bookingMenuProductId: string;
    menuItemId: string;
    taxableAmount: number;
    taxRate: number;
    taxAmount: number;
  }>;
}

/**
 * Get per-item tax rates for all items in a booking.
 *
 * - Tents: glamping_booking_tents.item_id -> glamping_item_taxes -> glamping_taxes (WHERE status = TRUE)
 * - Menu products: glamping_booking_menu_products.menu_item_id -> glamping_menu_items.tax_rate
 *
 * Returns two maps:
 *   itemTaxMap: Map<item_id, ItemTaxInfo>  (for tents/accommodation items)
 *   menuTaxMap: Map<menu_item_id, number>  (tax_rate for menu products)
 */
export async function getBookingItemTaxRates(
  client: PoolClient,
  bookingId: string
): Promise<{
  itemTaxMap: Map<string, ItemTaxInfo>;
  menuTaxMap: Map<string, number>;
}> {
  // 1. Get distinct item_ids from booking tents
  const tentItemsResult = await client.query(
    `SELECT DISTINCT bt.item_id
     FROM glamping_booking_tents bt
     WHERE bt.booking_id = $1`,
    [bookingId]
  );

  const itemTaxMap = new Map<string, ItemTaxInfo>();

  if (tentItemsResult.rows.length > 0) {
    const itemIds = tentItemsResult.rows.map((r: any) => r.item_id);

    // Query active taxes for these items
    const taxResult = await client.query(
      `SELECT
        git.item_id,
        gt.amount,
        gt.is_percentage,
        gt.name
       FROM glamping_item_taxes git
       JOIN glamping_taxes gt ON git.tax_id = gt.id
       WHERE git.item_id = ANY($1)
         AND gt.status = TRUE
       ORDER BY git.item_id`,
      [itemIds]
    );

    for (const row of taxResult.rows) {
      // Each item should only have 1 active tax; take the first one found
      if (!itemTaxMap.has(row.item_id)) {
        itemTaxMap.set(row.item_id, {
          taxRate: parseFloat(row.amount) || 0,
          isPercentage: row.is_percentage !== false,
          taxName: row.name || 'VAT',
        });
      }
    }
  }

  // 2. Get distinct menu_item_ids from booking menu products and their tax_rate
  const menuResult = await client.query(
    `SELECT DISTINCT bmp.menu_item_id, mi.tax_rate
     FROM glamping_booking_menu_products bmp
     JOIN glamping_menu_items mi ON bmp.menu_item_id = mi.id
     WHERE bmp.booking_id = $1`,
    [bookingId]
  );

  const menuTaxMap = new Map<string, number>();
  for (const row of menuResult.rows) {
    menuTaxMap.set(row.menu_item_id, parseFloat(row.tax_rate) || 0);
  }

  return { itemTaxMap, menuTaxMap };
}

/**
 * Calculate per-item tax for a booking.
 *
 * For each tent:
 *   taxableAmount = subtotal - discount_amount
 *   taxAmount = taxableAmount * (taxRate / 100)   (0 if no tax configured)
 *
 * For each menu product:
 *   taxableAmount = total_price - discount_amount
 *   taxAmount = taxableAmount * (taxRate / 100)   (0 if tax_rate = 0)
 */
export async function calculatePerItemTax(
  client: PoolClient,
  bookingId: string
): Promise<PerItemTaxResult> {
  const { itemTaxMap, menuTaxMap } = await getBookingItemTaxRates(client, bookingId);

  // Get tent-level data (subtotal, discount)
  const tentsResult = await client.query(
    `SELECT
      bt.id as booking_tent_id,
      bt.item_id,
      bt.subtotal,
      COALESCE(bt.discount_amount, 0) as discount_amount
     FROM glamping_booking_tents bt
     WHERE bt.booking_id = $1`,
    [bookingId]
  );

  const tentTaxDetails: PerItemTaxResult['tentTaxDetails'] = [];
  let totalTaxAmount = 0;

  for (const tent of tentsResult.rows) {
    const subtotal = parseFloat(tent.subtotal) || 0;
    const discountAmount = parseFloat(tent.discount_amount) || 0;
    const taxableAmount = subtotal - discountAmount;

    const taxInfo = itemTaxMap.get(tent.item_id);
    const taxRate = taxInfo ? taxInfo.taxRate : 0;
    const taxAmount = taxRate > 0 ? Math.round(taxableAmount * (taxRate / 100)) : 0;

    tentTaxDetails.push({
      bookingTentId: tent.booking_tent_id,
      itemId: tent.item_id,
      taxableAmount,
      taxRate,
      taxAmount,
    });

    totalTaxAmount += taxAmount;
  }

  // Get menu product-level data
  const productsResult = await client.query(
    `SELECT
      bmp.id as booking_menu_product_id,
      bmp.menu_item_id,
      bmp.total_price,
      COALESCE(bmp.discount_amount, 0) as discount_amount
     FROM glamping_booking_menu_products bmp
     WHERE bmp.booking_id = $1`,
    [bookingId]
  );

  const productTaxDetails: PerItemTaxResult['productTaxDetails'] = [];

  for (const product of productsResult.rows) {
    const totalPrice = parseFloat(product.total_price) || 0;
    const discountAmount = parseFloat(product.discount_amount) || 0;
    const taxableAmount = totalPrice - discountAmount;

    const taxRate = menuTaxMap.get(product.menu_item_id) || 0;
    const taxAmount = taxRate > 0 ? Math.round(taxableAmount * (taxRate / 100)) : 0;

    productTaxDetails.push({
      bookingMenuProductId: product.booking_menu_product_id,
      menuItemId: product.menu_item_id,
      taxableAmount,
      taxRate,
      taxAmount,
    });

    totalTaxAmount += taxAmount;
  }

  return {
    totalTaxAmount,
    tentTaxDetails,
    productTaxDetails,
  };
}
