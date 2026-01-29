import { PoolClient } from 'pg';

export interface VoucherValidationOptions {
  zoneId?: string;
  itemId?: string;
  checkIn?: string;
  checkOut?: string;
  totalAmount: number;
  applicationType?: 'all' | 'accommodation' | 'menu_only';
}

export interface VoucherValidationResult {
  valid: boolean;
  voucherId: string | null;
  voucherCode: string | null;
  discountAmount: number;
  discountType: string | null;
  discountValue: number;
  error?: string;
}

/**
 * Validate a voucher code directly using a DB client (no HTTP round-trip).
 * Uses SELECT ... FOR UPDATE to lock the voucher row and prevent race conditions.
 *
 * @param client - PoolClient (must be inside a transaction)
 * @param code - Voucher code to validate
 * @param options - Validation options
 * @param additionalUsesInTx - How many times this voucher has already been counted in the current transaction
 */
export async function validateVoucherDirect(
  client: PoolClient,
  code: string,
  options: VoucherValidationOptions,
  additionalUsesInTx: number = 0
): Promise<VoucherValidationResult> {
  const {
    zoneId,
    itemId,
    checkIn,
    totalAmount,
    applicationType = 'all',
  } = options;

  const fail = (error: string): VoucherValidationResult => ({
    valid: false,
    voucherId: null,
    voucherCode: null,
    discountAmount: 0,
    discountType: null,
    discountValue: 0,
    error,
  });

  if (!code || !totalAmount) {
    return fail('Missing required fields: code and totalAmount');
  }

  // Find and lock voucher row (FOR UPDATE prevents concurrent modifications)
  const voucherQuery = `
    SELECT d.*
    FROM glamping_discounts d
    WHERE UPPER(d.code) = UPPER($1)
      AND d.code IS NOT NULL
    FOR UPDATE
  `;

  const voucherResult = await client.query(voucherQuery, [code]);

  if (voucherResult.rows.length === 0) {
    return fail('Mã voucher không hợp lệ');
  }

  const voucher = voucherResult.rows[0];

  // Validation 1: Check if voucher is active
  if (voucher.status !== 'active') {
    return fail('Voucher đã bị tạm dừng');
  }

  // Validation 2: Check usage limit (including uses already counted in this transaction)
  if (
    voucher.max_uses !== null &&
    voucher.current_uses + additionalUsesInTx >= voucher.max_uses
  ) {
    return fail('Voucher đã hết lượt sử dụng');
  }

  // Validation 3: Check recurrence and date validity
  const now = new Date();

  if (voucher.recurrence === 'date_range') {
    if (voucher.start_date && new Date(voucher.start_date) > now) {
      return fail('Voucher chưa có hiệu lực');
    }
    if (voucher.end_date && new Date(voucher.end_date) < now) {
      return fail('Voucher đã hết hạn');
    }
  } else if (voucher.recurrence === 'one_time') {
    if (voucher.current_uses + additionalUsesInTx > 0) {
      return fail('Voucher đã được sử dụng');
    }
  }

  // Validation 4: Check weekly days
  if (
    voucher.weekly_days &&
    Array.isArray(voucher.weekly_days) &&
    voucher.weekly_days.length > 0 &&
    checkIn
  ) {
    const checkInDate = new Date(checkIn);
    const checkInDay = checkInDate.getDay();
    if (!voucher.weekly_days.includes(checkInDay)) {
      return fail('Voucher không áp dụng cho ngày check-in này');
    }
  }

  // Validation 5: Check zone restriction
  if (voucher.zone_id && zoneId && voucher.zone_id !== zoneId) {
    return fail('Voucher không áp dụng cho khu glamping này');
  }

  // Validation 6: Check application type
  const voucherAppType = voucher.application_type || 'all';

  if (applicationType !== 'all') {
    let mappedType = applicationType;
    if (applicationType === 'accommodation') {
      mappedType = 'tent' as any;
    } else if (applicationType === 'menu_only') {
      mappedType = 'menu' as any;
    }

    if (voucherAppType !== 'all' && voucherAppType !== mappedType) {
      const errorMessages: Record<string, string> = {
        accommodation: 'Voucher không áp dụng cho lưu trú',
        menu_only: 'Voucher không áp dụng cho món ăn',
      };
      return fail(
        errorMessages[applicationType] || 'Voucher không áp dụng cho loại này'
      );
    }
  }

  // Validation 7: Check applicable items
  if (itemId) {
    const hasItemsResult = await client.query(
      `SELECT COUNT(*) as count FROM glamping_discount_items WHERE discount_id = $1`,
      [voucher.id]
    );
    const hasSpecificItems = parseInt(hasItemsResult.rows[0].count) > 0;

    if (hasSpecificItems) {
      const itemCheckResult = await client.query(
        `SELECT 1 FROM glamping_discount_items WHERE discount_id = $1 AND item_id = $2`,
        [voucher.id, itemId]
      );
      if (itemCheckResult.rows.length === 0) {
        const errorMessage =
          applicationType === 'menu_only'
            ? 'Voucher không áp dụng cho món ăn này'
            : 'Voucher không áp dụng cho loại lều này';
        return fail(errorMessage);
      }
    }
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (voucher.type === 'percentage') {
    discountAmount = (totalAmount * parseFloat(voucher.amount)) / 100;
  } else if (voucher.type === 'fixed') {
    discountAmount = parseFloat(voucher.amount);
  }

  // Ensure discount doesn't exceed total
  discountAmount = Math.min(discountAmount, totalAmount);

  return {
    valid: true,
    voucherId: voucher.id,
    voucherCode: voucher.code,
    discountAmount,
    discountType: voucher.type,
    discountValue: parseFloat(voucher.amount),
  };
}
