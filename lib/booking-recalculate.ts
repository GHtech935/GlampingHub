/**
 * Booking Recalculation Utilities
 *
 * This module provides functions to recalculate booking totals
 * after product changes (add, update, cancel).
 */

import pool from '@/lib/db';
import { PoolClient } from 'pg';
import { calculatePerItemTax } from '@/lib/glamping-tax-utils';

interface RecalculationResult {
  productsCost: number;
  productsTax: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
}

/**
 * Recalculate booking products cost and tax
 *
 * This function sums all ACTIVE products and updates the bookings table.
 * The GENERATED columns (total_amount, deposit_amount, balance_amount)
 * will auto-update when products_cost and products_tax change.
 *
 * @param client - Database client (for transaction support)
 * @param bookingId - The booking ID to recalculate
 * @returns The updated pricing details
 */
export async function recalculateBookingProducts(
  client: PoolClient,
  bookingId: string
): Promise<RecalculationResult> {
  // 1. Sum all ACTIVE products
  const productsResult = await client.query(`
    SELECT
      COALESCE(SUM(unit_price * quantity), 0) as products_cost,
      COALESCE(SUM((unit_price * quantity) * (tax_rate / 100)), 0) as products_tax
    FROM booking_products
    WHERE booking_id = $1 AND status = 'active'
  `, [bookingId]);

  const productsCost = parseFloat(productsResult.rows[0].products_cost || '0');
  const productsTax = parseFloat(productsResult.rows[0].products_tax || '0');

  // 2. Update bookings table
  // Note: total_amount, deposit_amount, balance_amount are GENERATED columns
  // They will auto-recalculate when products_cost and products_tax change
  const updateResult = await client.query(`
    UPDATE bookings
    SET
      products_cost = $1,
      products_tax = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING
      total_amount,
      deposit_amount,
      balance_amount
  `, [productsCost, productsTax, bookingId]);

  const booking = updateResult.rows[0];

  return {
    productsCost,
    productsTax,
    totalAmount: parseFloat(booking?.total_amount || '0'),
    depositAmount: parseFloat(booking?.deposit_amount || '0'),
    balanceAmount: parseFloat(booking?.balance_amount || '0'),
  };
}

/**
 * Recalculate booking products cost using pool connection
 *
 * Wrapper function that uses the pool directly when no transaction is needed.
 *
 * @param bookingId - The booking ID to recalculate
 * @returns The updated pricing details
 */
export async function recalculateBookingProductsWithPool(
  bookingId: string
): Promise<RecalculationResult> {
  const client = await pool.connect();
  try {
    return await recalculateBookingProducts(client, bookingId);
  } finally {
    client.release();
  }
}

/**
 * Get the products discount info from a booking
 * Used to check if voucher should be applied to new products
 */
export async function getBookingProductsDiscountInfo(
  client: PoolClient,
  bookingId: string
): Promise<{
  discountId: string | null;
  discountName: string | null;
  discountCode: string | null;
  discountCategory: string | null;
  discountType: string | null;
  discountValue: number | null;
} | null> {
  // Check if booking has a voucher applied to products
  const result = await client.query(`
    SELECT
      bp.discount_id,
      bp.discount_name,
      bp.discount_code,
      bp.discount_category,
      bp.discount_type,
      bp.discount_value
    FROM booking_products bp
    WHERE bp.booking_id = $1
      AND bp.status = 'active'
      AND bp.discount_id IS NOT NULL
      AND bp.discount_category = 'vouchers'
    LIMIT 1
  `, [bookingId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    discountId: row.discount_id,
    discountName: row.discount_name,
    discountCode: row.discount_code,
    discountCategory: row.discount_category,
    discountType: row.discount_type,
    discountValue: parseFloat(row.discount_value || '0'),
  };
}

/**
 * Check if a voucher is still valid for products
 */
export async function isVoucherValidForProducts(
  client: PoolClient,
  discountId: string,
  productId: string
): Promise<boolean> {
  const result = await client.query(`
    SELECT
      d.id,
      d.is_active,
      d.valid_from,
      d.valid_until,
      d.applies_to,
      d.applicable_products
    FROM discounts d
    WHERE d.id = $1
      AND d.is_active = true
      AND (d.valid_from IS NULL OR d.valid_from <= NOW())
      AND (d.valid_until IS NULL OR d.valid_until >= NOW())
  `, [discountId]);

  if (result.rows.length === 0) {
    return false;
  }

  const discount = result.rows[0];

  // Check if discount applies to products
  if (discount.applies_to !== 'products' && discount.applies_to !== 'total') {
    return false;
  }

  // Check if product is in applicable_products (if specified)
  if (discount.applicable_products && Array.isArray(discount.applicable_products)) {
    if (discount.applicable_products.length > 0 && !discount.applicable_products.includes(productId)) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate discount amount for a product
 */
export function calculateProductDiscount(
  unitPrice: number,
  quantity: number,
  discountType: string,
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return (unitPrice * quantity * discountValue) / 100;
  } else if (discountType === 'fixed_amount') {
    // Fixed amount is per unit
    return discountValue * quantity;
  }
  return 0;
}

// ─── Glamping Booking Recalculation ─────────────────────────────────────────

interface GlampingBookingLiveTotal {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

/**
 * Read-only calculation of a glamping booking's live total from individual items.
 * Uses the same logic as recalculateGlampingBookingTotals but does NOT update the DB.
 * Use this when you need the true current total (e.g. payments tab, balance info).
 */
export async function getGlampingBookingLiveTotal(
  client: PoolClient,
  bookingId: string
): Promise<GlampingBookingLiveTotal> {
  // Get booking tax settings
  const bookingResult = await client.query(
    `SELECT tax_invoice_required FROM glamping_bookings WHERE id = $1`,
    [bookingId]
  );

  if (bookingResult.rows.length === 0) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  const { tax_invoice_required } = bookingResult.rows[0];

  const { subtotal, totalDiscount, additionalTax } = await _sumBookingItems(client, bookingId);
  const afterDiscount = subtotal - totalDiscount;

  let taxAmount = 0;
  if (tax_invoice_required) {
    const { totalTaxAmount } = await calculatePerItemTax(client, bookingId);
    taxAmount = totalTaxAmount + additionalTax;
  }

  const totalAmount = afterDiscount + taxAmount;

  return { subtotal, taxAmount, discountAmount: totalDiscount, totalAmount };
}

/**
 * Internal helper: sum all item costs, discounts, and additional costs for a booking.
 * Shared by both getGlampingBookingLiveTotal (read-only) and recalculateGlampingBookingTotals (read+write).
 */
async function _sumBookingItems(
  client: PoolClient,
  bookingId: string
): Promise<{ subtotal: number; totalDiscount: number; additionalTax: number }> {
  // Sum accommodation from glamping_booking_tents (supports subtotal_override)
  const tentResult = await client.query(
    `SELECT COALESCE(SUM(
       COALESCE(subtotal_override, subtotal)
     ), 0) as tent_total
     FROM glamping_booking_tents
     WHERE booking_id = $1`,
    [bookingId]
  );
  const tentTotal = parseFloat(tentResult.rows[0].tent_total);

  // Sum addon items (from glamping_booking_items where type = 'addon')
  const addonResult = await client.query(
    `WITH addon_groups AS (
       SELECT
         addon_item_id::text || '_' || COALESCE(booking_tent_id::text, 'none') as group_key,
         addon_item_id,
         metadata,
         unit_price,
         quantity
       FROM glamping_booking_items
       WHERE booking_id = $1
         AND metadata->>'type' = 'addon'
         AND addon_item_id IS NOT NULL
     ),
     grouped_totals AS (
       SELECT
         group_key,
         CASE
           WHEN COALESCE(MAX(metadata->>'priceOverride'), MAX(metadata->>'subtotalOverride')) IS NOT NULL
             THEN COALESCE((MAX(metadata->>'priceOverride'))::numeric, (MAX(metadata->>'subtotalOverride'))::numeric)
           ELSE SUM(
             CASE
               WHEN metadata->>'pricingMode' = 'per_group' THEN unit_price
               ELSE unit_price * quantity
             END
           )
         END as group_total
       FROM addon_groups
       GROUP BY group_key
     )
     SELECT COALESCE(SUM(group_total), 0) as addon_total
     FROM grouped_totals`,
    [bookingId]
  );
  const addonTotal = parseFloat(addonResult.rows[0].addon_total);

  const accommodationTotal = tentTotal + addonTotal;

  // Sum menu products
  const menuResult = await client.query(
    `SELECT COALESCE(SUM(
       COALESCE(subtotal_override, unit_price * quantity)
     ), 0) as menu_total
     FROM glamping_booking_menu_products
     WHERE booking_id = $1`,
    [bookingId]
  );
  const menuTotal = parseFloat(menuResult.rows[0].menu_total);

  // Sum additional costs
  const additionalCostsResult = await client.query(
    `SELECT
       COALESCE(SUM(total_price), 0) as additional_total,
       COALESCE(SUM(tax_amount), 0) as additional_tax
     FROM glamping_booking_additional_costs
     WHERE booking_id = $1`,
    [bookingId]
  );
  const additionalTotal = parseFloat(additionalCostsResult.rows[0].additional_total);
  const additionalTax = parseFloat(additionalCostsResult.rows[0].additional_tax);

  // Sum discount amounts from tents
  const tentDiscountResult = await client.query(
    `SELECT COALESCE(SUM(discount_amount), 0) as tent_discount
     FROM glamping_booking_tents
     WHERE booking_id = $1`,
    [bookingId]
  );
  const tentDiscount = parseFloat(tentDiscountResult.rows[0].tent_discount);

  // Sum discount amounts from menu products
  const menuDiscountResult = await client.query(
    `SELECT COALESCE(SUM(COALESCE(discount_amount, 0)), 0) as menu_discount
     FROM glamping_booking_menu_products
     WHERE booking_id = $1`,
    [bookingId]
  );
  const menuDiscount = parseFloat(menuDiscountResult.rows[0].menu_discount);

  // Sum discount amounts from addon items (voucher discounts stored in metadata)
  const addonDiscountResult = await client.query(
    `WITH addon_groups AS (
       SELECT
         addon_item_id::text || '_' || COALESCE(booking_tent_id::text, 'none') as group_key,
         metadata
       FROM glamping_booking_items
       WHERE booking_id = $1
         AND metadata->>'type' = 'addon'
         AND addon_item_id IS NOT NULL
     )
     SELECT
       group_key,
       COALESCE((MAX(metadata->'voucher'->>'discountAmount'))::numeric, 0) as group_discount
     FROM addon_groups
     GROUP BY group_key`,
    [bookingId]
  );
  let addonDiscount = 0;
  for (const row of addonDiscountResult.rows) {
    addonDiscount += parseFloat(row.group_discount || '0');
  }

  const subtotal = accommodationTotal + menuTotal + additionalTotal;
  const totalDiscount = tentDiscount + menuDiscount + addonDiscount;

  return { subtotal, totalDiscount, additionalTax };
}

/**
 * Recalculate glamping booking-level totals after any item edit/delete.
 * Sums accommodation items + menu products, applies tax if required.
 * Updates glamping_bookings with new totals.
 */
export async function recalculateGlampingBookingTotals(
  client: PoolClient,
  bookingId: string
): Promise<void> {
  // Get booking tax settings and current deposit/total to preserve ratio
  const bookingResult = await client.query(
    `SELECT tax_invoice_required, deposit_due, total_amount
     FROM glamping_bookings WHERE id = $1`,
    [bookingId]
  );

  if (bookingResult.rows.length === 0) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  const { tax_invoice_required } = bookingResult.rows[0];
  const oldDepositDue = parseFloat(bookingResult.rows[0].deposit_due || '0');
  const oldTotalAmount = parseFloat(bookingResult.rows[0].total_amount || '0');

  const { subtotal, totalDiscount, additionalTax } = await _sumBookingItems(client, bookingId);
  const afterDiscount = subtotal - totalDiscount;

  // Apply tax if required (per-item tax rates + additional costs tax)
  let taxAmount = 0;
  if (tax_invoice_required) {
    const { totalTaxAmount } = await calculatePerItemTax(client, bookingId);
    taxAmount = totalTaxAmount + additionalTax;
  }

  // total_amount is a GENERATED column (subtotal_amount + tax_amount - discount_amount)
  // so we only update the source columns; deposit/balance derived from the result
  const totalAmount = afterDiscount + taxAmount;

  // Get total paid from successful payments (needed for balance calculation)
  const paymentsResult = await client.query(
    `SELECT COALESCE(SUM(amount), 0) as total_paid
     FROM glamping_booking_payments
     WHERE booking_id = $1 AND status IN ('successful', 'completed', 'paid')`,
    [bookingId]
  );
  const totalPaid = parseFloat(paymentsResult.rows[0].total_paid);

  // Preserve the original deposit ratio instead of hardcoding 50%
  // Default to 100% (deposit = total, no balance) for admin pay_later bookings
  let depositRatio = 1;
  if (oldTotalAmount > 0 && oldDepositDue > 0) {
    depositRatio = oldDepositDue / oldTotalAmount;
  }

  const depositDue = Math.round(totalAmount * depositRatio);
  // Calculate balanceDue based on actual payments, not deposit amount
  const balanceDue = totalAmount - totalPaid;

  // Update booking totals (total_amount is generated — do not set it)
  await client.query(
    `UPDATE glamping_bookings SET
       subtotal_amount = $2,
       tax_amount = $3,
       discount_amount = $4,
       deposit_due = $5,
       balance_due = $6,
       updated_at = NOW()
     WHERE id = $1`,
    [bookingId, subtotal, taxAmount, totalDiscount, depositDue, balanceDue]
  );

  // ─── Auto-adjust payment_status based on total paid vs total amount ─────────
  // Get current payment_status
  const currentStatusResult = await client.query(
    `SELECT payment_status FROM glamping_bookings WHERE id = $1`,
    [bookingId]
  );
  const currentPaymentStatus = currentStatusResult.rows[0].payment_status;

  // Determine new payment_status (only adjust if there have been payments)
  let newPaymentStatus = currentPaymentStatus;
  if (totalPaid > 0) {
    if (totalPaid >= totalAmount) {
      newPaymentStatus = 'fully_paid';
    } else {
      newPaymentStatus = 'deposit_paid';
    }
  }

  // Update if payment_status changed
  if (newPaymentStatus !== currentPaymentStatus) {
    await client.query(
      `UPDATE glamping_bookings SET payment_status = $2 WHERE id = $1`,
      [bookingId, newPaymentStatus]
    );

    // Log to history
    await client.query(
      `INSERT INTO glamping_booking_status_history
       (booking_id, previous_payment_status, new_payment_status, action_type, description)
       SELECT $1, $2, $3, 'payment_status_adjust',
         'Auto-adjusted due to booking total change'
       FROM glamping_bookings WHERE id = $1`,
      [bookingId, currentPaymentStatus, newPaymentStatus]
    );
  }
}

/**
 * Log an edit/delete/add action to glamping booking history.
 */
export async function logGlampingBookingEditAction(
  client: PoolClient,
  bookingId: string,
  userId: string,
  actionType: 'item_edit' | 'item_delete' | 'item_add',
  description: string
): Promise<void> {
  // Verify user exists in users table to avoid FK constraint violation
  const userCheck = await client.query(
    `SELECT id FROM users WHERE id = $1`,
    [userId]
  );
  const validUserId = userCheck.rows.length > 0 ? userId : null;

  await client.query(
    `INSERT INTO glamping_booking_status_history
     (booking_id, previous_status, new_status, previous_payment_status, new_payment_status,
      changed_by_user_id, action_type, description)
     SELECT
       $1,
       status, status,
       payment_status, payment_status,
       $2, $3, $4
     FROM glamping_bookings WHERE id = $1`,
    [bookingId, validUserId, actionType, description]
  );
}
