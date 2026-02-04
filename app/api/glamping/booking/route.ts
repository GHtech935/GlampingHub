import { NextRequest, NextResponse } from 'next/server';
import pool, { getClient } from '@/lib/db';
import { PoolClient } from 'pg';
import { calculateGlampingPricing } from '@/lib/glamping-pricing';
import {
  sendGlampingBookingConfirmation,
  sendGlampingBookingNotificationToStaff,
} from '@/lib/email';
import { validateVoucherDirect } from '@/lib/voucher-validation';

/**
 * Check if an item is available for booking in the given date range
 * Considers inventory_quantity and unlimited_inventory settings
 */
async function checkItemAvailability(
  client: PoolClient,
  itemId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<{
  available: boolean;
  reason?: string;
  inventoryQuantity?: number;
  bookedQuantity?: number;
  availableQuantity?: number;
  unlimited?: boolean;
}> {
  // Step 1: Get item inventory settings (only active items)
  const itemAttrQuery = `
    SELECT
      COALESCE(a.inventory_quantity, 1) as inventory_quantity,
      COALESCE(a.unlimited_inventory, false) as unlimited_inventory
    FROM glamping_items i
    LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
    LEFT JOIN glamping_zones z ON i.zone_id = z.id
    WHERE i.id = $1
      AND COALESCE(z.is_active, true) = true
      AND COALESCE(a.is_active, true) = true
  `;
  const itemAttrResult = await client.query(itemAttrQuery, [itemId]);

  if (itemAttrResult.rows.length === 0) {
    return { available: false, reason: 'Item not found' };
  }

  const { inventory_quantity, unlimited_inventory } = itemAttrResult.rows[0];

  // Step 2: If unlimited inventory, always available
  if (unlimited_inventory) {
    return { available: true, unlimited: true };
  }

  // Step 3: Count overlapping bookings for this item
  // Overlap: existing.check_in < new.check_out AND existing.check_out > new.check_in
  const bookingCountQuery = `
    SELECT COUNT(DISTINCT bt.id) as booked_count
    FROM glamping_booking_tents bt
    JOIN glamping_bookings b ON bt.booking_id = b.id
    WHERE bt.item_id = $1
      AND b.status NOT IN ('cancelled', 'rejected')
      AND bt.check_in_date < $3
      AND bt.check_out_date > $2
  `;
  const bookingCountResult = await client.query(bookingCountQuery, [
    itemId,
    checkInDate,
    checkOutDate,
  ]);

  const bookedQuantity = parseInt(bookingCountResult.rows[0].booked_count) || 0;
  const availableQuantity = inventory_quantity - bookedQuantity;

  // Step 4: Check if available
  if (availableQuantity <= 0) {
    return {
      available: false,
      reason: 'Item is fully booked for the selected dates',
      inventoryQuantity: inventory_quantity,
      bookedQuantity,
      availableQuantity: 0,
    };
  }

  return {
    available: true,
    inventoryQuantity: inventory_quantity,
    bookedQuantity,
    availableQuantity,
  };
}

export async function POST(request: NextRequest) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const body = await request.json();

    // Check if this is a multi-item booking
    const isMultiItemBooking = Array.isArray(body.items) && body.items.length > 0;

    if (isMultiItemBooking) {
      // Multi-item booking logic
      const {
        items, // Array of { itemId, checkInDate, checkOutDate, adults, children, parameterQuantities, menuProducts }
        customerId: bodyCustomerId, // Support direct customerId from admin booking
        guestEmail,
        guestFirstName,
        guestLastName,
        guestPhone,
        guestCountry,
        guestAddress,
        specialRequirements,
        partyNames,
        invoiceNotes,
        internalNotes,
        discountCode,
        paymentMethod = 'pay_now',
        isAdminBooking = false,
        menuProducts = [], // Shared menu products for entire booking
        // New customer info fields
        dateOfBirth,
        socialMediaUrl,
        photoConsent,
        referralSource,
      } = body;

      // Validate required fields - customerId OR guest info required
      if (!items || items.length === 0 || (!guestEmail && !bodyCustomerId) ||
          (!bodyCustomerId && (!guestFirstName || !guestLastName))) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json(
          { error: 'Missing required fields for multi-item booking' },
          { status: 400 }
        );
      }

      // ===========================================================================
      // MULTI-ITEM BOOKING LOGIC
      // ===========================================================================

      console.log('[Multi-Item Booking] Processing booking for', items.length, 'items');

      // Step 1: Validate all items belong to same zone (only active items)
      const itemIds = items.map((item: any) => item.itemId);
      const zoneCheckQuery = `
        SELECT DISTINCT i.zone_id
        FROM glamping_items i
        LEFT JOIN glamping_item_attributes a ON i.id = a.item_id
        LEFT JOIN glamping_zones z ON i.zone_id = z.id
        WHERE i.id = ANY($1)
          AND COALESCE(z.is_active, true) = true
          AND COALESCE(a.is_active, true) = true
      `;
      const zoneCheckResult = await client.query(zoneCheckQuery, [itemIds]);

      if (zoneCheckResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json(
          { error: 'One or more items are not available for booking' },
          { status: 400 }
        );
      }

      if (zoneCheckResult.rows.length > 1) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json(
          { error: 'All items must belong to the same glamping zone' },
          { status: 400 }
        );
      }

      const zoneId = zoneCheckResult.rows[0]?.zone_id;

      // Step 2: Fetch details for all items (only active items)
      const itemsQuery = `
        SELECT
          i.*,
          z.id as zone_id,
          z.name->>'vi' as zone_name,
          z.bank_account_id,
          COALESCE(z.enable_dinner_reminder_email, true) as enable_dinner_reminder_email,
          json_agg(DISTINCT jsonb_build_object(
            'parameter_id', ip.parameter_id,
            'id', p.id,
            'name', p.name,
            'color_code', p.color_code,
            'controls_inventory', p.controls_inventory,
            'sets_pricing', p.sets_pricing
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
        WHERE i.id = ANY($1)
          AND COALESCE(z.is_active, true) = true
          AND COALESCE(a.is_active, true) = true
        GROUP BY i.id, z.id, z.name, z.bank_account_id
      `;
      const itemsResult = await client.query(itemsQuery, [itemIds]);
      const itemsMap = new Map(itemsResult.rows.map(row => [row.id, row]));

      // Step 3: Check availability for ALL items (including admin bookings)
      // Uses inventory_quantity to allow multiple bookings if quantity > 1
      // Unlimited inventory items are always available
      for (const cartItem of items) {
        const { itemId, checkInDate, checkOutDate } = cartItem;

        const availability = await checkItemAvailability(
          client,
          itemId,
          checkInDate,
          checkOutDate
        );

        if (!availability.available) {
          const itemData = itemsMap.get(itemId);
          await client.query('ROLLBACK');
          client.release();
          return NextResponse.json(
            {
              error: `Lều "${itemData?.name || itemId}" đã được đặt hết trong khoảng thời gian này. Vui lòng chọn ngày khác hoặc chọn lều khác.`,
              errorCode: 'DATES_NOT_AVAILABLE',
              conflictingItem: itemId,
              inventoryQuantity: availability.inventoryQuantity,
              bookedQuantity: availability.bookedQuantity,
              availableQuantity: availability.availableQuantity,
            },
            { status: 409 }
          );
        }
      }

      // Step 3.5: Validate menu combos vs counted guests
      if (menuProducts && menuProducts.length > 0) {
        // 1. Calculate total counted guests from all items' parameters
        let totalCountedGuests = 0;
        const allParameterIds = new Set<string>();

        // Collect all unique parameter IDs from all items
        for (const cartItem of items) {
          const { parameterQuantities } = cartItem;
          if (parameterQuantities) {
            Object.keys(parameterQuantities).forEach(paramId => allParameterIds.add(paramId));
          }
        }

        // Fetch which parameters are counted for menu
        const parametersQuery = `
          SELECT id, counted_for_menu
          FROM glamping_parameters
          WHERE id = ANY($1::uuid[])
        `;
        const parametersResult = await client.query(parametersQuery, [Array.from(allParameterIds)]);
        const countedParameterIds = new Set(
          parametersResult.rows
            .filter(p => p.counted_for_menu)
            .map(p => p.id)
        );

        // Sum up quantities for counted parameters across all items
        for (const cartItem of items) {
          const { parameterQuantities } = cartItem;
          if (parameterQuantities) {
            Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
              if (countedParameterIds.has(paramId)) {
                totalCountedGuests += quantity as number;
              }
            });
          }
        }

        // 2. Fetch menu items with guest limits
        const menuItemIds = menuProducts.map((mp: any) => mp.id);
        const menuItemsQuery = `
          SELECT id, min_guests, max_guests
          FROM glamping_menu_items
          WHERE id = ANY($1::uuid[])
        `;
        const menuItemsResult = await client.query(menuItemsQuery, [menuItemIds]);
        const menuItemsMap = new Map(menuItemsResult.rows.map(row => [row.id, row]));

        // 3. Calculate total combo capacity
        let totalComboGuests = 0;
        for (const mp of menuProducts) {
          const menuItem = menuItemsMap.get(mp.id);
          if (menuItem && menuItem.min_guests !== null && menuItem.max_guests !== null) {
            // Fixed combo (min=max): quantity = number of combos
            if (menuItem.min_guests === menuItem.max_guests) {
              totalComboGuests += menuItem.max_guests * mp.quantity;
            } else {
              // Variable combo: quantity = number of guests
              totalComboGuests += mp.quantity;
            }
          }
          // NULL limits = traditional item (doesn't count toward combo)
        }

        // 4. Validation rule: totalComboGuests >= totalCountedGuests
        if (totalCountedGuests > 0 && totalComboGuests < totalCountedGuests) {
          await client.query('ROLLBACK');
          client.release();
          return NextResponse.json(
            {
              error: `Số người trong combo (${totalComboGuests}) không đủ cho số khách cần món ăn (${totalCountedGuests}). Vui lòng chọn thêm combo.`,
              errorCode: 'INSUFFICIENT_MENU_COMBOS',
              requiredGuests: totalCountedGuests,
              selectedGuests: totalComboGuests,
            },
            { status: 400 }
          );
        }
      }

      // Step 4: Calculate pricing for each item
      let totalAccommodationCost = 0;
      const itemPricingData: any[] = [];

      for (const cartItem of items) {
        const { itemId, checkInDate, checkOutDate, parameterQuantities } = cartItem;
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        const { parameterPricing, nightlyPricing } = await calculateGlampingPricing(
          client,
          itemId,
          checkIn,
          checkOut,
          parameterQuantities || {}
        );

        // Calculate accommodation cost respecting pricing_mode (per_group vs per_person)
        let itemAccommodationCost = 0;
        nightlyPricing.forEach((night: any) => {
          Object.entries(parameterQuantities || {}).forEach(([paramId, quantity]) => {
            const nightPrice = night.parameters[paramId] || 0;
            const pricingMode = night.pricingModes?.[paramId] || 'per_person';

            if (pricingMode === 'per_group') {
              // Per group: fixed price, regardless of quantity
              itemAccommodationCost += nightPrice;
            } else {
              // Per person: multiply by quantity
              itemAccommodationCost += nightPrice * (quantity as number);
            }
          });
        });

        totalAccommodationCost += itemAccommodationCost;

        // Extract pricingModes for saving to metadata
        const aggregatedPricingModes = nightlyPricing[0]?.pricingModes || {};

        itemPricingData.push({
          itemId,
          checkInDate,
          checkOutDate,
          parameterQuantities: parameterQuantities || {},
          parameterPricing,
          pricingModes: aggregatedPricingModes,
          accommodationCost: itemAccommodationCost,
          menuProducts: cartItem.menuProducts || [],
          addons: cartItem.addons || [],
        });
      }

      // Step 5: Calculate total menu products (shared + per-tent)
      let menuProductsTotal = 0;

      // Shared menu products
      if (menuProducts && menuProducts.length > 0) {
        menuProductsTotal += menuProducts.reduce((sum: number, mp: any) => {
          return sum + (mp.price * mp.quantity);
        }, 0);
      }

      // Per-tent menu products (from each cart item)
      for (const item of items) {
        if (item.menuProducts && item.menuProducts.length > 0) {
          menuProductsTotal += item.menuProducts.reduce((sum: number, mp: any) => {
            return sum + ((mp.price || 0) * (mp.quantity || 0));
          }, 0);
        }
      }

      // Step 5b: Calculate total addon costs (from client-computed prices in payload)
      let addonsTotalCost = 0;
      let addonsVoucherDiscount = 0;
      const addonVoucherResults: Array<{
        tentIndex: number;
        addonIndex: number;
        voucherCode: string | null;
        voucherId: string | null;
        discountType: string | null;
        discountValue: number;
        discountAmount: number;
      }> = [];

      for (let i = 0; i < items.length; i++) {
        const cartItem = items[i];
        if (cartItem.addons && Array.isArray(cartItem.addons)) {
          cartItem.addons.forEach((addon: any) => {
            addonsTotalCost += addon.totalPrice || 0;
          });
        }
      }

      // Step 6: Validate per-item vouchers (accommodation + menu products + addons)
      // Track voucher usage counts within this transaction
      const voucherUsageCounts: Record<string, number> = {}; // voucherId -> count
      const tentVoucherResults: Array<{
        tentIndex: number;
        voucherCode: string | null;
        voucherId: string | null;
        discountType: string | null;
        discountValue: number;
        discountAmount: number;
      }> = [];
      const menuProductVoucherResults: Array<{
        tentIndex: number;
        productIndex: number;
        voucherCode: string | null;
        voucherId: string | null;
        discountType: string | null;
        discountValue: number;
        discountAmount: number;
      }> = [];

      let totalTentDiscounts = 0;
      let totalProductDiscounts = 0;

      // 6a: Validate per-tent accommodation vouchers
      for (let i = 0; i < itemPricingData.length; i++) {
        const cartItem = items[i];
        const pricingItem = itemPricingData[i];
        const accomVoucher = cartItem.accommodationVoucher;

        if (accomVoucher && accomVoucher.code) {
          try {
            const additionalUses = voucherUsageCounts[accomVoucher.code?.toUpperCase()] || 0;
            const result = await validateVoucherDirect(client, accomVoucher.code, {
              zoneId,
              itemId: cartItem.itemId,
              checkIn: cartItem.checkInDate,
              checkOut: cartItem.checkOutDate,
              totalAmount: pricingItem.accommodationCost,
              applicationType: 'accommodation',
            }, additionalUses);

            if (result.valid) {
              tentVoucherResults.push({
                tentIndex: i,
                voucherCode: result.voucherCode,
                voucherId: result.voucherId,
                discountType: result.discountType,
                discountValue: result.discountValue,
                discountAmount: result.discountAmount,
              });
              totalTentDiscounts += result.discountAmount;
              // Track usage
              const key = result.voucherCode?.toUpperCase() || '';
              voucherUsageCounts[key] = (voucherUsageCounts[key] || 0) + 1;
            } else {
              tentVoucherResults.push({
                tentIndex: i, voucherCode: null, voucherId: null,
                discountType: null, discountValue: 0, discountAmount: 0,
              });
              console.warn(`[Multi-Item Booking] Tent ${i} voucher "${accomVoucher.code}" invalid: ${result.error}`);
            }
          } catch (err) {
            console.error(`[Multi-Item Booking] Error validating tent ${i} voucher:`, err);
            tentVoucherResults.push({
              tentIndex: i, voucherCode: null, voucherId: null,
              discountType: null, discountValue: 0, discountAmount: 0,
            });
          }
        } else {
          tentVoucherResults.push({
            tentIndex: i, voucherCode: null, voucherId: null,
            discountType: null, discountValue: 0, discountAmount: 0,
          });
        }
      }

      // 6b: Validate per-product vouchers (within each tent's menuProducts)
      for (let i = 0; i < items.length; i++) {
        const cartItem = items[i];
        const tentMenuProducts = cartItem.menuProducts || [];
        for (let j = 0; j < tentMenuProducts.length; j++) {
          const mp = tentMenuProducts[j];
          if (mp.voucher && mp.voucher.code) {
            try {
              const additionalUses = voucherUsageCounts[mp.voucher.code?.toUpperCase()] || 0;
              const productTotal = (mp.price || 0) * (mp.quantity || 0);
              const result = await validateVoucherDirect(client, mp.voucher.code, {
                zoneId,
                itemId: mp.id,
                totalAmount: productTotal,
                applicationType: 'menu_only',
              }, additionalUses);

              if (result.valid) {
                menuProductVoucherResults.push({
                  tentIndex: i, productIndex: j,
                  voucherCode: result.voucherCode,
                  voucherId: result.voucherId,
                  discountType: result.discountType,
                  discountValue: result.discountValue,
                  discountAmount: result.discountAmount,
                });
                totalProductDiscounts += result.discountAmount;
                const key = result.voucherCode?.toUpperCase() || '';
                voucherUsageCounts[key] = (voucherUsageCounts[key] || 0) + 1;
              } else {
                menuProductVoucherResults.push({
                  tentIndex: i, productIndex: j,
                  voucherCode: null, voucherId: null,
                  discountType: null, discountValue: 0, discountAmount: 0,
                });
              }
            } catch (err) {
              console.error(`[Multi-Item Booking] Error validating product voucher:`, err);
              menuProductVoucherResults.push({
                tentIndex: i, productIndex: j,
                voucherCode: null, voucherId: null,
                discountType: null, discountValue: 0, discountAmount: 0,
              });
            }
          } else {
            menuProductVoucherResults.push({
              tentIndex: i, productIndex: j,
              voucherCode: null, voucherId: null,
              discountType: null, discountValue: 0, discountAmount: 0,
            });
          }
        }
      }

      // 6c: Validate per-addon vouchers
      let totalAddonDiscounts = 0;

      for (let i = 0; i < items.length; i++) {
        const cartItem = items[i];
        const cartAddons = cartItem.addons || [];
        for (let j = 0; j < cartAddons.length; j++) {
          const addon = cartAddons[j];
          if (addon.voucher && addon.voucher.code) {
            try {
              const additionalUses = voucherUsageCounts[addon.voucher.code?.toUpperCase()] || 0;
              const addonTotal = addon.totalPrice || 0;
              const result = await validateVoucherDirect(client, addon.voucher.code, {
                zoneId,
                itemId: addon.addonItemId,
                totalAmount: addonTotal,
              }, additionalUses);

              if (result.valid) {
                addonVoucherResults.push({
                  tentIndex: i, addonIndex: j,
                  voucherCode: result.voucherCode,
                  voucherId: result.voucherId,
                  discountType: result.discountType,
                  discountValue: result.discountValue,
                  discountAmount: result.discountAmount,
                });
                totalAddonDiscounts += result.discountAmount;
                addonsVoucherDiscount += result.discountAmount;
                const key = result.voucherCode?.toUpperCase() || '';
                voucherUsageCounts[key] = (voucherUsageCounts[key] || 0) + 1;
              } else {
                addonVoucherResults.push({
                  tentIndex: i, addonIndex: j,
                  voucherCode: null, voucherId: null,
                  discountType: null, discountValue: 0, discountAmount: 0,
                });
              }
            } catch (err) {
              console.error(`[Multi-Item Booking] Error validating addon voucher:`, err);
              addonVoucherResults.push({
                tentIndex: i, addonIndex: j,
                voucherCode: null, voucherId: null,
                discountType: null, discountValue: 0, discountAmount: 0,
              });
            }
          } else {
            addonVoucherResults.push({
              tentIndex: i, addonIndex: j,
              voucherCode: null, voucherId: null,
              discountType: null, discountValue: 0, discountAmount: 0,
            });
          }
        }
      }

      // 6d: Fallback to global discountCode if no per-item vouchers were provided
      let globalVoucherId: string | null = null;
      let globalVoucherDiscount = 0;

      const subtotalAmount = totalAccommodationCost + menuProductsTotal + addonsTotalCost;

      if (discountCode && totalTentDiscounts === 0 && totalProductDiscounts === 0) {
        try {
          const result = await validateVoucherDirect(client, discountCode, {
            zoneId,
            itemId: itemIds[0],
            checkIn: items[0].checkInDate,
            checkOut: items[0].checkOutDate,
            totalAmount: subtotalAmount,
          });
          if (result.valid) {
            globalVoucherId = result.voucherId;
            globalVoucherDiscount = result.discountAmount;
            const key = result.voucherCode?.toUpperCase() || '';
            voucherUsageCounts[key] = (voucherUsageCounts[key] || 0) + 1;
          }
        } catch (error) {
          console.error('[Multi-Item Booking] Error validating global voucher:', error);
        }
      }

      const voucherDiscount = totalTentDiscounts + totalProductDiscounts + totalAddonDiscounts + globalVoucherDiscount;
      const totalAmount = subtotalAmount - voucherDiscount;

      // Step 7: Calculate deposit
      let depositDue = totalAmount;
      let balanceDue = 0;

      if (paymentMethod === 'pay_later') {
        // Use first item's deposit settings as reference
        const itemDepositQuery = `
          SELECT type, amount FROM glamping_deposit_settings WHERE item_id = $1
        `;
        const itemDepositResult = await client.query(itemDepositQuery, [itemIds[0]]);

        let depositType = null;
        let depositValue = 0;

        if (itemDepositResult.rows.length > 0) {
          depositType = itemDepositResult.rows[0].type;
          depositValue = parseFloat(itemDepositResult.rows[0].amount);
        } else {
          const zoneDepositQuery = `
            SELECT deposit_type, deposit_value FROM glamping_zones WHERE id = $1
          `;
          const zoneDepositResult = await client.query(zoneDepositQuery, [zoneId]);

          if (zoneDepositResult.rows.length > 0 && zoneDepositResult.rows[0].deposit_type) {
            depositType = zoneDepositResult.rows[0].deposit_type;
            depositValue = parseFloat(zoneDepositResult.rows[0].deposit_value);
          }
        }

        if (depositType && depositValue > 0) {
          if (depositType === 'percentage') {
            depositDue = totalAmount * (depositValue / 100);
          } else {
            depositDue = depositValue;
          }
          balanceDue = totalAmount - depositDue;
        }
      }

      // Step 8: Find or create customer
      let customerId: string | null = bodyCustomerId || null;

      // If customerId provided, verify it exists
      if (customerId) {
        const checkResult = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
        if (checkResult.rows.length === 0) {
          customerId = null; // Fall through to email-based lookup
        }
      }

      // If customerId was provided but guest name fields are missing, resolve from DB
      let resolvedGuestFirstName = guestFirstName || '';
      let resolvedGuestLastName = guestLastName || '';
      if (customerId && !guestFirstName) {
        const custNameResult = await client.query(
          'SELECT first_name, last_name FROM customers WHERE id = $1',
          [customerId]
        );
        if (custNameResult.rows.length > 0) {
          resolvedGuestFirstName = custNameResult.rows[0].first_name || '';
          resolvedGuestLastName = custNameResult.rows[0].last_name || '';
        }
      }

      // If no valid customerId, use email-based lookup/create
      if (!customerId) {
        const customerCheckQuery = `
          SELECT id FROM customers WHERE email = $1 LIMIT 1
        `;
        const customerCheckResult = await client.query(customerCheckQuery, [guestEmail]);

        if (customerCheckResult.rows.length > 0) {
          customerId = customerCheckResult.rows[0].id;

          const customerUpdateQuery = `
            UPDATE customers
            SET first_name = $1,
                last_name = $2,
                phone = $3,
                country = $4,
                address_line1 = $5,
                updated_at = NOW()
            WHERE id = $6
          `;
          await client.query(customerUpdateQuery, [
            guestFirstName,
            guestLastName,
            guestPhone,
            guestCountry,
            guestAddress,
            customerId,
          ]);
        } else {
          const customerInsertQuery = `
            INSERT INTO customers (email, first_name, last_name, phone, country, address_line1)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `;
          const customerInsertResult = await client.query(customerInsertQuery, [
            guestEmail,
            guestFirstName,
            guestLastName,
            guestPhone,
            guestCountry,
            guestAddress,
          ]);

          customerId = customerInsertResult.rows[0].id;
        }
      }

      // Step 9: Generate booking code
      const year = new Date().getFullYear();
      const yearShort = year.toString().slice(-2);
      const seqResult = await client.query('SELECT get_next_glamping_booking_number($1) as number', [year]);
      const bookingNumber = seqResult.rows[0].number;
      const bookingCode = `GH${yearShort}${String(bookingNumber).padStart(6, '0')}`;

      // Step 10: Calculate total guests (sum of all items)
      const totalAdults = items.reduce((sum: number, item: any) => sum + (item.adults || 0), 0);
      const totalChildren = items.reduce((sum: number, item: any) => sum + (item.children || 0), 0);

      const paymentRequired = paymentMethod === 'pay_now' || depositDue > 0;
      const paymentExpiresAt = (paymentRequired && !isAdminBooking)
        ? new Date(Date.now() + (parseInt(process.env.SEPAY_PAYMENT_TIMEOUT_MINUTES || '30') * 60 * 1000)).toISOString()
        : null;

      // Step 10.5: Build per-item discount breakdown from server-validated results
      const discountBreakdown = items.map((_itemData: any, idx: number) => {
        const tentVoucher = tentVoucherResults.find(v => v.tentIndex === idx);
        const productVouchers = menuProductVoucherResults
          .filter(v => v.tentIndex === idx && v.voucherCode)
          .map(v => ({
            code: v.voucherCode,
            amount: v.discountAmount,
            type: v.discountType,
            value: v.discountValue,
          }));

        return {
          item_id: _itemData.itemId,
          accommodation_voucher: tentVoucher && tentVoucher.voucherCode ? {
            code: tentVoucher.voucherCode,
            voucher_id: tentVoucher.voucherId,
            type: tentVoucher.discountType,
            value: tentVoucher.discountValue,
            amount: tentVoucher.discountAmount,
          } : null,
          product_vouchers: productVouchers.length > 0 ? productVouchers : null,
        };
      });

      // Step 11: Create main booking record
      // Use first item's dates as booking dates (or find min/max across all items)
      const allCheckIns = items.map((item: any) => new Date(item.checkInDate));
      const allCheckOuts = items.map((item: any) => new Date(item.checkOutDate));
      const earliestCheckIn = new Date(Math.min(...allCheckIns.map((d: Date) => d.getTime())));
      const latestCheckOut = new Date(Math.max(...allCheckOuts.map((d: Date) => d.getTime())));

      const bookingInsertQuery = `
        INSERT INTO glamping_bookings (
          booking_code,
          customer_id,
          guest_name,
          status,
          payment_status,
          check_in_date,
          check_out_date,
          guests,
          total_guests,
          subtotal_amount,
          tax_amount,
          discount_amount,
          deposit_due,
          balance_due,
          currency,
          special_requirements,
          party_names,
          invoice_notes,
          internal_notes,
          payment_expires_at,
          discount_breakdown,
          date_of_birth,
          social_media_url,
          photo_consent,
          referral_source,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW())
        RETURNING id, booking_code, created_at, total_amount
      `;

      const bookingResult = await client.query(bookingInsertQuery, [
        bookingCode,
        customerId,
        `${resolvedGuestFirstName} ${resolvedGuestLastName}`.trim(),
        'confirmed',
        'pending',
        earliestCheckIn.toISOString().split('T')[0],
        latestCheckOut.toISOString().split('T')[0],
        JSON.stringify({ adults: totalAdults, children: totalChildren }),
        totalAdults + totalChildren,
        subtotalAmount,
        0,
        voucherDiscount,
        depositDue,
        balanceDue,
        'VND',
        specialRequirements || null,
        partyNames || null,
        invoiceNotes || null,
        internalNotes || null,
        paymentExpiresAt,
        JSON.stringify(discountBreakdown),
        dateOfBirth || null,
        socialMediaUrl || null,
        photoConsent !== undefined ? photoConsent : null,
        referralSource || null,
      ]);

      const booking = bookingResult.rows[0];

      console.log('[Multi-Item Booking] Created booking:', booking.booking_code);

      // Step 12: Create booking tents + booking items for each cart item
      for (let tentIndex = 0; tentIndex < itemPricingData.length; tentIndex++) {
        const itemData = itemPricingData[tentIndex];
        const itemInfo = itemsMap.get(itemData.itemId);
        const originalCartItem = items[tentIndex];

        // Step 12a: Insert glamping_booking_tents record (with per-tent discount)
        const tentVoucher = tentVoucherResults.find(v => v.tentIndex === tentIndex);

        const tentInsertQuery = `
          INSERT INTO glamping_booking_tents (
            booking_id,
            item_id,
            check_in_date,
            check_out_date,
            subtotal,
            special_requests,
            display_order,
            voucher_code,
            voucher_id,
            discount_type,
            discount_value,
            discount_amount
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `;

        const tentResult = await client.query(tentInsertQuery, [
          booking.id,
          itemData.itemId,
          itemData.checkInDate,
          itemData.checkOutDate,
          itemData.accommodationCost || 0,
          originalCartItem.specialRequirements || null,
          tentIndex,
          tentVoucher?.voucherCode || null,
          tentVoucher?.voucherId || null,
          tentVoucher?.discountType || null,
          tentVoucher?.discountValue || 0,
          tentVoucher?.discountAmount || 0,
        ]);

        const tentId = tentResult.rows[0].id;

        // Prepare metadata for this item (per-item dates and guest info)
        const itemMetadata = {
          checkInDate: itemData.checkInDate,
          checkOutDate: itemData.checkOutDate,
          guests: {
            adults: originalCartItem.adults || 0,
            children: originalCartItem.children || 0,
          },
          specialRequests: originalCartItem.specialRequirements || null,
        };

        // Step 12b: Create booking_items for each parameter (linked to tent)
        for (const [paramId, quantity] of Object.entries(itemData.parameterQuantities)) {
          if ((quantity as number) > 0) {
            const unitPrice = itemData.parameterPricing[paramId] || 0;
            const pricingMode = itemData.pricingModes?.[paramId] || 'per_person';

            // Create metadata with pricingMode for Finance tab display
            const itemMetadataWithPricing = {
              ...itemMetadata,
              pricingMode,
            };

            const bookingItemInsertQuery = `
              INSERT INTO glamping_booking_items (
                booking_id,
                booking_tent_id,
                item_id,
                parameter_id,
                allocation_type,
                quantity,
                unit_price,
                metadata
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            await client.query(bookingItemInsertQuery, [
              booking.id,
              tentId,
              itemData.itemId,
              paramId,
              'per_night',
              quantity,
              unitPrice,
              JSON.stringify(itemMetadataWithPricing),
            ]);
          }
        }

        // Step 12c: Save parameters snapshot for this tent (per-tent, no accumulate)
        if (itemInfo?.parameters && itemInfo.parameters.length > 0) {
          for (const param of itemInfo.parameters) {
            const bookedQty = itemData.parameterQuantities[param.id] || 0;

            const bookingParamInsertQuery = `
              INSERT INTO glamping_booking_parameters (
                booking_id,
                booking_tent_id,
                parameter_id,
                label,
                booked_quantity,
                controls_inventory
              )
              VALUES ($1, $2, $3, $4, $5, $6)
            `;

            await client.query(bookingParamInsertQuery, [
              booking.id,
              tentId,
              param.id,
              param.name,
              bookedQty,
              param.controls_inventory || false,
            ]);
          }
        }

        // Step 12d: Save per-item menu products (linked to tent, with per-product discount)
        if (itemData.menuProducts && itemData.menuProducts.length > 0) {
          for (let mpIdx = 0; mpIdx < itemData.menuProducts.length; mpIdx++) {
            const mp = itemData.menuProducts[mpIdx];
            if (mp.quantity > 0) {
              // Find the validated voucher result for this product
              const mpVoucher = menuProductVoucherResults.find(
                v => v.tentIndex === tentIndex && v.productIndex === mpIdx
              );

              const menuProductInsertQuery = `
                INSERT INTO glamping_booking_menu_products (
                  booking_id,
                  booking_tent_id,
                  menu_item_id,
                  quantity,
                  unit_price,
                  voucher_code,
                  voucher_id,
                  discount_type,
                  discount_value,
                  discount_amount,
                  serving_date
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `;

              await client.query(menuProductInsertQuery, [
                booking.id,
                tentId,
                mp.id,
                mp.quantity,
                mp.price,
                mpVoucher?.voucherCode || null,
                mpVoucher?.voucherId || null,
                mpVoucher?.discountType || null,
                mpVoucher?.discountValue || 0,
                mpVoucher?.discountAmount || 0,
                mp.servingDate || null,
              ]);
            }
          }
        }

        // Step 12e: Save per-item add-on selections (common items) with pricing + voucher
        if (itemData.addons && Array.isArray(itemData.addons) && itemData.addons.length > 0) {
          for (let addonIdx = 0; addonIdx < itemData.addons.length; addonIdx++) {
            const addon = itemData.addons[addonIdx];
            if (!addon.addonItemId) continue;

            // Find validated voucher for this addon
            const addonVoucher = addonVoucherResults.find(
              v => v.tentIndex === tentIndex && v.addonIndex === addonIdx
            );

            const addonInsertQuery = `
              INSERT INTO glamping_booking_items (
                booking_id,
                booking_tent_id,
                item_id,
                parameter_id,
                allocation_type,
                quantity,
                unit_price,
                metadata
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            // Save each addon parameter as a booking item with real unit_price
            const addonParamEntries = Object.entries(addon.parameterQuantities || {});
            if (addonParamEntries.length > 0) {
              for (const [paramId, qty] of addonParamEntries) {
                if ((qty as number) > 0) {
                  // Get unit price from client-supplied parameterPricing
                  const paramPricing = addon.parameterPricing?.[paramId];
                  const unitPrice = paramPricing?.unitPrice || 0;
                  const pricingMode = paramPricing?.pricingMode || 'per_person';

                  await client.query(addonInsertQuery, [
                    booking.id,
                    tentId,
                    addon.addonItemId,
                    paramId,
                    'per_night',
                    qty,
                    unitPrice,
                    JSON.stringify({
                      type: 'addon',
                      parentItemId: itemData.itemId,
                      dates: addon.dates || null,
                      pricingMode,
                      voucher: addonVoucher?.voucherCode ? {
                        code: addonVoucher.voucherCode,
                        id: addonVoucher.voucherId,
                        discountAmount: addonVoucher.discountAmount,
                        discountType: addonVoucher.discountType,
                        discountValue: addonVoucher.discountValue,
                      } : null,
                    }),
                  ]);
                }
              }
            } else {
              // Addon with no parameters - save with quantity
              await client.query(addonInsertQuery, [
                booking.id,
                tentId,
                addon.addonItemId,
                null,
                'per_night',
                addon.quantity || 1,
                addon.totalPrice || 0,
                JSON.stringify({
                  type: 'addon',
                  parentItemId: itemData.itemId,
                  dates: addon.dates || null,
                  voucher: addonVoucher?.voucherCode ? {
                    code: addonVoucher.voucherCode,
                    id: addonVoucher.voucherId,
                    discountAmount: addonVoucher.discountAmount,
                    discountType: addonVoucher.discountType,
                    discountValue: addonVoucher.discountValue,
                  } : null,
                }),
              ]);
            }
          }
        }
      }

      // Step 13: Save shared menu products (if any) - booking_tent_id = NULL
      if (menuProducts && menuProducts.length > 0) {
        for (const mp of menuProducts) {
          if (mp.quantity > 0) {
            const menuProductInsertQuery = `
              INSERT INTO glamping_booking_menu_products (
                booking_id,
                booking_tent_id,
                menu_item_id,
                quantity,
                unit_price
              )
              VALUES ($1, NULL, $2, $3, $4)
            `;

            await client.query(menuProductInsertQuery, [
              booking.id,
              mp.id,
              mp.quantity,
              mp.price,
            ]);
          }
        }
      }

      // Step 14: Create status history
      const statusHistoryQuery = `
        INSERT INTO glamping_booking_status_history (
          booking_id,
          previous_status,
          new_status,
          previous_payment_status,
          new_payment_status,
          reason
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await client.query(statusHistoryQuery, [
        booking.id,
        null,
        'confirmed',
        null,
        'pending',
        `Multi-item booking created with ${items.length} items`,
      ]);

      // Step 15: Increment voucher usage for each unique voucher
      // Collect all unique voucher IDs with their usage counts
      const voucherIncrements: Record<string, number> = {};

      // From tent vouchers
      for (const tv of tentVoucherResults) {
        if (tv.voucherId) {
          voucherIncrements[tv.voucherId] = (voucherIncrements[tv.voucherId] || 0) + 1;
        }
      }
      // From product vouchers
      for (const pv of menuProductVoucherResults) {
        if (pv.voucherId) {
          voucherIncrements[pv.voucherId] = (voucherIncrements[pv.voucherId] || 0) + 1;
        }
      }
      // From addon vouchers
      for (const av of addonVoucherResults) {
        if (av.voucherId) {
          voucherIncrements[av.voucherId] = (voucherIncrements[av.voucherId] || 0) + 1;
        }
      }
      // From global voucher fallback
      if (globalVoucherId) {
        voucherIncrements[globalVoucherId] = (voucherIncrements[globalVoucherId] || 0) + 1;
      }

      for (const [vid, count] of Object.entries(voucherIncrements)) {
        await client.query(
          `UPDATE glamping_discounts
           SET current_uses = current_uses + $2,
               updated_at = NOW()
           WHERE id = $1`,
          [vid, count]
        );
      }

      await client.query('COMMIT');
      client.release();

      console.log('[Multi-Item Booking] Successfully committed booking:', booking.booking_code);

      // Step 16: Send emails
      // Note: paymentRequired already calculated above for paymentExpiresAt
      let redirectUrl = `/glamping/booking/confirmation/${booking.id}`;

      if (paymentRequired) {
        redirectUrl = `/glamping/booking/payment/${booking.id}`;
      }

      // Resolve customer info for emails (may come from customerId lookup)
      let resolvedEmail = guestEmail || '';
      let resolvedFirstName = guestFirstName || '';
      let resolvedLastName = guestLastName || '';
      let resolvedPhone = guestPhone || '';

      if (bodyCustomerId && customerId && (!guestEmail || !guestFirstName)) {
        try {
          const custResult = await pool.query(
            'SELECT email, first_name, last_name, phone FROM customers WHERE id = $1',
            [customerId]
          );
          if (custResult.rows.length > 0) {
            resolvedEmail = custResult.rows[0].email || resolvedEmail;
            resolvedFirstName = custResult.rows[0].first_name || resolvedFirstName;
            resolvedLastName = custResult.rows[0].last_name || resolvedLastName;
            resolvedPhone = custResult.rows[0].phone || resolvedPhone;
          }
        } catch (e) {
          console.error('[Multi-Item Booking] Error fetching customer for email:', e);
        }
      }

      const customerName = `${resolvedFirstName} ${resolvedLastName}`.trim();
      const firstItem = itemsMap.get(itemIds[0]);
      const zoneName = firstItem?.zone_name || 'Glamping Zone';
      const itemNames = items.map((item: any) => itemsMap.get(item.itemId)?.name || 'Item').join(', ');

      // Build items array for email with detailed info
      const emailItems = items.map((item: any) => {
        const itemInfo = itemsMap.get(item.itemId);
        return {
          name: itemInfo?.name || 'Lều',
          checkInDate: new Date(item.checkInDate).toLocaleDateString('vi-VN'),
          checkOutDate: new Date(item.checkOutDate).toLocaleDateString('vi-VN'),
          guests: (item.adults || 0) + (item.children || 0),
        };
      });

      // Send confirmation email
      if (resolvedEmail) {
        try {
          // Get zone setting for dinner reminder email
          const enableDinnerReminderEmail = firstItem?.enable_dinner_reminder_email !== false;

          await sendGlampingBookingConfirmation({
            customerEmail: resolvedEmail,
            customerName,
            bookingCode: booking.booking_code,
            zoneName,
            itemName: `${items.length} lều (${itemNames})`,
            checkInDate: earliestCheckIn.toLocaleDateString('vi-VN'),
            checkOutDate: latestCheckOut.toLocaleDateString('vi-VN'),
            totalAmount: parseFloat(booking.total_amount),
            numberOfGuests: totalAdults + totalChildren,
            glampingBookingId: booking.id,
            items: emailItems,
            enableDinnerReminderEmail,
          });
        } catch (emailError) {
          console.error('[Multi-Item Booking] Failed to send confirmation email:', emailError);
        }
      }

      // Send staff notification (including zone owners)
      try {
        await sendGlampingBookingNotificationToStaff({
          bookingCode: booking.booking_code,
          guestName: customerName,
          guestEmail: resolvedEmail,
          guestPhone: resolvedPhone,
          zoneName,
          itemName: `${items.length} lều (${itemNames})`,
          checkInDate: earliestCheckIn.toLocaleDateString('vi-VN'),
          checkOutDate: latestCheckOut.toLocaleDateString('vi-VN'),
          numberOfGuests: totalAdults + totalChildren,
          totalAmount: parseFloat(booking.total_amount),
          paymentStatus: 'Chờ thanh toán',
          glampingBookingId: booking.id,
          zoneId,
        });
      } catch (emailError) {
        console.error('[Multi-Item Booking] Failed to send staff notification:', emailError);
      }

      // Step 17: Create in-app notifications
      try {
        const {
          sendNotificationToCustomer,
          broadcastToRole,
          notifyGlampingOwnersOfZone,
        } = await import('@/lib/notifications');

        // 1. Notify customer
        await sendNotificationToCustomer(
          customerId!,
          'booking_created',
          {
            booking_reference: booking.booking_code,
            booking_id: booking.id,
            booking_code: booking.booking_code,
          },
          'glamping'
        );

        // 2. Notify staff (admin, sale, operations)
        const staffData = {
          customer_name: customerName,
          booking_reference: booking.booking_code,
          booking_code: booking.booking_code,
          booking_id: booking.id,
          pitch_name: `${items.length} lều (${itemNames})`,
          check_in_date: earliestCheckIn.toLocaleDateString('vi-VN'),
          check_out_date: latestCheckOut.toLocaleDateString('vi-VN'),
          total_amount: new Intl.NumberFormat('vi-VN').format(parseFloat(booking.total_amount)) + ' ₫',
        };

        await Promise.all([
          broadcastToRole('admin', 'new_booking_created', staffData, 'glamping'),
          broadcastToRole('sale', 'new_booking_created', staffData, 'glamping'),
          broadcastToRole('operations', 'new_booking_created', staffData, 'glamping'),
        ]);

        // 3. Notify glamping zone owners
        if (zoneId) {
          await notifyGlampingOwnersOfZone(zoneId, 'new_booking_created', staffData);
        }

        console.log('[Multi-Item Booking] ✅ In-app notifications sent');
      } catch (notificationError) {
        console.error('[Multi-Item Booking] ⚠️ Failed to send notifications:', notificationError);
      }

      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        paymentRequired,
        redirectUrl,
        totalAmount: parseFloat(booking.total_amount),
        depositDue,
        balanceDue,
      });
    }

    // Single-item booking (existing logic)
    const {
      itemId,
      checkInDate,
      checkOutDate,
      adults = 2,
      children = 0,
      parameterQuantities = {},
      menuProducts = [], // Array of { id, quantity, price, name }
      guestEmail,
      guestFirstName,
      guestLastName,
      guestPhone,
      guestCountry,
      guestAddress,
      specialRequirements,
      partyNames,
      invoiceNotes,
      internalNotes, // Admin-only internal notes
      discountCode,
      paymentMethod = 'pay_now',
      isAdminBooking = false, // Flag for admin bookings
      // New customer info fields
      dateOfBirth,
      socialMediaUrl,
      photoConsent,
      referralSource,
    } = body;

    // Validate required fields
    if (!itemId || !checkInDate || !checkOutDate || !guestEmail || !guestFirstName || !guestLastName) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch item details (only active items)
    const itemQuery = `
      SELECT
        i.*,
        z.id as zone_id,
        z.name->>'vi' as zone_name,
        z.bank_account_id,
        COALESCE(z.enable_dinner_reminder_email, true) as enable_dinner_reminder_email,
        json_agg(DISTINCT jsonb_build_object(
          'parameter_id', ip.parameter_id,
          'id', p.id,
          'name', p.name,
          'color_code', p.color_code,
          'controls_inventory', p.controls_inventory,
          'sets_pricing', p.sets_pricing
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

    const itemResult = await client.query(itemQuery, [itemId]);

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const item = itemResult.rows[0];

    // Calculate pricing (reuse same logic as calculate-pricing API)
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    // Check availability using inventory_quantity (applies to ALL bookings including admin)
    // Unlimited inventory items are always available
    // Items with inventory_quantity > 1 can have multiple bookings per day
    const availability = await checkItemAvailability(
      client,
      itemId,
      checkInDate,
      checkOutDate
    );

    if (!availability.available) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        {
          error: 'Lều đã được đặt hết trong khoảng thời gian này. Vui lòng chọn ngày khác.',
          errorCode: 'DATES_NOT_AVAILABLE',
          conflictingItem: itemId,
          inventoryQuantity: availability.inventoryQuantity,
          bookedQuantity: availability.bookedQuantity,
          availableQuantity: availability.availableQuantity,
        },
        { status: 409 }
      );
    }

    // VALIDATION: Menu combos vs counted guests
    if (menuProducts && menuProducts.length > 0) {
      // 1. Calculate total counted guests from parameters
      const parametersQuery = `
        SELECT id, counted_for_menu
        FROM glamping_parameters
        WHERE id = ANY($1::uuid[])
      `;
      const paramIds = Object.keys(parameterQuantities);
      const parametersResult = await client.query(parametersQuery, [paramIds]);

      let totalCountedGuests = 0;
      parametersResult.rows.forEach(param => {
        if (param.counted_for_menu) {
          totalCountedGuests += parameterQuantities[param.id] || 0;
        }
      });

      // 2. Fetch menu items with guest limits
      const menuItemIds = menuProducts.map((mp: any) => mp.id);
      const menuItemsQuery = `
        SELECT id, min_guests, max_guests
        FROM glamping_menu_items
        WHERE id = ANY($1::uuid[])
      `;
      const menuItemsResult = await client.query(menuItemsQuery, [menuItemIds]);
      const menuItemsMap = new Map(menuItemsResult.rows.map(row => [row.id, row]));

      // 3. Calculate total combo capacity
      let totalComboGuests = 0;
      for (const mp of menuProducts) {
        const menuItem = menuItemsMap.get(mp.id);
        if (menuItem && menuItem.min_guests !== null && menuItem.max_guests !== null) {
          // Fixed combo (min=max): quantity = number of combos
          if (menuItem.min_guests === menuItem.max_guests) {
            totalComboGuests += menuItem.max_guests * mp.quantity;
          } else {
            // Variable combo: quantity = number of guests
            totalComboGuests += mp.quantity;
          }
        }
        // NULL limits = traditional item (doesn't count toward combo)
      }

      // 4. Validation rule: totalComboGuests >= totalCountedGuests
      if (totalCountedGuests > 0 && totalComboGuests < totalCountedGuests) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json(
          {
            error: `Số người trong combo (${totalComboGuests}) không đủ cho số khách cần món ăn (${totalCountedGuests}). Vui lòng chọn thêm combo.`,
            errorCode: 'INSUFFICIENT_MENU_COMBOS',
            requiredGuests: totalCountedGuests,
            selectedGuests: totalComboGuests,
          },
          { status: 400 }
        );
      }
    }

    // Calculate pricing using the shared utility function
    const { parameterPricing, nightlyPricing } = await calculateGlampingPricing(
      client,
      itemId,
      checkIn,
      checkOut,
      parameterQuantities
    );

    // Calculate total accommodation cost respecting pricing_mode (per_group vs per_person)
    let accommodationCost = 0;
    nightlyPricing.forEach((night: any) => {
      Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
        const nightPrice = night.parameters[paramId] || 0;
        const pricingMode = night.pricingModes?.[paramId] || 'per_person';

        if (pricingMode === 'per_group') {
          // Per group: fixed price, regardless of quantity
          accommodationCost += nightPrice;
        } else {
          // Per person: multiply by quantity
          accommodationCost += nightPrice * (quantity as number);
        }
      });
    });

    // Apply discount code (accommodation) + per-product vouchers
    const zoneId = item.zone_id;
    const singleVoucherUsageCounts: Record<string, number> = {};

    // Validate accommodation voucher (discountCode)
    let singleTentVoucherCode: string | null = null;
    let singleTentVoucherId: string | null = null;
    let singleTentDiscountType: string | null = null;
    let singleTentDiscountValue = 0;
    let singleTentDiscountAmount = 0;

    if (discountCode) {
      try {
        const result = await validateVoucherDirect(client, discountCode, {
          zoneId,
          itemId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalAmount: accommodationCost,
          applicationType: 'accommodation',
        });

        if (result.valid) {
          singleTentVoucherCode = result.voucherCode;
          singleTentVoucherId = result.voucherId;
          singleTentDiscountType = result.discountType;
          singleTentDiscountValue = result.discountValue;
          singleTentDiscountAmount = result.discountAmount;
          const key = result.voucherCode?.toUpperCase() || '';
          singleVoucherUsageCounts[key] = (singleVoucherUsageCounts[key] || 0) + 1;
          console.log('[Booking] Accommodation voucher validated:', {
            code: discountCode,
            discountAmount: singleTentDiscountAmount,
          });
        } else {
          console.warn('[Booking] Voucher validation failed:', result.error);
        }
      } catch (error) {
        console.error('[Booking] Error validating voucher:', error);
      }
    }

    // Validate per-product vouchers
    const singleMenuProductVouchers: Array<{
      productIndex: number;
      voucherCode: string | null;
      voucherId: string | null;
      discountType: string | null;
      discountValue: number;
      discountAmount: number;
    }> = [];

    let totalSingleProductDiscounts = 0;

    if (menuProducts && menuProducts.length > 0) {
      for (let mpIdx = 0; mpIdx < menuProducts.length; mpIdx++) {
        const mp = menuProducts[mpIdx];
        if (mp.voucher && mp.voucher.code) {
          try {
            const additionalUses = singleVoucherUsageCounts[mp.voucher.code?.toUpperCase()] || 0;
            const productTotal = (mp.price || 0) * (mp.quantity || 0);
            const result = await validateVoucherDirect(client, mp.voucher.code, {
              zoneId,
              itemId: mp.id,
              totalAmount: productTotal,
              applicationType: 'menu_only',
            }, additionalUses);

            if (result.valid) {
              singleMenuProductVouchers.push({
                productIndex: mpIdx,
                voucherCode: result.voucherCode,
                voucherId: result.voucherId,
                discountType: result.discountType,
                discountValue: result.discountValue,
                discountAmount: result.discountAmount,
              });
              totalSingleProductDiscounts += result.discountAmount;
              const key = result.voucherCode?.toUpperCase() || '';
              singleVoucherUsageCounts[key] = (singleVoucherUsageCounts[key] || 0) + 1;
            } else {
              singleMenuProductVouchers.push({
                productIndex: mpIdx,
                voucherCode: null, voucherId: null,
                discountType: null, discountValue: 0, discountAmount: 0,
              });
            }
          } catch (err) {
            console.error('[Booking] Error validating product voucher:', err);
            singleMenuProductVouchers.push({
              productIndex: mpIdx,
              voucherCode: null, voucherId: null,
              discountType: null, discountValue: 0, discountAmount: 0,
            });
          }
        } else {
          singleMenuProductVouchers.push({
            productIndex: mpIdx,
            voucherCode: null, voucherId: null,
            discountType: null, discountValue: 0, discountAmount: 0,
          });
        }
      }
    }

    const voucherDiscount = singleTentDiscountAmount + totalSingleProductDiscounts;

    // Calculate menu products total
    let menuProductsTotal = 0;
    if (menuProducts && menuProducts.length > 0) {
      menuProductsTotal = menuProducts.reduce((sum: number, mp: any) => {
        return sum + (mp.price * mp.quantity);
      }, 0);
    }

    // Fixed: subtotal should NOT pre-subtract discount (let database handle it)
    const subtotalAmount = accommodationCost + menuProductsTotal;
    // Calculate total amount for deposit calculation (JavaScript needs this for depositDue logic)
    const totalAmount = subtotalAmount - voucherDiscount;

    // Find or create customer
    let customerId = null;

    const customerCheckQuery = `
      SELECT id FROM customers WHERE email = $1 LIMIT 1
    `;
    const customerCheckResult = await client.query(customerCheckQuery, [guestEmail]);

    if (customerCheckResult.rows.length > 0) {
      customerId = customerCheckResult.rows[0].id;

      // Update customer info
      const customerUpdateQuery = `
        UPDATE customers
        SET first_name = $1,
            last_name = $2,
            phone = $3,
            country = $4,
            address_line1 = $5,
            updated_at = NOW()
        WHERE id = $6
      `;
      await client.query(customerUpdateQuery, [
        guestFirstName,
        guestLastName,
        guestPhone,
        guestCountry,
        guestAddress,
        customerId,
      ]);
    } else {
      // Create new customer
      const customerInsertQuery = `
        INSERT INTO customers (email, first_name, last_name, phone, country, address_line1)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const customerInsertResult = await client.query(customerInsertQuery, [
        guestEmail,
        guestFirstName,
        guestLastName,
        guestPhone,
        guestCountry,
        guestAddress,
      ]);

      customerId = customerInsertResult.rows[0].id;
    }

    // Generate booking code
    const year = new Date().getFullYear();
    const yearShort = year.toString().slice(-2);
    const seqResult = await client.query('SELECT get_next_glamping_booking_number($1) as number', [year]);
    const bookingNumber = seqResult.rows[0].number;
    const bookingCode = `GH${yearShort}${String(bookingNumber).padStart(6, '0')}`;

    // Fetch deposit settings
    let depositDue = totalAmount;
    let balanceDue = 0;

    if (paymentMethod === 'pay_later') {
      // Check item-specific deposit settings first
      const itemDepositQuery = `
        SELECT type, amount FROM glamping_deposit_settings WHERE item_id = $1
      `;
      const itemDepositResult = await client.query(itemDepositQuery, [itemId]);

      let depositType = null;
      let depositValue = 0;

      if (itemDepositResult.rows.length > 0) {
        // Item has custom deposit
        depositType = itemDepositResult.rows[0].type;
        depositValue = parseFloat(itemDepositResult.rows[0].amount);
      } else {
        // Fall back to zone deposit settings
        const zoneDepositQuery = `
          SELECT z.deposit_type, z.deposit_value
          FROM glamping_items i
          JOIN glamping_zones z ON i.zone_id = z.id
          WHERE i.id = $1
        `;
        const zoneDepositResult = await client.query(zoneDepositQuery, [itemId]);

        if (zoneDepositResult.rows.length > 0 && zoneDepositResult.rows[0].deposit_type) {
          depositType = zoneDepositResult.rows[0].deposit_type;
          depositValue = parseFloat(zoneDepositResult.rows[0].deposit_value);
        }
      }

      // Calculate deposit amount based on type
      if (depositType && depositValue > 0) {
        if (depositType === 'percentage') {
          depositDue = totalAmount * (depositValue / 100);
        } else {
          // fixed, per_day, per_hour, per_quantity
          depositDue = depositValue;
        }
        balanceDue = totalAmount - depositDue;
      }
    }

    // Calculate payment expiry timestamp (same logic as CampingHub-App)
    // Admin bookings don't expire; payment required for pay_now OR when deposit > 0
    const paymentRequired = paymentMethod === 'pay_now' || depositDue > 0;
    const paymentExpiresAt = (paymentRequired && !isAdminBooking)
      ? new Date(Date.now() + (parseInt(process.env.SEPAY_PAYMENT_TIMEOUT_MINUTES || '30') * 60 * 1000)).toISOString()
      : null;

    // Create booking record
    // Note: total_amount is a generated column (computed from subtotal - discount + tax)
    const bookingInsertQuery = `
      INSERT INTO glamping_bookings (
        booking_code,
        customer_id,
        guest_name,
        status,
        payment_status,
        check_in_date,
        check_out_date,
        guests,
        total_guests,
        subtotal_amount,
        tax_amount,
        discount_amount,
        deposit_due,
        balance_due,
        currency,
        special_requirements,
        party_names,
        invoice_notes,
        internal_notes,
        payment_expires_at,
        date_of_birth,
        social_media_url,
        photo_consent,
        referral_source,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW())
      RETURNING id, booking_code, created_at, total_amount
    `;

    const bookingResult = await client.query(bookingInsertQuery, [
      bookingCode,
      customerId,
      `${guestFirstName} ${guestLastName}`.trim(),
      'confirmed',
      'pending',
      checkInDate,
      checkOutDate,
      JSON.stringify({ adults, children }),
      adults + children,
      subtotalAmount,
      0,
      voucherDiscount,
      depositDue,
      balanceDue,
      'VND',
      specialRequirements || null,
      partyNames || null,
      invoiceNotes || null,
      internalNotes || null, // Admin-only internal notes
      paymentExpiresAt,
      dateOfBirth || null,
      socialMediaUrl || null,
      photoConsent !== undefined ? photoConsent : null,
      referralSource || null,
    ]);

    const booking = bookingResult.rows[0];

    // Create booking tent record (single tent, with per-tent discount)
    const tentInsertQuery = `
      INSERT INTO glamping_booking_tents (
        booking_id,
        item_id,
        check_in_date,
        check_out_date,
        subtotal,
        special_requests,
        display_order,
        voucher_code,
        voucher_id,
        discount_type,
        discount_value,
        discount_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, $11)
      RETURNING id
    `;

    const tentResult = await client.query(tentInsertQuery, [
      booking.id,
      itemId,
      checkInDate,
      checkOutDate,
      accommodationCost || 0,
      specialRequirements || null,
      singleTentVoucherCode,
      singleTentVoucherId,
      singleTentDiscountType,
      singleTentDiscountValue,
      singleTentDiscountAmount,
    ]);

    const tentId = tentResult.rows[0].id;

    // Prepare metadata for this item (per-item dates and guest info)
    const itemMetadata = {
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      guests: {
        adults: adults || 0,
        children: children || 0,
      },
      specialRequests: specialRequirements || null,
    };

    // Extract pricingModes for saving to metadata (single-item booking)
    const singleItemPricingModes = nightlyPricing[0]?.pricingModes || {};

    // Create booking items for each parameter (linked to tent)
    for (const [paramId, quantity] of Object.entries(parameterQuantities)) {
      if ((quantity as number) > 0) {
        const unitPrice = parameterPricing[paramId] || 0;
        const pricingMode = singleItemPricingModes[paramId] || 'per_person';

        // Create metadata with pricingMode for Finance tab display
        const itemMetadataWithPricing = {
          ...itemMetadata,
          pricingMode,
        };

        const bookingItemInsertQuery = `
          INSERT INTO glamping_booking_items (
            booking_id,
            booking_tent_id,
            item_id,
            parameter_id,
            allocation_type,
            quantity,
            unit_price,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await client.query(bookingItemInsertQuery, [
          booking.id,
          tentId,
          itemId,
          paramId,
          'per_night',
          quantity,
          unitPrice,
          JSON.stringify(itemMetadataWithPricing),
        ]);
      }
    }

    // Create booking parameters snapshot (linked to tent)
    if (item.parameters && item.parameters.length > 0) {
      for (const param of item.parameters) {
        const bookedQty = parameterQuantities[param.id] || 0;

        const bookingParamInsertQuery = `
          INSERT INTO glamping_booking_parameters (
            booking_id,
            booking_tent_id,
            parameter_id,
            label,
            booked_quantity,
            controls_inventory
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await client.query(bookingParamInsertQuery, [
          booking.id,
          tentId,
          param.id,
          param.name,
          bookedQty,
          param.controls_inventory || false,
        ]);
      }
    }

    // Save menu products (food/beverages) if any (linked to tent, with per-product discount)
    if (menuProducts && menuProducts.length > 0) {
      for (let mpIdx = 0; mpIdx < menuProducts.length; mpIdx++) {
        const mp = menuProducts[mpIdx];
        if (mp.quantity > 0) {
          const mpVoucher = singleMenuProductVouchers.find(v => v.productIndex === mpIdx);

          const menuProductInsertQuery = `
            INSERT INTO glamping_booking_menu_products (
              booking_id,
              booking_tent_id,
              menu_item_id,
              quantity,
              unit_price,
              voucher_code,
              voucher_id,
              discount_type,
              discount_value,
              discount_amount,
              serving_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `;

          await client.query(menuProductInsertQuery, [
            booking.id,
            tentId,
            mp.id,
            mp.quantity,
            mp.price,
            mpVoucher?.voucherCode || null,
            mpVoucher?.voucherId || null,
            mpVoucher?.discountType || null,
            mpVoucher?.discountValue || 0,
            mpVoucher?.discountAmount || 0,
            mp.servingDate || null,
          ]);
        }
      }
    }

    // Create status history
    const statusHistoryQuery = `
      INSERT INTO glamping_booking_status_history (
        booking_id,
        previous_status,
        new_status,
        previous_payment_status,
        new_payment_status,
        reason
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await client.query(statusHistoryQuery, [
      booking.id,
      null,
      'confirmed',
      null,
      'pending',
      'Booking created and confirmed',
    ]);

    // Increment voucher usage for each unique voucher used
    const singleVoucherIncrements: Record<string, number> = {};

    if (singleTentVoucherId) {
      singleVoucherIncrements[singleTentVoucherId] = (singleVoucherIncrements[singleTentVoucherId] || 0) + 1;
    }
    for (const pv of singleMenuProductVouchers) {
      if (pv.voucherId) {
        singleVoucherIncrements[pv.voucherId] = (singleVoucherIncrements[pv.voucherId] || 0) + 1;
      }
    }

    for (const [vid, count] of Object.entries(singleVoucherIncrements)) {
      await client.query(
        `UPDATE glamping_discounts
         SET current_uses = current_uses + $2,
             updated_at = NOW()
         WHERE id = $1`,
        [vid, count]
      );
    }

    await client.query('COMMIT');
    client.release();

    // Determine payment requirement
    // Note: paymentRequired already calculated above for paymentExpiresAt
    let redirectUrl = `/glamping/booking/confirmation/${booking.id}`;

    if (paymentRequired) {
      redirectUrl = `/glamping/booking/payment/${booking.id}`;
    }

    // =========================================================================
    // SEND EMAILS (after successful commit)
    // =========================================================================

    const customerName = `${guestFirstName} ${guestLastName}`.trim();
    const zoneName = item.zone_name || 'Glamping Zone';
    const itemName = item.name || '';

    // 1. Send booking confirmation email to customer
    try {
      await sendGlampingBookingConfirmation({
        customerEmail: guestEmail,
        customerName,
        bookingCode: booking.booking_code,
        zoneName,
        itemName,
        checkInDate: new Date(checkInDate).toLocaleDateString('vi-VN'),
        checkOutDate: new Date(checkOutDate).toLocaleDateString('vi-VN'),
        totalAmount: parseFloat(booking.total_amount),
        numberOfGuests: adults + children,
        glampingBookingId: booking.id,
        enableDinnerReminderEmail: item.enable_dinner_reminder_email !== false,
      });
      console.log(`✅ Glamping booking confirmation email sent to ${guestEmail}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send glamping booking confirmation email:', emailError);
    }

    // 2. Send notification emails to staff (admin, sale, operations, zone owners)
    try {
      await sendGlampingBookingNotificationToStaff({
        bookingCode: booking.booking_code,
        guestName: customerName,
        guestEmail,
        guestPhone: guestPhone || '',
        zoneName,
        itemName,
        checkInDate: new Date(checkInDate).toLocaleDateString('vi-VN'),
        checkOutDate: new Date(checkOutDate).toLocaleDateString('vi-VN'),
        numberOfGuests: adults + children,
        totalAmount: parseFloat(booking.total_amount),
        paymentStatus: 'Chờ thanh toán',
        glampingBookingId: booking.id,
        zoneId,
      });
    } catch (staffEmailError) {
      console.error('⚠️ Failed to send glamping staff notification emails:', staffEmailError);
    }

    // =========================================================================
    // CREATE IN-APP NOTIFICATIONS
    // =========================================================================

    try {
      const {
        sendNotificationToCustomer,
        broadcastToRole,
        notifyGlampingOwnersOfBooking,
      } = await import('@/lib/notifications');

      // 1. Notify customer
      await sendNotificationToCustomer(
        customerId,
        'booking_created',
        {
          booking_reference: booking.booking_code,
          booking_id: booking.id,
          booking_code: booking.booking_code, // For link transformation
        },
        'glamping'
      );

      // 2. Notify staff (admin, sale, operations)
      const staffData = {
        customer_name: customerName,
        booking_reference: booking.booking_code,
        booking_code: booking.booking_code,
        booking_id: booking.id,
        pitch_name: itemName,
        check_in_date: new Date(checkInDate).toLocaleDateString('vi-VN'),
        check_out_date: new Date(checkOutDate).toLocaleDateString('vi-VN'),
        total_amount: new Intl.NumberFormat('vi-VN').format(parseFloat(booking.total_amount)) + ' ₫',
      };

      await Promise.all([
        broadcastToRole('admin', 'new_booking_created', staffData, 'glamping'),
        broadcastToRole('sale', 'new_booking_created', staffData, 'glamping'),
        broadcastToRole('operations', 'new_booking_created', staffData, 'glamping'),
      ]);

      // 3. Notify glamping zone owners
      await notifyGlampingOwnersOfBooking(
        booking.id,
        'new_booking_created',
        staffData
      );

      console.log('✅ Glamping booking in-app notifications sent');
    } catch (notificationError) {
      console.error('⚠️ Failed to send glamping notifications:', notificationError);
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      paymentRequired,
      redirectUrl,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
