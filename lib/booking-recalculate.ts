/**
 * Booking Recalculation Utilities
 *
 * This module provides functions to recalculate booking totals
 * after product changes (add, update, cancel).
 */

import pool from '@/lib/db';
import { PoolClient } from 'pg';

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
