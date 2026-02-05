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

    // Fetch item details with pricing and parameters (only active items)
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
      LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
      LEFT JOIN glamping_item_parameters ip ON i.id = ip.item_id
      LEFT JOIN glamping_parameters p ON ip.parameter_id = p.id
      LEFT JOIN glamping_item_taxes it ON i.id = it.item_id
      LEFT JOIN glamping_taxes t ON it.tax_id = t.id
      WHERE i.id = $1
        AND COALESCE(z.is_active, true) = true
        AND COALESCE(a.is_active, true) = true
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

    // Check for missing pricing
    const missingPricing: string[] = [];

    console.log('[Pricing Debug] Parameter Quantities:', parameterQuantities);
    console.log('[Pricing Debug] Raw Nightly Pricing:', rawNightlyPricing);

    // Check for missing pricing
    Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
      const paramTotalPrice = parameterPricing[paramId];
      if (paramTotalPrice === undefined || paramTotalPrice === null) {
        console.warn(`[Pricing Warning] Missing pricing for parameter ${paramId}`);
        missingPricing.push(paramId);
      }
    });


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
    // Note: subtotal calculation is left to client to apply pricing_mode correctly
    const nightlyPricing = rawNightlyPricing.map(night => {
      return {
        date: night.date,
        basePitchPrice: 0, // Client will calculate based on pricing_mode
        extraAdults: { count: 0, priceEach: 0, total: 0 },
        extraChildren: { count: 0, priceEach: 0, total: 0 },
        subtotalBeforeDiscounts: 0, // Client will calculate based on pricing_mode
        discounts: [] as Array<{ name: string; code: string | null; category: string; type: string; value: number; amount: number }>,
        subtotalAfterDiscounts: 0, // Client will calculate based on pricing_mode
        // Keep raw parameters for client-side calculation
        parameters: night.parameters,
        pricingModes: night.pricingModes,
      };
    });

    // Voucher validation is now handled by client

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


    // Extract pricing modes for each parameter (from first night, as it's consistent)
    const parameterPricingModes: Record<string, 'per_person' | 'per_group'> = {};
    if (rawNightlyPricing.length > 0) {
      Object.keys(parameterQuantities).forEach(paramId => {
        parameterPricingModes[paramId] = rawNightlyPricing[0].pricingModes?.[paramId] || 'per_person';
      });
    }

    // Return pricing breakdown
    // parameterPricing: Total price per parameter for ALL nights (NOT multiplied by quantity)
    // Client will multiply by quantity if pricingMode is 'per_person'
    // For 'per_group', client uses this value directly (fixed price for whole group)
    return NextResponse.json({
      nights,
      parameterQuantities,
      parameterPricing, // Total price per parameter for ALL nights (NOT multiplied by quantity)
      parameterPricingModes, // Pricing mode for each parameter ('per_person' or 'per_group')
      nightlyPricing, // Breakdown by date (client calculates subtotals)
      menuProducts: menuProductsBreakdown,
      taxInfo,
    });
  } catch (error: any) {
    console.error('Error calculating pricing:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
