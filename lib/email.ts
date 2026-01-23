import * as brevo from '@getbrevo/brevo';
import { query } from './db';
import { EMAIL_TEMPLATES } from './email-templates-html';
import { GLAMPING_EMAIL_TEMPLATES } from './glamping-email-templates-html';

// Get Brevo API instance
function getBrevoApiInstance() {
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY || ''
  );
  return apiInstance;
}

// Email variables interface
interface EmailVariables {
  [key: string]: string | number;
}

/**
 * Format currency with thousand separators (Vietnamese format)
 * Example: 1368000 → "1.368.000 đ"
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' đ';
}

/**
 * Replace variables in text with actual values
 * Example: replaceVariables("Hello {customer_name}", { customer_name: "John" }) => "Hello John"
 */
export function replaceVariables(text: string, variables: EmailVariables): string {
  let result = text;

  Object.keys(variables).forEach(key => {
    // Support both {variable} and {{variable}} formats
    const regex1 = new RegExp(`\\{${key}\\}`, 'g');
    const regex2 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex1, String(variables[key]));
    result = result.replace(regex2, String(variables[key]));
  });

  return result;
}

/**
 * Send email via Brevo
 */
export async function sendEmail({
  to,
  subject,
  htmlContent,
  textContent,
  templateSlug,
  variables = {},
  bookingId,
  glampingBookingId,
}: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateSlug?: string;
  variables?: EmailVariables;
  bookingId?: string;
  glampingBookingId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate Brevo API key
    if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'your_brevo_api_key_here') {
      throw new Error('BREVO_API_KEY is not configured. Please set it in .env.local');
    }

    // Replace variables in subject and content
    const finalSubject = replaceVariables(subject, variables);
    const finalHtmlContent = htmlContent ? replaceVariables(htmlContent, variables) : undefined;
    const finalTextContent = textContent ? replaceVariables(textContent, variables) : undefined;

    // Prepare email data
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: process.env.FROM_NAME || 'GlampingHub',
      email: process.env.FROM_EMAIL || 'noreply@glampinghub.com',
    };
    sendSmtpEmail.to = to;
    sendSmtpEmail.subject = finalSubject;
    sendSmtpEmail.htmlContent = finalHtmlContent;
    sendSmtpEmail.textContent = finalTextContent;

    // Send email using fresh API instance
    const apiInstance = getBrevoApiInstance();
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

    // Extract messageId from Brevo response
    const messageId = (response as any).body?.messageId || (response as any).messageId;

    // Log to database
    await logEmail({
      templateSlug,
      recipientEmail: to[0].email,
      recipientName: to[0].name,
      subject: finalSubject,
      body: finalHtmlContent || finalTextContent || '',
      status: 'sent',
      providerMessageId: messageId,
      variables,
      bookingId,
      glampingBookingId,
    });

    console.log('✅ Email sent successfully:', {
      to: to[0].email,
      subject: finalSubject,
      messageId: messageId,
    });

    return {
      success: true,
      messageId: messageId,
    };
  } catch (error: any) {
    console.error('❌ Error sending email:', error);

    // Log failed email
    await logEmail({
      templateSlug,
      recipientEmail: to[0].email,
      recipientName: to[0].name,
      subject,
      body: htmlContent || textContent || '',
      status: 'failed',
      errorMessage: error.message,
      variables,
      bookingId,
      glampingBookingId,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send email using template from code
 * Both HTML and subject are defined in EMAIL_TEMPLATES
 */
export async function sendTemplateEmail({
  templateSlug,
  to,
  variables = {},
  bookingId,
  glampingBookingId,
}: {
  templateSlug: string;
  to: { email: string; name?: string }[];
  variables?: EmailVariables;
  bookingId?: string;
  glampingBookingId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Load template from code
    const template = EMAIL_TEMPLATES[templateSlug];
    if (!template) {
      throw new Error(`Email template not found: ${templateSlug}`);
    }

    // Check if template is active
    if (!template.isActive) {
      throw new Error(`Email template is inactive: ${templateSlug}`);
    }

    // Send email with HTML and subject from code
    return await sendEmail({
      to,
      subject: template.subject,
      htmlContent: template.html,
      templateSlug,
      variables,
      bookingId,
      glampingBookingId,
    });
  } catch (error: any) {
    console.error('❌ Error sending template email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Log email to database
 * Note: Uses template_slug column instead of template_id (no longer references email_templates table)
 * Supports both camping bookings (booking_id) and glamping bookings (glamping_booking_id)
 */
async function logEmail({
  templateSlug,
  recipientEmail,
  recipientName,
  subject,
  body,
  status,
  providerMessageId,
  errorMessage,
  variables,
  bookingId,
  glampingBookingId,
}: {
  templateSlug?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  providerMessageId?: string;
  errorMessage?: string;
  variables?: EmailVariables;
  bookingId?: string;
  glampingBookingId?: string;
}) {
  try {
    // Build metadata object with template_slug for reference
    const metadata: any = {};
    if (templateSlug) {
      metadata.template_slug = templateSlug;
    }
    if (variables) {
      metadata.variables = variables;
    }

    // Insert log - template_slug is now stored in metadata
    // glamping_booking_id column added for glamping bookings
    await query(
      `INSERT INTO email_logs
       (booking_id, glamping_booking_id, recipient_email, recipient_name, subject, body, status,
        provider_message_id, failure_reason, metadata,
        sent_at, failed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        bookingId || null,
        glampingBookingId || null,
        recipientEmail,
        recipientName || null,
        subject,
        body,
        status,
        providerMessageId || null,
        errorMessage || null,
        metadata ? JSON.stringify(metadata) : null,
        status === 'sent' ? new Date() : null,
        status === 'failed' ? new Date() : null,
      ]
    );
  } catch (error) {
    console.error('Error logging email:', error);
  }
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmation({
  customerEmail,
  customerName,
  bookingReference,
  propertyName,
  checkInDate,
  checkOutDate,
  totalAmount,
  numberOfGuests,
  bookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  numberOfGuests: number;
  bookingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const confirmationUrl = `${appUrl}/booking/confirmation/${bookingId}`;

  return sendTemplateEmail({
    templateSlug: 'booking-confirmation',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingReference,
      campsite_name: propertyName,
      checkin_date: checkInDate,
      checkout_date: checkOutDate,
      total_amount: formatCurrency(totalAmount),
      number_of_guests: numberOfGuests,
      confirmation_url: confirmationUrl,
    },
    bookingId,
  });
}

/**
 * Send booking cancellation email
 */
export async function sendBookingCancellation({
  customerEmail,
  customerName,
  bookingReference,
  propertyName,
  cancellationReason,
  bookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  propertyName: string;
  cancellationReason?: string;
  bookingId?: string;
}) {
  return sendTemplateEmail({
    templateSlug: 'booking-cancellation',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingReference,
      property_name: propertyName,
      cancellation_reason: cancellationReason || 'Not specified',
    },
    bookingId,
  });
}

/**
 * Send pre-arrival reminder email
 */
export async function sendPreArrivalReminder({
  customerEmail,
  customerName,
  bookingReference,
  propertyName,
  checkInDate,
  checkInTime,
  propertyAddress,
  bookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  propertyName: string;
  checkInDate: string;
  checkInTime: string;
  propertyAddress: string;
  bookingId?: string;
}) {
  return sendTemplateEmail({
    templateSlug: 'pre-arrival-reminder',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingReference,
      property_name: propertyName,
      check_in_date: checkInDate,
      check_in_time: checkInTime,
      property_address: propertyAddress,
    },
    bookingId,
  });
}

/**
 * Send post-stay thank you email
 */
export async function sendPostStayThankYou({
  customerEmail,
  customerName,
  bookingReference,
  propertyName,
  bookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  propertyName: string;
  bookingId?: string;
}) {
  return sendTemplateEmail({
    templateSlug: 'post-stay-thank-you',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingReference,
      property_name: propertyName,
    },
    bookingId,
  });
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminder({
  customerEmail,
  customerName,
  bookingReference,
  propertyName,
  amountDue,
  dueDate,
  paymentUrl,
  bookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  propertyName: string;
  amountDue: number;
  dueDate: string;
  paymentUrl: string;
  bookingId?: string;
}) {
  return sendTemplateEmail({
    templateSlug: 'payment-reminder',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingReference,
      property_name: propertyName,
      amount_due: formatCurrency(amountDue),
      due_date: dueDate,
      payment_url: paymentUrl,
    },
    bookingId,
  });
}

/**
 * Send welcome email to newly registered customer
 */
export async function sendWelcomeEmail({
  customerEmail,
  customerName,
}: {
  customerEmail: string;
  customerName: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return sendTemplateEmail({
    templateSlug: 'welcome-email',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      customer_email: customerEmail,
      app_url: appUrl,
    },
  });
}

/**
 * Send password reset email to customer
 */
export async function sendPasswordResetEmail({
  customerEmail,
  customerName,
  resetToken,
}: {
  customerEmail: string;
  customerName: string;
  resetToken: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password/${resetToken}`;

  return sendTemplateEmail({
    templateSlug: 'password-reset',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      customer_email: customerEmail,
      reset_url: resetUrl,
    },
  });
}

/**
 * Send booking expired email (auto-cancelled due to payment timeout)
 */
export async function sendBookingExpiredEmail({
  customerEmail,
  customerName,
  bookingReference,
  propertyName,
  propertySlug,
  checkInDate,
  checkOutDate,
  bookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  propertyName: string;
  propertySlug?: string;
  checkInDate: string;
  checkOutDate: string;
  bookingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  // Link to campsite page if slug available, otherwise homepage
  const rebookUrl = propertySlug ? `${appUrl}/campsites/${propertySlug}` : appUrl;

  return sendTemplateEmail({
    templateSlug: 'booking-expired',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingReference,
      campsite_name: propertyName,
      checkin_date: checkInDate,
      checkout_date: checkOutDate,
      rebook_url: rebookUrl,
    },
    bookingId,
  });
}

// =============================================================================
// GLAMPING EMAIL FUNCTIONS
// =============================================================================

/**
 * Send glamping email using template from GLAMPING_EMAIL_TEMPLATES
 */
export async function sendGlampingTemplateEmail({
  templateSlug,
  to,
  variables = {},
  glampingBookingId,
}: {
  templateSlug: string;
  to: { email: string; name?: string }[];
  variables?: EmailVariables;
  glampingBookingId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Load template from glamping templates
    const template = GLAMPING_EMAIL_TEMPLATES[templateSlug];
    if (!template) {
      throw new Error(`Glamping email template not found: ${templateSlug}`);
    }

    // Check if template is active
    if (!template.isActive) {
      throw new Error(`Glamping email template is inactive: ${templateSlug}`);
    }

    // Send email with HTML and subject from glamping templates
    return await sendEmail({
      to,
      subject: template.subject,
      htmlContent: template.html,
      templateSlug,
      variables,
      glampingBookingId,
    });
  } catch (error: any) {
    console.error('❌ Error sending glamping template email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send glamping booking confirmation email to customer
 */
export async function sendGlampingBookingConfirmation({
  customerEmail,
  customerName,
  bookingCode,
  zoneName,
  itemName,
  checkInDate,
  checkOutDate,
  totalAmount,
  numberOfGuests,
  glampingBookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
  zoneName: string;
  itemName?: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  numberOfGuests: number;
  glampingBookingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const confirmationUrl = `${appUrl}/glamping/booking/confirmation/${bookingCode}`;

  return sendGlampingTemplateEmail({
    templateSlug: 'glamping-booking-confirmation',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingCode,
      zone_name: zoneName,
      item_name: itemName || '',
      checkin_date: checkInDate,
      checkout_date: checkOutDate,
      total_amount: formatCurrency(totalAmount),
      number_of_guests: numberOfGuests,
      confirmation_url: confirmationUrl,
    },
    glampingBookingId,
  });
}

/**
 * Send glamping admin notification email for new booking
 */
export async function sendGlampingAdminNewBookingEmail({
  adminEmail,
  adminName,
  bookingCode,
  guestName,
  guestEmail,
  guestPhone,
  zoneName,
  itemName,
  checkInDate,
  checkOutDate,
  numberOfGuests,
  totalAmount,
  paymentStatus,
  glampingBookingId,
}: {
  adminEmail: string;
  adminName: string;
  bookingCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  zoneName: string;
  itemName?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  paymentStatus: string;
  glampingBookingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const notificationLink = `${appUrl}/admin/zones/all/bookings`;

  return sendGlampingTemplateEmail({
    templateSlug: 'glamping-admin-new-booking-created',
    to: [{ email: adminEmail, name: adminName }],
    variables: {
      admin_name: adminName,
      booking_reference: bookingCode,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone || 'N/A',
      zone_name: zoneName,
      item_name: itemName || '',
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      number_of_guests: numberOfGuests,
      total_amount: formatCurrency(totalAmount),
      payment_status: paymentStatus,
      notification_link: notificationLink,
    },
    glampingBookingId,
  });
}

/**
 * Send glamping booking confirmation email (when admin confirms)
 */
export async function sendGlampingBookingConfirmedEmail({
  customerEmail,
  customerName,
  bookingCode,
  zoneName,
  checkInDate,
  checkOutDate,
  glampingBookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
  zoneName: string;
  checkInDate: string;
  checkOutDate: string;
  glampingBookingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const notificationLink = `${appUrl}/glamping/booking/confirmation/${bookingCode}`;

  return sendGlampingTemplateEmail({
    templateSlug: 'glamping-booking-confirmed',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingCode,
      zone_name: zoneName,
      checkin_date: checkInDate,
      checkout_date: checkOutDate,
      notification_link: notificationLink,
    },
    glampingBookingId,
  });
}

/**
 * Send glamping payment confirmation email
 */
export async function sendGlampingPaymentConfirmationEmail({
  customerEmail,
  customerName,
  bookingCode,
  amount,
  glampingBookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
  amount: number;
  glampingBookingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const notificationLink = `${appUrl}/glamping/booking/confirmation/${bookingCode}`;

  return sendGlampingTemplateEmail({
    templateSlug: 'glamping-payment-confirmation',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingCode,
      amount: formatCurrency(amount),
      notification_link: notificationLink,
    },
    glampingBookingId,
  });
}

/**
 * Send glamping booking expired email
 */
export async function sendGlampingBookingExpiredEmail({
  customerEmail,
  customerName,
  bookingCode,
  zoneName,
  checkInDate,
  checkOutDate,
  glampingBookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
  zoneName: string;
  checkInDate: string;
  checkOutDate: string;
  glampingBookingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const rebookUrl = `${appUrl}/glamping/search`;

  return sendGlampingTemplateEmail({
    templateSlug: 'glamping-booking-expired',
    to: [{ email: customerEmail, name: customerName }],
    variables: {
      customer_name: customerName,
      booking_reference: bookingCode,
      zone_name: zoneName,
      checkin_date: checkInDate,
      checkout_date: checkOutDate,
      rebook_url: rebookUrl,
    },
    glampingBookingId,
  });
}

/**
 * Send email to all admin/sale/operations staff for glamping booking
 * Note: Glamping system does NOT have owner role
 */
export async function sendGlampingBookingNotificationToStaff({
  bookingCode,
  guestName,
  guestEmail,
  guestPhone,
  zoneName,
  itemName,
  checkInDate,
  checkOutDate,
  numberOfGuests,
  totalAmount,
  paymentStatus,
  glampingBookingId,
}: {
  bookingCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  zoneName: string;
  itemName?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  paymentStatus: string;
  glampingBookingId: string;
}): Promise<void> {
  try {
    // Get all staff with roles: admin, sale, operations (NOT owner - glamping doesn't have owner role)
    const result = await query<{ email: string; first_name: string; last_name: string }>(
      `SELECT email, first_name, last_name
       FROM users
       WHERE role IN ('admin', 'sale', 'operations')
         AND email IS NOT NULL`,
      []
    );

    if (result.rows.length === 0) {
      console.log('No staff found to notify for glamping booking');
      return;
    }

    // Send email to each staff member
    for (const staff of result.rows) {
      try {
        await sendGlampingAdminNewBookingEmail({
          adminEmail: staff.email,
          adminName: `${staff.first_name} ${staff.last_name}`.trim() || 'Admin',
          bookingCode,
          guestName,
          guestEmail,
          guestPhone,
          zoneName,
          itemName,
          checkInDate,
          checkOutDate,
          numberOfGuests,
          totalAmount,
          paymentStatus,
          glampingBookingId,
        });
        console.log(`✅ Glamping booking notification sent to ${staff.email}`);
      } catch (emailError) {
        console.error(`⚠️ Failed to send glamping notification to ${staff.email}:`, emailError);
      }
    }

    console.log(`✅ Notified ${result.rows.length} staff member(s) of glamping booking ${bookingCode}`);
  } catch (error) {
    console.error('❌ Error sending glamping booking notifications to staff:', error);
  }
}

/**
 * Send menu update confirmation email to customer
 */
export async function sendGlampingMenuUpdateConfirmation({
  customerEmail,
  customerName,
  bookingCode,
  oldTotal,
  newTotal,
  priceDifference,
  glampingBookingId,
}: {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
  oldTotal: number;
  newTotal: number;
  priceDifference: number;
  glampingBookingId: string;
}) {
  const confirmationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/glamping/booking/confirmation/${bookingCode}`;

  // Build conditional sections
  let priceIncreasedSection = '';
  let paymentRequiredSection = '';

  if (priceDifference > 0) {
    priceIncreasedSection = `
      <tr>
        <td style="padding: 10px 0; color: #ea580c; font-size: 14px; font-weight: 600;">Tăng thêm:</td>
        <td style="padding: 10px 0; color: #ea580c; font-size: 14px; font-weight: 600; text-align: right;">+${formatCurrency(priceDifference)}</td>
      </tr>
    `;

    paymentRequiredSection = `
      <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #9a3412; font-size: 14px; line-height: 1.6;">
          <strong>Lưu ý:</strong> Tổng tiền đã tăng. Vui lòng thanh toán số tiền còn thiếu để hoàn tất đặt phòng.
        </p>
      </div>
    `;
  } else if (priceDifference < 0) {
    priceIncreasedSection = `
      <tr>
        <td style="padding: 10px 0; color: #16a34a; font-size: 14px; font-weight: 600;">Giảm:</td>
        <td style="padding: 10px 0; color: #16a34a; font-size: 14px; font-weight: 600; text-align: right;">-${formatCurrency(Math.abs(priceDifference))}</td>
      </tr>
    `;
  }

  const variables = {
    customer_name: customerName,
    booking_reference: bookingCode,
    old_total: formatCurrency(oldTotal),
    new_total: formatCurrency(newTotal),
    price_difference: formatCurrency(Math.abs(priceDifference)),
    price_increased: priceDifference > 0 ? 'true' : 'false',
    price_increased_section: priceIncreasedSection,
    payment_required_section: paymentRequiredSection,
    confirmation_url: confirmationUrl,
  };

  return sendGlampingTemplateEmail({
    to: [{ email: customerEmail, name: customerName }],
    templateSlug: 'glamping-menu-updated-customer',
    variables,
    glampingBookingId,
  });
}

/**
 * Send menu update notification email to all staff
 */
export async function sendGlampingMenuUpdateNotificationToStaff({
  bookingCode,
  customerName,
  oldTotal,
  newTotal,
  priceDifference,
  requiresPayment,
  glampingBookingId,
}: {
  bookingCode: string;
  customerName: string;
  oldTotal: number;
  newTotal: number;
  priceDifference: number;
  requiresPayment: boolean;
  glampingBookingId: string;
}): Promise<void> {
  try {
    // Get all staff with roles: admin, sale, operations
    const result = await query<{ email: string; first_name: string; last_name: string }>(
      `SELECT email, first_name, last_name
       FROM users
       WHERE role IN ('admin', 'sale', 'operations')
         AND email IS NOT NULL`,
      []
    );

    if (result.rows.length === 0) {
      console.log('No staff found to notify for menu update');
      return;
    }

    const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/zones/all/bookings`;

    // Build conditional sections
    let paymentRequiredSection = '';
    let priceColor = '#6b7280';
    let priceChangeText = 'Không thay đổi';

    if (priceDifference > 0) {
      priceColor = '#ea580c';
      priceChangeText = `+${formatCurrency(priceDifference)}`;

      if (requiresPayment) {
        paymentRequiredSection = `
          <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #9a3412; font-size: 14px; line-height: 1.6; font-weight: bold;">
              ⚠️ Cần thanh toán thêm ${formatCurrency(priceDifference)}
            </p>
          </div>
        `;
      }
    } else if (priceDifference < 0) {
      priceColor = '#16a34a';
      priceChangeText = `-${formatCurrency(Math.abs(priceDifference))}`;
    }

    const variables = {
      booking_reference: bookingCode,
      customer_name: customerName,
      old_total: formatCurrency(oldTotal),
      new_total: formatCurrency(newTotal),
      price_difference: formatCurrency(Math.abs(priceDifference)),
      price_increased: priceDifference > 0 ? 'true' : 'false',
      requires_payment: requiresPayment ? 'true' : 'false',
      price_color: priceColor,
      price_change_text: priceChangeText,
      payment_required_section: paymentRequiredSection,
      notification_link: adminUrl,
    };

    // Send email to each staff member
    for (const staff of result.rows) {
      try {
        await sendGlampingTemplateEmail({
          to: [{ email: staff.email, name: `${staff.first_name} ${staff.last_name}`.trim() }],
          templateSlug: 'glamping-menu-updated-staff',
          variables,
          glampingBookingId,
        });
        console.log(`✅ Menu update notification sent to ${staff.email}`);
      } catch (emailError) {
        console.error(`⚠️ Failed to send menu update notification to ${staff.email}:`, emailError);
      }
    }

    console.log(`✅ Notified ${result.rows.length} staff member(s) of menu update for ${bookingCode}`);
  } catch (error) {
    console.error('❌ Error sending menu update notifications to staff:', error);
  }
}
