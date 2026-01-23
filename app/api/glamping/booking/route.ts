import { NextRequest, NextResponse } from 'next/server';
import pool, { getClient } from '@/lib/db';
import { calculateGlampingPricing } from '@/lib/glamping-pricing';
import {
  sendGlampingBookingConfirmation,
  sendGlampingBookingNotificationToStaff,
} from '@/lib/email';

export async function POST(request: NextRequest) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const body = await request.json();

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
      discountCode,
      paymentMethod = 'pay_now',
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

    // Fetch item details
    const itemQuery = `
      SELECT
        i.*,
        z.id as zone_id,
        z.name->>'vi' as zone_name,
        z.bank_account_id,
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
      LEFT JOIN glamping_item_parameters ip ON i.id = ip.item_id
      LEFT JOIN glamping_parameters p ON ip.parameter_id = p.id
      LEFT JOIN glamping_item_taxes it ON i.id = it.item_id
      LEFT JOIN glamping_taxes t ON it.tax_id = t.id
      WHERE i.id = $1
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

    // Check for overlapping bookings (prevent double booking)
    const overlapQuery = `
      SELECT b.id, b.booking_code, bi.parameter_id, b.check_in_date, b.check_out_date
      FROM glamping_bookings b
      JOIN glamping_booking_items bi ON b.id = bi.booking_id
      WHERE bi.item_id = $1
        AND b.status NOT IN ('cancelled', 'rejected')
        AND (
          (b.check_in_date < $3 AND b.check_out_date > $2)
          OR (b.check_in_date >= $2 AND b.check_in_date < $3)
          OR (b.check_out_date > $2 AND b.check_out_date <= $3)
        )
    `;
    const overlapResult = await client.query(overlapQuery, [itemId, checkInDate, checkOutDate]);

    // Check if any overlapping bookings use the same parameters we're trying to book
    if (overlapResult.rows.length > 0) {
      const requestedParams = Object.keys(parameterQuantities).filter(
        (paramId) => (parameterQuantities[paramId] as number) > 0
      );

      for (const existingBooking of overlapResult.rows) {
        if (requestedParams.includes(existingBooking.parameter_id)) {
          await client.query('ROLLBACK');
          client.release();
          return NextResponse.json(
            {
              error: 'This item is not available for the selected dates. Please choose different dates.',
              errorCode: 'DATES_NOT_AVAILABLE',
              conflictingBooking: {
                bookingCode: existingBooking.booking_code,
                checkIn: existingBooking.check_in_date,
                checkOut: existingBooking.check_out_date,
              },
            },
            { status: 409 }
          );
        }
      }
    }

    // Calculate pricing using the shared utility function
    const { parameterPricing } = await calculateGlampingPricing(
      client,
      itemId,
      checkIn,
      checkOut,
      parameterQuantities
    );

    // Calculate total accommodation cost
    let accommodationCost = 0;
    Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
      const paramTotalPrice = parameterPricing[paramId] || 0;
      accommodationCost += paramTotalPrice * (quantity as number);
    });

    // Apply discount code if provided
    let voucherDiscount = 0;
    let voucherId = null;
    const zoneId = item.zone_id;

    if (discountCode) {
      try {
        const validateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/glamping/validate-voucher`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: discountCode,
            zoneId,
            itemId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            totalAmount: accommodationCost,
          }),
        });

        if (validateResponse.ok) {
          const voucherData = await validateResponse.json();
          voucherDiscount = voucherData.discountAmount || 0;
          voucherId = voucherData.voucher.id;
        } else {
          // Voucher invalid - continue without discount
          const errorData = await validateResponse.json();
          console.error('Invalid voucher:', discountCode, errorData.error);
        }
      } catch (error) {
        console.error('Error validating voucher:', error);
        // Continue without discount if validation fails
      }
    }

    // Calculate menu products total
    let menuProductsTotal = 0;
    if (menuProducts && menuProducts.length > 0) {
      menuProductsTotal = menuProducts.reduce((sum: number, mp: any) => {
        return sum + (mp.price * mp.quantity);
      }, 0);
    }

    const subtotalAmount = accommodationCost + menuProductsTotal - voucherDiscount;
    const totalAmount = subtotalAmount;

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

    // Create booking record
    // Note: total_amount is a generated column (computed from subtotal - discount + tax)
    const bookingInsertQuery = `
      INSERT INTO glamping_bookings (
        booking_code,
        customer_id,
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
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING id, booking_code, created_at, total_amount
    `;

    const bookingResult = await client.query(bookingInsertQuery, [
      bookingCode,
      customerId,
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
    ]);

    const booking = bookingResult.rows[0];

    // Create booking items for each parameter
    for (const [paramId, quantity] of Object.entries(parameterQuantities)) {
      if ((quantity as number) > 0) {
        const unitPrice = parameterPricing[paramId] || 0;

        const bookingItemInsertQuery = `
          INSERT INTO glamping_booking_items (
            booking_id,
            item_id,
            parameter_id,
            allocation_type,
            quantity,
            unit_price
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await client.query(bookingItemInsertQuery, [
          booking.id,
          itemId,
          paramId,
          'per_night',
          quantity,
          unitPrice,
        ]);
      }
    }

    // Create booking parameters snapshot
    if (item.parameters && item.parameters.length > 0) {
      for (const param of item.parameters) {
        const bookedQty = parameterQuantities[param.id] || 0;

        const bookingParamInsertQuery = `
          INSERT INTO glamping_booking_parameters (
            booking_id,
            parameter_id,
            label,
            booked_quantity,
            controls_inventory
          )
          VALUES ($1, $2, $3, $4, $5)
        `;

        await client.query(bookingParamInsertQuery, [
          booking.id,
          param.id,
          param.name,
          bookedQty,
          param.controls_inventory || false,
        ]);
      }
    }

    // Save menu products (food/beverages) if any
    if (menuProducts && menuProducts.length > 0) {
      for (const mp of menuProducts) {
        if (mp.quantity > 0) {
          const menuProductInsertQuery = `
            INSERT INTO glamping_booking_menu_products (
              booking_id,
              menu_item_id,
              quantity,
              unit_price
            )
            VALUES ($1, $2, $3, $4)
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

    // If voucher was used, increment usage counter
    if (voucherId) {
      await client.query(
        `UPDATE glamping_discounts
         SET current_uses = current_uses + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [voucherId]
      );
    }

    await client.query('COMMIT');
    client.release();

    // Determine payment requirement
    const paymentRequired = paymentMethod === 'pay_now' || depositDue > 0;
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
      });
      console.log(`✅ Glamping booking confirmation email sent to ${guestEmail}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send glamping booking confirmation email:', emailError);
    }

    // 2. Send notification emails to staff (admin, sale, operations - NOT owner)
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
      });
    } catch (staffEmailError) {
      console.error('⚠️ Failed to send glamping staff notification emails:', staffEmailError);
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
