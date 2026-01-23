import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { calculateGlampingPricing } from '@/lib/glamping-pricing';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const itemId = searchParams.get('itemId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const adults = parseInt(searchParams.get('adults') || '2');
    const children = parseInt(searchParams.get('children') || '0');
    const discountCode = searchParams.get('discountCode');

    if (!itemId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Parse parameter quantities from param_* query params
    const parameterQuantities: Record<string, number> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('param_')) {
        const paramId = key.substring(6); // Remove 'param_' prefix
        const quantity = parseInt(value);
        if (!isNaN(quantity) && quantity > 0) {
          parameterQuantities[paramId] = quantity;
        }
      }
    });

    // Fetch item details with pricing and parameters
    const itemQuery = `
      SELECT
        i.*,
        z.id as zone_id,
        z.name as zone_name,
        z.bank_account_id,
        json_agg(DISTINCT jsonb_build_object(
          'parameter_id', ip.parameter_id,
          'id', p.id,
          'name', p.name,
          'color_code', p.color_code
        )) FILTER (WHERE ip.parameter_id IS NOT NULL) as parameters,
        json_agg(DISTINCT jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'amount', t.amount,
          'is_percentage', t.is_percentage
        )) FILTER (WHERE it.tax_id IS NOT NULL) as taxes
      FROM glamping_items i
      LEFT JOIN glamping_zones z ON i.zone_id = z.id
      LEFT JOIN glamping_item_parameters ip ON i.id = ip.item_id
      LEFT JOIN glamping_parameters p ON ip.parameter_id = p.id
      LEFT JOIN glamping_item_taxes it ON i.id = it.item_id
      LEFT JOIN glamping_taxes t ON it.tax_id = t.id
      WHERE i.id = $1
      GROUP BY i.id, z.id, z.name, z.bank_account_id
    `;

    const itemResult = await pool.query(itemQuery, [itemId]);

    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const item = itemResult.rows[0];

    // Calculate nights
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    // Calculate pricing using the shared utility function
    const { parameterPricing, nightlyPricing: rawNightlyPricing } = await calculateGlampingPricing(
      pool,
      itemId,
      checkInDate,
      checkOutDate,
      parameterQuantities
    );

    // Calculate total accommodation cost
    let accommodationCost = 0;
    Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
      const paramTotalPrice = parameterPricing[paramId] || 0;
      accommodationCost += paramTotalPrice * quantity;
    });

    // Transform nightlyPricing to match NightlyBreakdown component format
    const nightlyPricing = rawNightlyPricing.map(night => {
      // Calculate subtotal for this night (sum of price * quantity for each parameter)
      let subtotal = 0;
      Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
        const paramPrice = night.parameters[paramId] || 0;
        subtotal += paramPrice * quantity;
      });

      return {
        date: night.date,
        basePitchPrice: subtotal,
        extraAdults: { count: 0, priceEach: 0, total: 0 },
        extraChildren: { count: 0, priceEach: 0, total: 0 },
        subtotalBeforeDiscounts: subtotal,
        discounts: [] as Array<{ name: string; code: string | null; category: string; type: string; value: number; amount: number }>,
        subtotalAfterDiscounts: subtotal,
        // Also keep raw parameters for glamping-specific display
        parameters: night.parameters,
      };
    });

    // Apply discount code if provided
    let voucherDiscount = 0;
    let discountDetails = null;

    if (discountCode) {
      // Call validate-voucher API to validate and calculate discount
      try {
        const validateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/glamping/validate-voucher`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: discountCode,
            zoneId: item.zone_id,
            itemId,
            checkIn,
            checkOut,
            totalAmount: accommodationCost,
          }),
        });

        if (validateResponse.ok) {
          const voucherData = await validateResponse.json();
          voucherDiscount = voucherData.discountAmount || 0;
          discountDetails = {
            code: voucherData.voucher.code,
            type: voucherData.voucher.discountType,
            value: voucherData.voucher.discountValue,
            amount: voucherDiscount,
          };
        }
      } catch (error) {
        console.error('Error validating voucher:', error);
        // Continue without discount if validation fails
      }
    }

    const accommodationAfterDiscount = accommodationCost - voucherDiscount;

    // Tax info (from item)
    let taxInfo = null;
    if (item.taxes && item.taxes.length > 0) {
      const firstTax = item.taxes[0];
      if (firstTax && firstTax.is_percentage) {
        taxInfo = {
          name: firstTax.name,
          rate: parseFloat(firstTax.amount),
          amount: 0, // Tax not applied by default
        };
      }
    }

    // Calculate deposit if required
    // For now, we'll use full payment (you can customize this based on zone settings)
    const depositInfo = {
      type: 'percentage',
      value: 100,
      amount: accommodationAfterDiscount,
      balance: 0,
    };

    // Return pricing breakdown
    return NextResponse.json({
      nights,
      parameterQuantities,
      parameterPricing, // Price per parameter for all nights
      nightlyPricing, // Breakdown by date
      totals: {
        accommodationCost,
        voucherDiscount,
        accommodationAfterDiscount,
        taxAmount: 0,
        grandTotal: accommodationAfterDiscount,
      },
      taxInfo,
      depositInfo,
      discountDetails,
    });
  } catch (error: any) {
    console.error('Error calculating pricing:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
