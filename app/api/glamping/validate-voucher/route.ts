import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// POST /api/glamping/validate-voucher
// Validate a voucher code for a glamping booking
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      code,
      zoneId,
      itemId,
      checkIn,
      checkOut,
      totalAmount,
      customerId,
    } = body;

    // Validate required fields
    if (!code || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields: code and totalAmount" },
        { status: 400 }
      );
    }

    // Find the voucher in glamping_discounts
    const voucherQuery = `
      SELECT
        d.*
      FROM glamping_discounts d
      WHERE UPPER(d.code) = UPPER($1)
        AND d.code IS NOT NULL
    `;

    const voucherResult = await client.query(voucherQuery, [code]);

    if (voucherResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Mã voucher không hợp lệ" },
        { status: 404 }
      );
    }

    const voucher = voucherResult.rows[0];

    // Validation 1: Check if voucher is active
    if (voucher.status !== 'active') {
      return NextResponse.json(
        { error: "Voucher đã bị tạm dừng" },
        { status: 400 }
      );
    }

    // Validation 2: Check usage limit
    if (voucher.max_uses !== null && voucher.current_uses >= voucher.max_uses) {
      return NextResponse.json(
        { error: "Voucher đã hết lượt sử dụng" },
        { status: 400 }
      );
    }

    // Validation 3: Check recurrence and date validity
    const now = new Date();

    if (voucher.recurrence === 'date_range') {
      if (voucher.start_date && new Date(voucher.start_date) > now) {
        return NextResponse.json(
          { error: "Voucher chưa có hiệu lực" },
          { status: 400 }
        );
      }
      if (voucher.end_date && new Date(voucher.end_date) < now) {
        return NextResponse.json(
          { error: "Voucher đã hết hạn" },
          { status: 400 }
        );
      }
    } else if (voucher.recurrence === 'one_time') {
      // One-time vouchers can be used only once
      if (voucher.current_uses > 0) {
        return NextResponse.json(
          { error: "Voucher đã được sử dụng" },
          { status: 400 }
        );
      }
    }
    // 'always' recurrence has no date restrictions

    // Validation 4: Check weekly days (if applicable)
    if (voucher.weekly_days && Array.isArray(voucher.weekly_days) && voucher.weekly_days.length > 0 && checkIn) {
      const checkInDate = new Date(checkIn);
      const checkInDay = checkInDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      if (!voucher.weekly_days.includes(checkInDay)) {
        return NextResponse.json(
          { error: "Voucher không áp dụng cho ngày check-in này" },
          { status: 400 }
        );
      }
    }

    // Validation 5: Check zone restriction
    if (voucher.zone_id && zoneId && voucher.zone_id !== zoneId) {
      return NextResponse.json(
        { error: "Voucher không áp dụng cho khu glamping này" },
        { status: 400 }
      );
    }

    // Validation 6: Check application type (tent only for booking form)
    if (voucher.application_type !== 'tent') {
      return NextResponse.json(
        { error: "Voucher không áp dụng cho đặt phòng" },
        { status: 400 }
      );
    }

    // Validation 7: Check applicable items (if itemId provided)
    if (itemId) {
      const itemCheckQuery = `
        SELECT 1 FROM glamping_discount_items
        WHERE discount_id = $1 AND item_id = $2
      `;
      const itemCheckResult = await client.query(itemCheckQuery, [voucher.id, itemId]);

      // If discount has specific items, itemId must be in the list
      const hasItemsQuery = `
        SELECT COUNT(*) as count FROM glamping_discount_items WHERE discount_id = $1
      `;
      const hasItemsResult = await client.query(hasItemsQuery, [voucher.id]);
      const hasSpecificItems = parseInt(hasItemsResult.rows[0].count) > 0;

      if (hasSpecificItems && itemCheckResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Voucher không áp dụng cho loại lều này" },
          { status: 400 }
        );
      }
    }

    // TODO: Validation 8: Check rule_set conditions if rules_id is set
    // This would require evaluating the rule_set_rules against booking parameters
    // For now, we'll skip complex rule validation

    // Calculate discount amount
    let discountAmount = 0;
    if (voucher.type === "percentage") {
      discountAmount = (totalAmount * parseFloat(voucher.amount)) / 100;
    } else if (voucher.type === "fixed") {
      discountAmount = parseFloat(voucher.amount);
    }

    // Ensure discount doesn't exceed total
    discountAmount = Math.min(discountAmount, totalAmount);

    // Return valid voucher with discount details
    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        description: voucher.name, // glamping_discounts doesn't have separate description field
        discountType: voucher.type,
        discountValue: parseFloat(voucher.amount),
        isStackable: false, // glamping discounts don't have stackable field yet
      },
      discountAmount,
      finalAmount: totalAmount - discountAmount,
    });
  } catch (error) {
    console.error("Error validating glamping voucher:", error);
    return NextResponse.json(
      { error: "Không thể xác thực voucher" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
