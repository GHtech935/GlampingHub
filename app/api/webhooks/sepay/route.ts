import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import crypto from "crypto";
import { sendNotificationToCustomer, broadcastToRole, notifyOwnersOfBooking } from "@/lib/notifications";
import { logBookingHistory, historyDescriptions } from "@/lib/booking-history";
import { recalculateBookingCommission } from "@/lib/commission";
import { sendTemplateEmail, sendGlampingPaymentConfirmationEmail } from "@/lib/email";
import {
  startWebhookLog,
  completeWebhookLog,
  logWebhookError,
  extractHeaders,
  extractClientIP,
  WebhookLogRecord,
} from "@/lib/webhook-logger";
import { checkAndAlertWebhookFailure } from "@/lib/webhook-alert";
import { getBankAccountByAccountNumber } from "@/lib/bank-accounts";

/**
 * Sepay Webhook Handler
 *
 * Nhận webhook từ Sepay khi có giao dịch chuyển khoản ngân hàng
 *
 * Webhook format từ Sepay (Production):
 * {
 *   "id": 31297680,
 *   "gateway": "ACB",                    // Tên ngân hàng
 *   "transactionDate": "2025-11-19 11:48:29",
 *   "accountNumber": "21288187",         // STK nhận
 *   "content": "IB GH25000002 DEPOSIT",  // Nội dung CK (chứa booking_reference)
 *   "transferAmount": 1400000,           // Số tiền (VND)
 *   "referenceCode": "3286",             // Mã tham chiếu
 *   "description": "BankAPINotify IB GH25000002 DEPOSIT",
 *   "transferType": "in",
 *   "accumulated": 0
 * }
 *
 * Flow:
 * 1. Khách tạo booking → payment_status = 'pending'
 * 2. Hiển thị QR code với nội dung = booking_reference
 * 3. Khách quét QR và chuyển khoản qua ngân hàng
 * 4. Sepay gọi webhook này với thông tin giao dịch
 * 5. Auto-match transaction với booking (extract GH\d{8} từ content)
 * 6. Cập nhật payment_status = 'deposit_paid' hoặc 'fully_paid'
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  // Extract request info for logging
  const requestHeaders = extractHeaders(request.headers);
  const ipAddress = extractClientIP(request.headers);
  const userAgent = request.headers.get("user-agent") || undefined;

  let webhookLog: WebhookLogRecord | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};

  try {
    body = await request.json();

    // Start webhook logging
    webhookLog = await startWebhookLog({
      webhookType: "sepay",
      requestHeaders,
      requestBody: body,
      ipAddress,
      userAgent,
    });

    console.log('📥 Sepay webhook received:', JSON.stringify(body, null, 2));

    // Verify signature từ Sepay (nếu có)
    const signature = request.headers.get('x-sepay-signature');
    if (signature && process.env.SEPAY_SECRET_KEY) {
      const computedSignature = crypto
        .createHmac('sha256', process.env.SEPAY_SECRET_KEY)
        .update(JSON.stringify(body))
        .digest('hex');

      if (signature !== computedSignature) {
        console.error('❌ Invalid webhook signature');

        // Log signature error
        if (webhookLog) {
          await completeWebhookLog(webhookLog, {
            status: "invalid_signature",
            httpStatusCode: 401,
            responseBody: { error: "Invalid signature" },
            errorType: "signature_invalid",
            errorMessage: "Webhook signature verification failed",
          });
          await checkAndAlertWebhookFailure("sepay", "Invalid webhook signature");
        }

        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Extract data từ Sepay webhook - support both old test format and new Sepay format
    const {
      id: sepay_transaction_id,
      // Old test format
      transaction_code: oldTransactionCode,
      amount: oldAmount,
      description: oldDescription,
      account_number: oldAccountNumber,
      bank_name: oldBankName,
      transaction_date: oldTransactionDate,
      // New Sepay format (actual production format)
      referenceCode,
      transferAmount,
      content,
      accountNumber,
      gateway,
      transactionDate,
      transferType,
    } = body;

    // Map to unified format (prioritize new Sepay format)
    const transaction_code = referenceCode || oldTransactionCode || `SEPAY-${sepay_transaction_id}`;
    const amount = transferAmount || oldAmount;
    const description = content || oldDescription;
    const account_number = accountNumber || oldAccountNumber;
    const bank_name = gateway || oldBankName || 'sepay';
    const transaction_date = transactionDate || oldTransactionDate;

    // Get bank_account_id from account_number (for tracking)
    let bank_account_id: string | null = null;
    if (account_number) {
      try {
        const bankAccount = await getBankAccountByAccountNumber(account_number);
        bank_account_id = bankAccount?.id || null;
        if (!bank_account_id) {
          console.warn(`⚠️ Bank account not found for account_number: ${account_number}`);
        }
      } catch (error) {
        console.error('Error getting bank account:', error);
      }
    }

    // Validate required fields
    if (!amount || !description) {
      console.error('❌ Missing required fields in webhook', {
        amount,
        description,
        body: JSON.stringify(body, null, 2)
      });

      // Log validation error
      if (webhookLog) {
        await completeWebhookLog(webhookLog, {
          status: "validation_error",
          httpStatusCode: 400,
          responseBody: { error: "Missing required fields: amount and description are required" },
          errorType: "validation_failed",
          errorMessage: `Missing fields: ${!amount ? 'amount' : ''} ${!description ? 'description' : ''}`.trim(),
        });
        await checkAndAlertWebhookFailure("sepay", "Missing required fields in webhook");
      }

      return NextResponse.json(
        { error: 'Missing required fields: amount and description are required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Check duplicate transaction
    const existingTx = await client.query(
      `SELECT id, status, booking_id FROM sepay_transactions WHERE transaction_code = $1`,
      [transaction_code]
    );

    if (existingTx.rows.length > 0) {
      const existing = existingTx.rows[0];

      // Nếu transaction vẫn pending (chưa match được), cho phép re-match
      if (existing.status === 'pending' && !existing.booking_id) {
        console.log('⚠️ Transaction exists but pending, re-attempting match:', transaction_code);
        // Continue to matching logic below
      } else {
        // Transaction đã matched hoặc cancelled rồi, không xử lý lại
        await client.query('ROLLBACK');
        console.log('⚠️ Transaction already processed:', transaction_code, 'Status:', existing.status);

        // Log duplicate
        if (webhookLog) {
          await completeWebhookLog(webhookLog, {
            status: "duplicate",
            httpStatusCode: 200,
            responseBody: { message: "Transaction already processed", status: existing.status },
            transactionCode: transaction_code,
            bookingId: existing.booking_id,
          });
        }

        return NextResponse.json(
          { message: 'Transaction already processed', status: existing.status },
          { status: 200 }
        );
      }
    }

    // Lưu hoặc update transaction vào DB
    let transactionId: string;

    if (existingTx.rows.length > 0 && existingTx.rows[0].status === 'pending') {
      // Update existing pending transaction với webhook data mới
      transactionId = existingTx.rows[0].id;
      await client.query(
        `UPDATE sepay_transactions
         SET sepay_transaction_id = $1,
             amount = $2,
             description = $3,
             account_number = $4,
             bank_name = $5,
             transaction_date = $6,
             gateway = $7,
             webhook_data = $8,
             bank_account_id = $9,
             updated_at = NOW()
         WHERE id = $10`,
        [
          sepay_transaction_id,
          amount,
          description,
          account_number,
          bank_name,
          transaction_date || new Date().toISOString(),
          gateway,
          JSON.stringify(body),
          bank_account_id,
          transactionId,
        ]
      );
      console.log('✅ Updated existing pending transaction:', transaction_code);
    } else {
      // Insert new transaction
      const txResult = await client.query(
        `INSERT INTO sepay_transactions (
          sepay_transaction_id,
          transaction_code,
          amount,
          description,
          account_number,
          bank_name,
          transaction_date,
          gateway,
          webhook_data,
          bank_account_id,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          sepay_transaction_id,
          transaction_code,
          amount,
          description,
          account_number,
          bank_name,
          transaction_date || new Date().toISOString(),
          gateway,
          JSON.stringify(body),
          bank_account_id,
          'pending', // Sẽ update thành 'matched' sau khi match với booking
        ]
      );
      transactionId = txResult.rows[0].id;
      console.log('✅ Inserted new transaction:', transaction_code);
    }

    // Auto-match với booking
    // Tìm booking_reference trong description (format: CH25000001 hoặc GH25000001)
    let bookingReference: string | null = null;
    let foundBooking = null;
    let isExpiredBooking = false;
    let bookingType: 'camping' | 'glamping' | null = null;
    let isBalancePayment = false; // Flag for balance payment (GH{8}_balance)

    if (description) {
      // First check: Balance payment pattern (GH\d{8}_balance)
      const balanceMatch = description.match(/(GH\d{8})_balance/i);

      if (balanceMatch) {
        // Balance payment for glamping booking
        isBalancePayment = true;
        bookingReference = balanceMatch[1].toUpperCase();
        bookingType = 'glamping';

        console.log('💰 Balance payment detected:', bookingReference);

        const bookingResult = await client.query(
          `SELECT * FROM glamping_bookings WHERE booking_code = $1`,
          [bookingReference]
        );

        if (bookingResult.rows.length > 0) {
          foundBooking = bookingResult.rows[0];

          // Kiểm tra nếu booking đã expired/cancelled
          if (foundBooking.status === 'cancelled' && foundBooking.payment_status === 'expired') {
            isExpiredBooking = true;
          }
        }
      } else {
        // Fallback: Regular payment pattern (CH/GH + 8 digits)
        const match = description.match(/(CH|GH)\d{8}/i);
        if (match) {
          const matchedRef = match[0].toUpperCase();
          bookingReference = matchedRef;
          const prefix = matchedRef.substring(0, 2);

          if (prefix === 'CH') {
            // CampingHub booking - lookup in bookings table
            bookingType = 'camping';
            const bookingResult = await client.query(
              `SELECT * FROM bookings WHERE booking_reference = $1`,
              [bookingReference]
            );

            if (bookingResult.rows.length > 0) {
              foundBooking = bookingResult.rows[0];

              // Kiểm tra nếu booking đã expired/cancelled
              if (foundBooking.status === 'cancelled' && foundBooking.payment_status === 'expired') {
                isExpiredBooking = true;
              }
            }
          } else if (prefix === 'GH') {
            // GlampingHub booking - lookup in glamping_bookings table
            bookingType = 'glamping';
            const bookingResult = await client.query(
              `SELECT * FROM glamping_bookings WHERE booking_code = $1`,
              [bookingReference]
            );

            if (bookingResult.rows.length > 0) {
              foundBooking = bookingResult.rows[0];

              // Kiểm tra nếu booking đã expired/cancelled
              if (foundBooking.status === 'cancelled' && foundBooking.payment_status === 'expired') {
                isExpiredBooking = true;
              }
            }
          }
        }
      }
    }

    // Case 0: Balance Payment (GH{8}_balance) - Only for glamping bookings with deposit_paid status
    if (isBalancePayment && foundBooking && foundBooking.payment_status === 'deposit_paid' && bookingType === 'glamping') {
      console.log(`✅ Processing balance payment for glamping booking:`, bookingReference);

      const paidAmount = parseFloat(amount);

      // Calculate actual balance: total_amount + additional_costs - total_paid
      const additionalCostsResult = await client.query(
        `SELECT COALESCE(SUM(total_price + tax_amount), 0) as additional_total
         FROM glamping_booking_additional_costs
         WHERE booking_id = $1`,
        [foundBooking.id]
      );
      const additionalCostsTotal = parseFloat(additionalCostsResult.rows[0].additional_total || 0);

      const paymentsResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as total_paid
         FROM glamping_booking_payments
         WHERE booking_id = $1 AND status IN ('successful', 'completed', 'paid')`,
        [foundBooking.id]
      );
      const totalPaid = parseFloat(paymentsResult.rows[0].total_paid || 0);

      const totalAmount = parseFloat(foundBooking.total_amount) + additionalCostsTotal;
      const expectedBalance = totalAmount - totalPaid;
      const tolerance = 0.01; // 1% tolerance

      // Validate payment amount matches expected balance (with 1% tolerance)
      const isValidBalanceAmount = expectedBalance > 0 &&
        Math.abs(paidAmount - expectedBalance) / expectedBalance < tolerance;

      if (!isValidBalanceAmount) {
        console.log(`⚠️ Balance payment amount mismatch. Expected: ${expectedBalance}, Received: ${paidAmount}`);
        // Still process but log the discrepancy
      }

      // Update transaction status
      await client.query(
        `UPDATE sepay_transactions
         SET glamping_booking_id = $1,
             status = 'matched',
             matched_at = NOW(),
             matched_by = 'auto'
         WHERE id = $2`,
        [foundBooking.id, transactionId]
      );

      // Update glamping_bookings to fully_paid
      await client.query(
        `UPDATE glamping_bookings
         SET payment_status = 'fully_paid',
             updated_at = NOW()
         WHERE id = $1`,
        [foundBooking.id]
      );

      // Create payment record with note indicating balance payment
      try {
        await client.query(
          `INSERT INTO glamping_booking_payments
            (booking_id, payment_method, amount, status, transaction_reference, notes, paid_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            foundBooking.id,
            'bank_transfer',
            paidAmount,
            'paid',
            transaction_code,
            'balance_payment', // Note to identify this as balance payment
          ]
        );
        console.log(`✅ Created balance payment record for glamping booking: ${bookingReference}, amount: ${paidAmount}`);
      } catch (paymentError) {
        console.error('⚠️ Failed to create balance payment record:', paymentError);
      }

      await client.query('COMMIT');

      console.log('✅ Glamping balance payment processed:', {
        booking_code: bookingReference,
        payment_status: 'fully_paid',
        amount: paidAmount,
        expectedBalance,
      });

      // Log successful balance payment
      if (webhookLog) {
        await completeWebhookLog(webhookLog, {
          status: "success",
          httpStatusCode: 200,
          responseBody: {
            success: true,
            message: "Balance payment matched and booking updated to fully_paid",
            booking_reference: bookingReference,
            matched: true,
            booking_type: 'glamping',
            payment_type: 'balance',
          },
          transactionCode: transaction_code,
          bookingReference: bookingReference || undefined,
          matched: true,
          matchType: "auto",
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Balance payment matched and booking updated to fully_paid',
        booking_reference: bookingReference,
        transaction_code,
        matched: true,
        booking_type: 'glamping',
        payment_type: 'balance',
      });
    }

    // Case 1: Booking có thể thanh toán (chỉ check payment_status, không check status)
    // Cả CampingHub và GlampingHub đều dùng: payment_status = 'pending' | 'deposit_paid'
    const validPaymentStatuses = ['pending', 'deposit_paid'];

    const matchedBooking = foundBooking &&
      validPaymentStatuses.includes(foundBooking.payment_status)
        ? foundBooking
        : null;

    if (matchedBooking) {
      console.log(`✅ Auto-matched with ${bookingType} booking:`, bookingReference);

      const paidAmount = parseFloat(amount);
      const totalAmount = parseFloat(matchedBooking.total_amount);
      const tolerance = 0.01; // 1% tolerance

      // CampingHub uses deposit_amount, GlampingHub uses deposit_due
      const depositAmount = bookingType === 'glamping'
        ? parseFloat(matchedBooking.deposit_due)
        : parseFloat(matchedBooking.deposit_amount);

      const isDeposit = depositAmount > 0 && Math.abs(paidAmount - depositAmount) / depositAmount < tolerance;
      const isFull = Math.abs(paidAmount - totalAmount) / totalAmount < tolerance;

      // Xác định loại thanh toán
      // Cả CampingHub và GlampingHub đều dùng: 'deposit_paid' | 'fully_paid'
      let newPaymentStatus: string;

      if (bookingType === 'glamping') {
        // GlampingHub payment status mapping (giống CampingHub)
        if (isFull) {
          newPaymentStatus = 'fully_paid';
          console.log('✅ Full payment detected (glamping)');
        } else if (isDeposit) {
          newPaymentStatus = 'deposit_paid';
          console.log('✅ Deposit payment detected (glamping)');
        } else {
          newPaymentStatus = matchedBooking.payment_status;
          console.log('⚠️ Payment amount mismatch - manual review required');
        }

        // Update transaction status - use glamping_booking_id for glamping
        await client.query(
          `UPDATE sepay_transactions
           SET glamping_booking_id = $1,
               status = 'matched',
               matched_at = NOW(),
               matched_by = 'auto'
           WHERE id = $2`,
          [matchedBooking.id, transactionId]
        );

        // Update glamping_bookings
        await client.query(
          `UPDATE glamping_bookings
           SET payment_status = $1,
               status = 'confirmed',
               confirmed_at = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [newPaymentStatus, matchedBooking.id]
        );

        // Create payment record in glamping_booking_payments table
        try {
          await client.query(
            `INSERT INTO glamping_booking_payments
              (booking_id, payment_method, amount, status, transaction_reference, paid_at, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [
              matchedBooking.id,
              'bank_transfer',
              paidAmount,
              'paid',
              transaction_code,
            ]
          );
          console.log(`✅ Created payment record for glamping booking: ${bookingReference}, amount: ${paidAmount}`);
        } catch (paymentError) {
          console.error('⚠️ Failed to create payment record:', paymentError);
          // Don't fail the webhook - booking status is already updated
        }

        await client.query('COMMIT');

        console.log('✅ Glamping booking updated and auto-confirmed:', {
          booking_code: bookingReference,
          status: 'confirmed',
          payment_status: newPaymentStatus,
          amount: paidAmount,
        });

        // Send confirmation emails after successful payment
        try {
          const formattedAmount = new Intl.NumberFormat('vi-VN').format(paidAmount) + ' ₫';

          // Fetch booking details for email
          const bookingDetailsResult = await pool.query(
            `SELECT
              gb.id,
              gb.booking_code,
              gb.customer_id,
              gb.check_in_date,
              gb.check_out_date,
              gb.total_amount,
              gb.deposit_due,
              gb.balance_due,
              gb.guests,
              c.email as customer_email,
              c.first_name as customer_first_name,
              c.last_name as customer_last_name,
              c.phone as customer_phone,
              gi.name as item_name,
              COALESCE(gz.name->>'vi', gz.name->>'en') as zone_name
            FROM glamping_bookings gb
            JOIN customers c ON gb.customer_id = c.id
            LEFT JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
            LEFT JOIN glamping_items gi ON gbi.item_id = gi.id
            LEFT JOIN glamping_zones gz ON gi.zone_id = gz.id
            WHERE gb.id = $1
            LIMIT 1`,
            [matchedBooking.id]
          );

          if (bookingDetailsResult.rows.length > 0) {
            const booking = bookingDetailsResult.rows[0];
            const itemName = booking.item_name || '';
            const zoneName = booking.zone_name || '';

            // 1. Send email to customer
            const confirmationLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000'}/glamping/booking/confirmation/${matchedBooking.id}`;

            await sendTemplateEmail({
              templateSlug: 'glamping-booking-confirmed',
              to: [{
                email: booking.customer_email,
                name: `${booking.customer_first_name} ${booking.customer_last_name}`.trim()
              }],
              variables: {
                customer_name: booking.customer_first_name,
                booking_reference: bookingReference || '',
                zone_name: zoneName,
                checkin_date: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
                checkout_date: new Date(booking.check_out_date).toLocaleDateString('vi-VN'),
                notification_link: confirmationLink,
              },
              glampingBookingId: matchedBooking.id,
            });

            console.log('✅ Confirmation email sent to customer:', booking.customer_email);

            // Gửi email xác nhận thanh toán (đã nhận cọc/thanh toán đầy đủ)
            await sendGlampingPaymentConfirmationEmail({
              customerEmail: booking.customer_email,
              customerName: `${booking.customer_first_name} ${booking.customer_last_name}`.trim(),
              bookingCode: bookingReference || '',
              amount: paidAmount,
              glampingBookingId: matchedBooking.id,
            });

            console.log('✅ Payment confirmation email sent to customer:', booking.customer_email);

            // 2. Send notification email to admin/sale/operations/glamping_owner
            // Get zone_id from booking
            const zoneResult = await pool.query(
              `SELECT gi.zone_id FROM glamping_items gi WHERE gi.id = $1`,
              [matchedBooking.item_id]
            );
            const zoneId = zoneResult.rows[0]?.zone_id;

            // Get staff: admin, sale, operations, and glamping_owner (only for this zone)
            const staffResult = await pool.query(
              `SELECT DISTINCT u.email, COALESCE(u.first_name, 'Admin') as name
               FROM users u
               LEFT JOIN user_glamping_zones ugz ON u.id = ugz.user_id AND ugz.zone_id = $1
               WHERE u.is_active = true
               AND (
                 u.role IN ('admin', 'sale', 'operations')
                 OR (u.role = 'glamping_owner' AND ugz.zone_id IS NOT NULL)
               )`,
              [zoneId]
            );

            const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';
            const bookingLink = `${appUrl}/admin/zones/all/bookings?booking_code=${bookingReference}`;

            for (const staff of staffResult.rows) {
              await sendTemplateEmail({
                templateSlug: 'glamping-admin-new-booking-pending',
                to: [{ email: staff.email, name: staff.name }],
                variables: {
                  admin_name: staff.name,
                  booking_reference: bookingReference || '',
                  amount: formattedAmount,
                  guest_name: `${booking.customer_first_name} ${booking.customer_last_name}`.trim(),
                  guest_email: booking.customer_email,
                  zone_name: zoneName,
                  item_name: itemName,
                  check_in_date: new Date(booking.check_in_date).toLocaleDateString('vi-VN'),
                  check_out_date: new Date(booking.check_out_date).toLocaleDateString('vi-VN'),
                  notification_link: bookingLink,
                },
                glampingBookingId: matchedBooking.id,
              });
            }

            console.log(`✅ Notification emails sent to ${staffResult.rows.length} staff member(s)`);
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send confirmation emails:', emailError);
          // Don't fail the webhook if email sending fails
        }

        // =========================================================================
        // SEND IN-APP NOTIFICATIONS
        // =========================================================================

        try {
          const {
            sendNotificationToCustomer,
            broadcastToRole,
            notifyGlampingOwnersOfBooking,
          } = await import('@/lib/notifications');

          const formattedAmount = new Intl.NumberFormat('vi-VN').format(paidAmount) + ' ₫';

          // Fetch booking details for notifications
          const detailsResult = await pool.query(
            `SELECT
              gb.customer_id,
              gb.booking_code,
              gb.check_in_date,
              gb.check_out_date,
              gi.name as item_name,
              COALESCE(gz.name->>'vi', gz.name->>'en') as zone_name,
              u.full_name as guest_name,
              u.email as guest_email
            FROM glamping_bookings gb
            LEFT JOIN glamping_booking_items gbi ON gb.id = gbi.booking_id
            LEFT JOIN glamping_items gi ON gbi.item_id = gi.id
            LEFT JOIN glamping_zones gz ON gi.zone_id = gz.id
            LEFT JOIN users u ON gb.customer_id = u.id
            WHERE gb.id = $1
            LIMIT 1`,
            [matchedBooking.id]
          );

          if (detailsResult.rows.length > 0) {
            const details = detailsResult.rows[0];

            // 1. Notify customer
            await sendNotificationToCustomer(
              details.customer_id,
              'payment_received',
              {
                amount: formattedAmount,
                booking_id: matchedBooking.id,
                booking_code: details.booking_code,
                booking_reference: details.booking_code,
              },
              'glamping'
            );

            // 2. Notify staff
            const staffData = {
              booking_reference: details.booking_code,
              booking_code: details.booking_code,
              booking_id: matchedBooking.id,
              amount: formattedAmount,
              zone_name: details.zone_name || 'N/A',
              item_name: details.item_name || 'N/A',
              guest_name: details.guest_name || 'Khách hàng',
              guest_email: details.guest_email || '',
              check_in_date: new Date(details.check_in_date).toLocaleDateString('vi-VN'),
              check_out_date: new Date(details.check_out_date).toLocaleDateString('vi-VN'),
              notification_link: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://glampinghub.vn'}/admin/glamping/bookings`,
            };

            await Promise.all([
              broadcastToRole('admin', 'new_booking_pending', staffData, 'glamping'),
              broadcastToRole('operations', 'new_booking_pending', staffData, 'glamping'),
              notifyGlampingOwnersOfBooking(matchedBooking.id, 'new_booking_pending', staffData),
            ]);

            console.log('✅ Glamping payment in-app notifications sent');
          }
        } catch (notificationError) {
          console.error('⚠️ Failed to send glamping payment notifications:', notificationError);
          // Don't fail the webhook if notification sending fails
        }

        // Log successful match
        if (webhookLog) {
          await completeWebhookLog(webhookLog, {
            status: "success",
            httpStatusCode: 200,
            responseBody: {
              success: true,
              message: "Glamping transaction matched and booking updated",
              booking_reference: bookingReference,
              matched: true,
              booking_type: 'glamping',
            },
            transactionCode: transaction_code,
            bookingId: undefined, // Don't set bookingId for glamping (FK constraint to bookings table)
            bookingReference: bookingReference || undefined,
            matched: true,
            matchType: "auto",
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Glamping transaction matched and booking updated',
          booking_reference: bookingReference,
          transaction_code,
          matched: true,
          booking_type: 'glamping',
        });
      } else {
        // CampingHub payment status mapping (existing logic)
        if (isFull) {
          newPaymentStatus = 'fully_paid';
          console.log('✅ Full payment detected');
        } else if (isDeposit) {
          newPaymentStatus = 'deposit_paid';
          console.log('✅ Deposit payment detected');
        } else {
          newPaymentStatus = matchedBooking.payment_status;
          console.log('⚠️ Payment amount mismatch - manual review required');
        }

        // Update transaction status
        await client.query(
          `UPDATE sepay_transactions
           SET booking_id = $1,
               status = 'matched',
               matched_at = NOW(),
               matched_by = 'auto'
           WHERE id = $2`,
          [matchedBooking.id, transactionId]
        );

        // Check if this is a late payment (payment received after payment_expires_at)
        const isLatePayment = matchedBooking.payment_expires_at &&
          new Date(matchedBooking.payment_expires_at) < new Date();

        if (isLatePayment) {
          console.log('⚠️ Late payment detected - payment received after expiry time');
        }

        // Update booking - auto-confirm booking on payment received
        // Set status to 'confirmed' and update payment_status
        // Also set has_late_payment flag if payment is late
        await client.query(
          `UPDATE bookings
           SET payment_method = 'bank_transfer',
               payment_reference = $1,
               paid_at = $2,
               payment_status = $3,
               status = 'confirmed',
               confirmed_at = NOW(),
               has_late_payment = CASE WHEN $5 THEN true ELSE has_late_payment END,
               updated_at = NOW()
           WHERE id = $4`,
          [
            transaction_code,
            transaction_date || new Date().toISOString(),
            newPaymentStatus,
            matchedBooking.id,
            isLatePayment,
          ]
        );

        // Recalculate commission based on new payment_status
        await recalculateBookingCommission(client, matchedBooking.id);
        console.log('✅ Commission recalculated for booking:', bookingReference);

        // Update existing pending payment or create new one
        // First, try to find existing pending payment for this booking
        const existingPayment = await client.query(
          `SELECT id FROM payments WHERE booking_id = $1 AND status = 'pending' LIMIT 1`,
          [matchedBooking.id]
        );

        if (existingPayment.rows.length > 0) {
          // Update existing payment record
          await client.query(
            `UPDATE payments
             SET amount = $1,
                 payment_type = $2,
                 status = 'completed',
                 external_payment_id = $3,
                 processed_at = $4,
                 payment_metadata = $5
             WHERE id = $6`,
            [
              paidAmount,
              isFull ? 'full_payment' : 'deposit',
              transaction_code,
              transaction_date || new Date().toISOString(),
              JSON.stringify({
                gateway: gateway,
                sepay_transaction_id: sepay_transaction_id,
                auto_matched: true,
              }),
              existingPayment.rows[0].id,
            ]
          );
          console.log('✅ Updated existing payment record');
        } else {
          // Create new payment record
          await client.query(
            `INSERT INTO payments
             (booking_id, amount, currency, payment_type, payment_method, status, external_payment_id, processed_at, payment_metadata)
             VALUES ($1, $2, 'VND', $3, 'bank_transfer', 'completed', $4, $5, $6)`,
            [
              matchedBooking.id,
              paidAmount,
              isFull ? 'full_payment' : 'deposit',
              transaction_code,
              transaction_date || new Date().toISOString(),
              JSON.stringify({
                gateway: gateway,
                sepay_transaction_id: sepay_transaction_id,
                auto_matched: true,
              })
            ]
          );
          console.log('✅ Created new payment record');
        }

        await client.query('COMMIT');

        // Log status change to history
        await logBookingHistory({
          bookingId: matchedBooking.id,
          action: 'status_changed',
          oldStatus: matchedBooking.status,
          newStatus: 'confirmed',
          actorType: 'system',
          actorName: 'Auto-confirm (Sepay)',
          description: historyDescriptions.statusChanged(matchedBooking.status, 'confirmed', 'System', 'vi'),
          metadata: { autoConfirmed: true }
        });

        // Also log payment received to history
        await logBookingHistory({
          bookingId: matchedBooking.id,
          action: 'payment_received',
          oldPaymentStatus: matchedBooking.payment_status,
          newPaymentStatus: newPaymentStatus,
          paymentAmount: paidAmount,
          paymentMethod: 'bank_transfer',
          actorType: 'system',
          actorName: 'Sepay Webhook',
          description: historyDescriptions.paymentReceived(paidAmount, newPaymentStatus, 'vi'),
          metadata: {
            transactionCode: transaction_code,
            gateway: gateway,
            transactionDate: transaction_date,
            transferType,
          },
        });

        console.log('✅ Booking updated and auto-confirmed:', {
          booking_reference: bookingReference,
          status: 'confirmed',
          payment_status: newPaymentStatus,
          amount: paidAmount,
        });

        // Send notifications after successful payment
        try {
          // Format amount for display
          const formattedAmount = new Intl.NumberFormat('vi-VN').format(paidAmount) + ' ₫';

          // Fetch additional booking details for notification
          const bookingDetailsResult = await pool.query(
            `SELECT
              b.guest_first_name,
              b.guest_last_name,
              b.guest_email,
              b.check_in_date,
              b.check_out_date,
              COALESCE(p.name->>'vi', p.name->>'en') as pitch_name,
              COALESCE(c.name->>'vi', c.name->>'en') as campsite_name
            FROM bookings b
            JOIN pitches p ON b.pitch_id = p.id
            JOIN campsites c ON p.campsite_id = c.id
            WHERE b.id = $1`,
            [matchedBooking.id]
          );
        const bookingDetails = bookingDetailsResult.rows[0];

        // Send notification to customer
        await sendNotificationToCustomer(matchedBooking.customer_id, 'payment_received', {
          amount: formattedAmount,
          booking_id: matchedBooking.id,
          booking_reference: bookingReference,
        });

        // Prepare data for admin notification email
        const adminNotificationData = {
          booking_reference: bookingReference,
          booking_id: matchedBooking.id,
          amount: formattedAmount,
          guest_name: `${bookingDetails?.guest_first_name || ''} ${bookingDetails?.guest_last_name || ''}`.trim() || 'N/A',
          guest_email: bookingDetails?.guest_email || 'N/A',
          campsite_name: bookingDetails?.campsite_name || 'N/A',
          pitch_name: bookingDetails?.pitch_name || 'N/A',
          check_in_date: bookingDetails?.check_in_date ? new Date(bookingDetails.check_in_date).toLocaleDateString('vi-VN') : 'N/A',
          check_out_date: bookingDetails?.check_out_date ? new Date(bookingDetails.check_out_date).toLocaleDateString('vi-VN') : 'N/A',
        };

        // Send notification to admin/operations staff + campsite owners
        await Promise.all([
          broadcastToRole('admin', 'new_booking_pending', adminNotificationData),
          broadcastToRole('operations', 'new_booking_pending', adminNotificationData),
          notifyOwnersOfBooking(matchedBooking.id, 'new_booking_pending', adminNotificationData),
        ]);

        console.log('✅ Payment notifications sent to customer, staff, and campsite owners');
      } catch (notificationError) {
        console.error('⚠️ Failed to send payment notifications:', notificationError);
      }

      // Log successful match
      if (webhookLog) {
        await completeWebhookLog(webhookLog, {
          status: "success",
          httpStatusCode: 200,
          responseBody: {
            success: true,
            message: "Transaction matched and booking updated",
            booking_reference: bookingReference,
            matched: true,
          },
          transactionCode: transaction_code,
          bookingId: matchedBooking.id,
          bookingReference: bookingReference || undefined,
          matched: true,
          matchType: "auto",
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Transaction matched and booking updated',
        booking_reference: bookingReference,
        transaction_code,
        matched: true,
      });
      } // End of CampingHub else block
    } else if (isExpiredBooking && foundBooking) {
      // Case 2: Booking đã expired/cancelled - Late Payment
      console.log(`⚠️ Late payment detected for expired ${bookingType} booking:`, bookingReference);

      const paidAmount = parseFloat(amount);
      const formattedAmount = new Intl.NumberFormat('vi-VN').format(paidAmount) + ' ₫';

      if (bookingType === 'glamping') {
        // GlampingHub late payment
        await client.query(
          `UPDATE sepay_transactions
           SET glamping_booking_id = $1,
               status = 'late_payment',
               matched_at = NOW(),
               matched_by = 'auto'
           WHERE id = $2`,
          [foundBooking.id, transactionId]
        );

        await client.query('COMMIT');

        console.log('✅ Glamping late payment recorded:', {
          booking_code: bookingReference,
          amount: paidAmount,
        });

        // Log late payment for glamping
        if (webhookLog) {
          await completeWebhookLog(webhookLog, {
            status: "success",
            httpStatusCode: 200,
            responseBody: {
              success: true,
              message: "Glamping late payment detected for expired booking",
              booking_reference: bookingReference,
              late_payment: true,
              booking_type: 'glamping',
            },
            transactionCode: transaction_code,
            bookingId: foundBooking.id,
            bookingReference: bookingReference || undefined,
            matched: true,
            matchType: "late_payment",
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Glamping late payment detected for expired booking. Admin notified.',
          booking_reference: bookingReference,
          transaction_code,
          matched: false,
          late_payment: true,
          booking_type: 'glamping',
        });
      } else {
        // CampingHub late payment (existing logic)
        // Lưu transaction với status 'late_payment'
        await client.query(
          `UPDATE sepay_transactions
           SET booking_id = $1,
               status = 'late_payment',
               matched_at = NOW(),
               matched_by = 'auto'
           WHERE id = $2`,
          [foundBooking.id, transactionId]
        );

        // Đánh dấu booking có late payment
        await client.query(
          `UPDATE bookings SET has_late_payment = true WHERE id = $1`,
          [foundBooking.id]
        );

        // Update existing pending payment or create new one for late payment
        const existingPayment = await client.query(
          `SELECT id FROM payments WHERE booking_id = $1 AND status = 'pending' LIMIT 1`,
          [foundBooking.id]
        );

        if (existingPayment.rows.length > 0) {
          // Update existing payment record to completed
          await client.query(
            `UPDATE payments
             SET amount = $1,
                 status = 'completed',
                 external_payment_id = $2,
                 processed_at = $3,
                 payment_metadata = $4
             WHERE id = $5`,
            [
              paidAmount,
              transaction_code,
              transaction_date || new Date().toISOString(),
              JSON.stringify({
                gateway: gateway,
                sepay_transaction_id: sepay_transaction_id,
                auto_matched: true,
                is_late_payment: true,
              }),
              existingPayment.rows[0].id,
            ]
          );
          console.log('✅ Updated existing payment record for late payment');
        } else {
          // Create new payment record for late payment
          await client.query(
            `INSERT INTO payments
             (booking_id, amount, currency, payment_type, payment_method, status, external_payment_id, processed_at, payment_metadata)
             VALUES ($1, $2, 'VND', 'late_payment', 'bank_transfer', 'completed', $3, $4, $5)`,
            [
              foundBooking.id,
              paidAmount,
              transaction_code,
              transaction_date || new Date().toISOString(),
              JSON.stringify({
                gateway: gateway,
                sepay_transaction_id: sepay_transaction_id,
                auto_matched: true,
                is_late_payment: true,
              }),
            ]
          );
          console.log('✅ Created new payment record for late payment');
        }

        await client.query('COMMIT');

        // Log to history
        await logBookingHistory({
          bookingId: foundBooking.id,
          action: 'late_payment_received',
          paymentAmount: paidAmount,
          paymentMethod: 'bank_transfer',
          actorType: 'system',
          actorName: 'Sepay',
          description: `Thanh toán muộn ${formattedAmount} - Booking đã hết hạn`,
          metadata: {
            transactionCode: transaction_code,
            gateway: gateway,
            transactionDate: transaction_date,
            isLatePayment: true,
          },
        });

        // Gửi thông báo
        try {
          // Gửi notification + email cho khách hàng
          if (foundBooking.customer_id) {
            await sendNotificationToCustomer(foundBooking.customer_id, 'late_payment_expired', {
              amount: formattedAmount,
              booking_reference: bookingReference,
            });
          }

          // Gửi notification cho admin
          await broadcastToRole('admin', 'late_payment_received', {
            amount: formattedAmount,
            booking_reference: bookingReference,
            booking_id: foundBooking.id,
          });

          await broadcastToRole('operations', 'late_payment_received', {
            amount: formattedAmount,
            booking_reference: bookingReference,
            booking_id: foundBooking.id,
          });

          // Gửi EMAIL cho admin về late payment
          const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';
          const notificationLink = `${appUrl}/admin/bookings/${foundBooking.id}`;

          // Lấy danh sách admin emails
          const adminResult = await pool.query(
            `SELECT email, COALESCE(first_name, 'Admin') as name FROM users WHERE role = 'admin' AND is_active = true`
          );

          for (const admin of adminResult.rows) {
            await sendTemplateEmail({
              templateSlug: 'admin-late-payment',
              to: [{ email: admin.email, name: admin.name }],
              variables: {
                booking_reference: bookingReference || '',
                amount: formattedAmount,
                notification_link: notificationLink,
              },
              bookingId: foundBooking.id,
            });
          }

          console.log(`✅ Late payment email sent to ${adminResult.rows.length} admin(s)`);
          console.log('✅ Late payment notifications sent to customer and admin');
        } catch (notificationError) {
          console.error('⚠️ Failed to send late payment notifications:', notificationError);
        }

        // Log late payment
        if (webhookLog) {
          await completeWebhookLog(webhookLog, {
            status: "success",
            httpStatusCode: 200,
            responseBody: {
              success: true,
              message: "Late payment detected for expired booking",
              booking_reference: bookingReference,
              late_payment: true,
            },
            transactionCode: transaction_code,
            bookingId: foundBooking.id,
            bookingReference: bookingReference || undefined,
            matched: true,
            matchType: "late_payment",
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Late payment detected for expired booking. Admin notified.',
          booking_reference: bookingReference,
          transaction_code,
          matched: false,
          late_payment: true,
        });
      } // End of CampingHub late payment else block
    } else {
      // Case 3: Không tìm thấy booking nào, lưu transaction để manual matching
      await client.query('COMMIT');

      console.log('⚠️ No matching booking found - manual review required');

      // Log unmatched transaction
      if (webhookLog) {
        await completeWebhookLog(webhookLog, {
          status: "success",
          httpStatusCode: 200,
          responseBody: {
            success: true,
            message: "Transaction saved, awaiting manual matching",
            matched: false,
          },
          transactionCode: transaction_code,
          bookingReference: bookingReference || undefined,
          matched: false,
          matchType: "unmatched",
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Transaction saved, awaiting manual matching',
        transaction_code,
        matched: false,
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Sepay webhook error:', error);

    // Log error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (webhookLog) {
      await completeWebhookLog(webhookLog, {
        status: "failed",
        httpStatusCode: 500,
        responseBody: { error: "Internal server error" },
        errorType: "internal_error",
        errorMessage,
        errorStack,
      });
      await checkAndAlertWebhookFailure("sepay", errorMessage);
    } else {
      // If webhookLog wasn't created yet, log error directly
      await logWebhookError(
        {
          webhookType: "sepay",
          requestHeaders,
          requestBody: body,
          ipAddress,
          userAgent,
        },
        {
          status: "failed",
          httpStatusCode: 500,
          responseBody: { error: "Internal server error" },
          errorType: "internal_error",
          errorMessage,
          errorStack,
        }
      );
      await checkAndAlertWebhookFailure("sepay", errorMessage);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    message: 'Sepay webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
