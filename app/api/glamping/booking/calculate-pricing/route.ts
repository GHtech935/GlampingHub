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
        if (!isNaN(quantity) && quantity >= 0) {
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
    const missingPricing: string[] = [];

    console.log('[Pricing Debug] Parameter Quantities:', parameterQuantities);
    console.log('[Pricing Debug] Parameter Pricing:', parameterPricing);

    Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
      const paramTotalPrice = parameterPricing[paramId];

      // Check if pricing is missing or zero
      if (paramTotalPrice === undefined || paramTotalPrice === null) {
        console.warn(`[Pricing Warning] Missing pricing for parameter ${paramId}`);
        missingPricing.push(paramId);
      }

      // paramTotalPrice is price PER UNIT for all nights
      // Need to multiply by quantity
      const priceToAdd = (paramTotalPrice || 0) * quantity;
      accommodationCost += priceToAdd;

      // Debug logging for each parameter
      console.log(`[Pricing] Parameter ${paramId}: ${paramTotalPrice || 0}/unit × ${quantity} units = ${priceToAdd}`);
    });

    console.log(`[Pricing] Total Accommodation Cost (Method 1): ${accommodationCost}`);

    // Validation: Cross-check with nightly breakdown
    let validationTotal = 0;
    rawNightlyPricing.forEach(night => {
      Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
        const nightPrice = night.parameters[paramId] || 0;
        validationTotal += nightPrice * quantity;
      });
    });

    console.log(`[Pricing] Validation Total (Method 2 - from nightly breakdown): ${validationTotal}`);

    // If there's a mismatch, log error and use validation total
    if (Math.abs(validationTotal - accommodationCost) > 0.01) {
      console.error(`[Pricing] MISMATCH DETECTED! Method 1: ${accommodationCost}, Method 2: ${validationTotal}`);
      console.error('[Pricing] Using validation total (Method 2) as it sums nightly prices directly');
      accommodationCost = validationTotal;
    }

    // Check if all parameters have pricing
    if (missingPricing.length > 0) {
      console.error(`[Pricing] Parameters missing pricing configuration:`, missingPricing);
      return NextResponse.json(
        {
          error: 'Incomplete pricing data',
          details: 'Pricing not configured for some parameters on selected dates',
          missingParameters: missingPricing
        },
        { status: 400 }
      );
    }

    // Calculate menu products cost
    let menuProductsCost = 0;
    const menuProductsBreakdown: Array<{ id: string; name: string; quantity: number; price: number; total: number }> = [];

    // Parse menu product quantities from query params (menuProduct_* pattern)
    searchParams.forEach((value, key) => {
      if (key.startsWith('menuProduct_')) {
        const productId = key.substring(12); // Remove 'menuProduct_' prefix
        const quantity = parseInt(value);

        if (!isNaN(quantity) && quantity > 0) {
          // For now, we'll need to fetch product price from database
          // This is a simplified version; in production you'd fetch actual menu item data
          // For the modal's real-time pricing, the price is already known on client side
          // So this is mainly for validation
          menuProductsCost += quantity * 1000; // Placeholder - will be calculated properly in booking creation
        }
      }
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
        const validateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000'}/api/glamping/validate-voucher`, {
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
      menuProducts: menuProductsBreakdown,
      totals: {
        accommodationCost,
        menuProductsCost,
        grossSubtotal: accommodationCost + menuProductsCost,
        voucherDiscount,
        accommodationAfterDiscount: accommodationCost - voucherDiscount,
        taxAmount: 0,
        grandTotal: accommodationCost + menuProductsCost - voucherDiscount,
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
