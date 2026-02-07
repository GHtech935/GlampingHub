/**
 * HTML Email Templates for GlampingHub
 * Using inline styles for better email client compatibility
 *
 * IMPORTANT: This is a COPY of the camping email templates, modified for glamping.
 * Keep these separate for future customization.
 */

import {
  glampingMenuUpdatedCustomerHTML,
  glampingMenuUpdatedStaffHTML,
} from './glamping-menu-email-templates';
import {
  glampingCommonItemsUpdatedCustomerHTML,
  glampingCommonItemsUpdatedStaffHTML,
} from './glamping-common-items-email-templates';

const emailStyles = {
  container: 'max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9fafb;',
  header: 'background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); padding: 20px 15px; text-align: center;',
  headerTitle: 'color: white; font-size: 24px; margin: 0; font-weight: bold;',
  content: 'background-color: white; padding: 20px 15px; border-radius: 8px; margin: 20px;',
  greeting: 'font-size: 18px; color: #1f2937; margin-bottom: 20px;',
  section: 'background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;',
  sectionTitle: 'font-size: 16px; font-weight: bold; color: #7c3aed; margin-bottom: 15px;',
  infoRow: 'display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;',
  label: 'color: #6b7280; font-size: 14px;',
  value: 'color: #1f2937; font-size: 14px; font-weight: 500;',
  button: 'display: inline-block; background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;',
  footer: 'text-align: center; padding: 20px; color: #6b7280; font-size: 12px;',
  divider: 'border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;',
};

/**
 * Generate HTML for dinner section in booking confirmation email
 * Returns empty string if showDinnerButton is false
 */
export function generateDinnerSectionHTML(showDinnerButton: boolean, confirmationUrl: string): string {
  if (!showDinnerButton) {
    return '';
  }

  return `
    <!-- View Booking Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${confirmationUrl}" style="${emailStyles.button}">
        Bấm để chọn đồ ăn tối
      </a>
    </div>

    <!-- Menu Editing Notice -->
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #065f46; font-size: 15px; font-weight: bold;">
        💡 Chọn món ăn/đồ uống cho chuyến đi
      </p>
      <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6;">
        Sau khi <strong>đặt cọc hoặc thanh toán đầy đủ</strong>, bạn có thể chọn và chỉnh sửa món ăn, đồ uống cho đến <strong>24 giờ trước khi check-in</strong>.
      </p>
    </div>
  `;
}

export const glampingBookingConfirmationHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận đặt phòng</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="${emailStyles.header}">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Xác nhận đặt phòng thành công</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Cảm ơn bạn đã đặt phòng tại GlampingHub! Chúng tôi rất vui được đón tiếp bạn.
      </p>

      <!-- Booking Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin đặt phòng</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt phòng:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
        </table>
      </div>

      <!-- Tents Section -->
      {tents_section}

      <!-- Payment Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Chi phí</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; font-size: 16px; color: #1f2937; font-weight: bold;">Tổng tiền:</td>
            <td style="padding: 12px 0; font-size: 18px; color: #7c3aed; font-weight: bold; text-align: right;">{total_amount}</td>
          </tr>
        </table>
      </div>

      <hr style="${emailStyles.divider}">

      {dinner_section}

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Chúng tôi rất mong được đón tiếp bạn! Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.
      </p>

      <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin-top: 10px;">
        Bạn cũng có thể xem lại thông tin đặt phòng bất cứ lúc nào bằng cách truy cập link:<br>
        <a href="{confirmation_url}" style="color: #7c3aed;">{confirmation_url}</a>
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
`;

export const glampingBookingCancellationHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận hủy đặt phòng</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Xác nhận hủy đặt phòng</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúng tôi xin xác nhận đã hủy đặt phòng của bạn theo yêu cầu.
      </p>

      <!-- Cancellation Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin đặt phòng đã hủy</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt phòng:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Lý do hủy:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{cancellation_reason}</td>
          </tr>
        </table>
      </div>

      <hr style="${emailStyles.divider}">

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Chúng tôi rất tiếc vì không thể phục vụ bạn lần này. Hy vọng sẽ được gặp lại bạn trong tương lai!
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const glampingPreArrivalReminderHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc nhở trước khi đến</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Chuyến đi của bạn sắp bắt đầu!</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúng tôi rất mong được đón tiếp bạn! Đây là thông tin quan trọng cho chuyến đi của bạn.
      </p>

      <!-- Check-in Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin check-in</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt phòng:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Ngày check-in:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{check_in_date}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Giờ check-in:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{check_in_time}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Địa chỉ:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_address}</td>
          </tr>
        </table>
      </div>

      <!-- Checklist -->
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Checklist trước khi đến:</h3>
        <ul style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Mang theo giấy tờ tùy thân</li>
          <li>Chuẩn bị đầy đủ đồ dùng cá nhân</li>
          <li>Đến đúng giờ check-in</li>
          <li>Liên hệ trước nếu có thay đổi</li>
        </ul>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Chúng tôi rất mong được gặp bạn!
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const glampingPostStayThankYouHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cảm ơn bạn</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Cảm ơn bạn đã lựa chọn chúng tôi!</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Cảm ơn bạn đã tin tưởng và lựa chọn GlampingHub cho chuyến đi của mình!
      </p>

      <div style="${emailStyles.section}">
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
          Chúng tôi hy vọng bạn đã có những trải nghiệm tuyệt vời tại <strong>{property_name}</strong>.
        </p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 15px 0 0 0;">
          Mã đặt phòng của bạn: <strong>{booking_code}</strong>
        </p>
      </div>

      <div style="background-color: #f3e8ff; padding: 20px; border-radius: 6px; text-align: center; margin: 25px 0;">
        <p style="color: #6b21a8; font-size: 16px; margin: 0 0 10px 0;">Chia sẻ trải nghiệm của bạn</p>
        <p style="color: #7c3aed; font-size: 14px; margin: 0;">
          Phản hồi của bạn giúp chúng tôi cải thiện dịch vụ tốt hơn!
        </p>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Hẹn gặp lại bạn trong những chuyến đi tiếp theo!
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const glampingPaymentReminderHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc nhở thanh toán</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Nhắc nhở thanh toán</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Đây là lời nhắc thanh toán cho đặt phòng của bạn tại GlampingHub.
      </p>

      <!-- Payment Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin thanh toán</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt phòng:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Hạn thanh toán:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{due_date}</td>
          </tr>
          <tr style="border-top: 2px solid #0891b2;">
            <td style="padding: 15px 0; font-size: 16px; color: #1f2937; font-weight: bold;">Số tiền cần thanh toán:</td>
            <td style="padding: 15px 0; font-size: 18px; color: #0891b2; font-weight: bold; text-align: right;">{amount_due}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{payment_url}" style="${emailStyles.button}">
          Thanh toán ngay
        </a>
      </div>

      <div style="background-color: #ecfeff; padding: 15px; border-radius: 6px; border-left: 4px solid #0891b2;">
        <p style="color: #155e75; font-size: 13px; margin: 0; line-height: 1.6;">
          Vui lòng thanh toán đúng hạn để giữ chỗ. Nếu bạn đã thanh toán, xin vui lòng bỏ qua email này.
        </p>
      </div>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const glampingWelcomeEmailHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chào mừng đến với GlampingHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="${emailStyles.header}">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Chào mừng bạn đến với trải nghiệm glamping cao cấp!</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúc mừng bạn đã đăng ký thành công tài khoản tại <strong>GlampingHub</strong>!
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúng tôi rất vui được chào đón bạn tham gia vào cộng đồng những người yêu thích trải nghiệm glamping sang trọng và khám phá thiên nhiên.
      </p>

      <!-- Welcome Benefits -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Những gì bạn có thể làm với GlampingHub</h2>

        <div style="margin: 15px 0;">
          <div style="display: flex; align-items: start; margin-bottom: 15px;">
            <span style="color: #7c3aed; font-size: 20px; margin-right: 10px;">1.</span>
            <div>
              <strong style="color: #1f2937; display: block; margin-bottom: 5px;">Khám phá các khu glamping</strong>
              <span style="color: #6b7280; font-size: 14px;">Tìm kiếm và đặt chỗ tại các khu glamping sang trọng nhất Việt Nam</span>
            </div>
          </div>

          <div style="display: flex; align-items: start; margin-bottom: 15px;">
            <span style="color: #7c3aed; font-size: 20px; margin-right: 10px;">2.</span>
            <div>
              <strong style="color: #1f2937; display: block; margin-bottom: 5px;">Đặt chỗ dễ dàng</strong>
              <span style="color: #6b7280; font-size: 14px;">Quản lý booking và thanh toán trực tuyến tiện lợi</span>
            </div>
          </div>

          <div style="display: flex; align-items: start; margin-bottom: 15px;">
            <span style="color: #7c3aed; font-size: 20px; margin-right: 10px;">3.</span>
            <div>
              <strong style="color: #1f2937; display: block; margin-bottom: 5px;">Chia sẻ trải nghiệm</strong>
              <span style="color: #6b7280; font-size: 14px;">Đánh giá và review các điểm glamping bạn đã ghé thăm</span>
            </div>
          </div>

          <div style="display: flex; align-items: start;">
            <span style="color: #7c3aed; font-size: 20px; margin-right: 10px;">4.</span>
            <div>
              <strong style="color: #1f2937; display: block; margin-bottom: 5px;">Ưu đãi độc quyền</strong>
              <span style="color: #6b7280; font-size: 14px;">Nhận thông báo về các chương trình khuyến mãi đặc biệt</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Start -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Bắt đầu ngay hôm nay</h2>

        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
          Sẵn sàng cho chuyến phiêu lưu glamping tiếp theo của bạn chưa?
        </p>

        <div style="text-align: center;">
          <a href="{app_url}" style="${emailStyles.button}">
            Khám phá ngay
          </a>
        </div>
      </div>

      <hr style="${emailStyles.divider}">

      <!-- Account Info -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Email đăng nhập:</strong> {customer_email}<br>
          Hãy giữ thông tin này an toàn và không chia sẻ mật khẩu với bất kỳ ai.
        </p>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi. Chúng tôi luôn sẵn sàng giúp đỡ bạn!
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Chúc bạn có những trải nghiệm glamping tuyệt vời!<br><br>
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
`;

export const glampingPasswordResetHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Yêu cầu đặt lại mật khẩu</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>GlampingHub</strong>.
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Nếu bạn đã gửi yêu cầu này, hãy nhấn vào nút bên dưới để đặt lại mật khẩu của bạn:
      </p>

      <!-- Reset Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_url}" style="${emailStyles.button}">
          Đặt lại mật khẩu
        </a>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Lưu ý bảo mật:</strong>
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px; line-height: 1.8;">
          <li>Link đặt lại mật khẩu có hiệu lực trong <strong>1 giờ</strong></li>
          <li>Link này chỉ sử dụng được <strong>một lần duy nhất</strong></li>
          <li>Không chia sẻ link này với bất kỳ ai</li>
        </ul>
      </div>

      <hr style="${emailStyles.divider}">

      <!-- Not Requested Notice -->
      <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 13px; line-height: 1.6;">
          <strong>Nếu bạn KHÔNG yêu cầu đặt lại mật khẩu:</strong><br>
          Vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn và không có thay đổi nào được thực hiện.
        </p>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Nếu nút bên trên không hoạt động, bạn có thể sao chép và dán link sau vào trình duyệt:
      </p>

      <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #6b7280; font-family: monospace;">
        {reset_url}
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
`;

// Admin/Staff Email: New Booking Created
export const glampingAdminNewBookingCreatedHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông báo: Đơn đặt chỗ mới</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub Admin</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Đơn đặt chỗ mới</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{admin_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Một khách hàng vừa tạo đơn đặt chỗ mới trên hệ thống.
      </p>

      <!-- Booking Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin đơn đặt chỗ</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt chỗ:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khách hàng:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{guest_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Email:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{guest_email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Số điện thoại:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{guest_phone}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Lều:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{item_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Check-in:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{check_in_date}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Check-out:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{check_out_date}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Số khách:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{number_of_guests} người</td>
          </tr>
        </table>
      </div>

      <!-- Payment Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin thanh toán</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">Tổng tiền:</td>
            <td style="padding: 12px 0; color: #7c3aed; font-size: 18px; font-weight: bold; text-align: right;">{total_amount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">Trạng thái:</td>
            <td style="padding: 12px 0; color: #f59e0b; font-size: 15px; font-weight: bold; text-align: right;">{payment_status}</td>
          </tr>
        </table>
      </div>

      <hr style="${emailStyles.divider}">

      <!-- View Booking Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{notification_link}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Xem chi tiết đơn
        </a>
      </div>

      <p style="color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
        Đây là email tự động từ hệ thống GlampingHub.
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Email sent when admin confirms a booking (customer receives this)
export const glampingBookingConfirmedHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt chỗ đã được xác nhận</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="${emailStyles.header}">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Đặt chỗ của bạn đã được xác nhận!</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">
          Tin tuyệt vời! Đặt chỗ của bạn đã được xác nhận!
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúng tôi rất vui thông báo đặt chỗ của bạn tại <strong>{zone_name}</strong> đã được xác nhận thành công.
      </p>

      <!-- Booking Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin đặt chỗ</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt chỗ:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Ngày check-in:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{checkin_date}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Ngày check-out:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{checkout_date}</td>
          </tr>
        </table>
      </div>

      <!-- View Booking Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{notification_link}" style="${emailStyles.button}">
          Xem chi tiết đặt chỗ
        </a>
      </div>

      <hr style="${emailStyles.divider}">

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Chúng tôi rất mong được đón tiếp bạn! Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
`;

// Admin/Staff Email: Payment Received - Booking Auto-Confirmed
export const glampingAdminNewBookingPendingHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông báo: Đã nhận thanh toán - Đơn đã tự động xác nhận</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub Admin</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Đã nhận thanh toán - Đơn đã tự động xác nhận</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{admin_name}</strong>,</p>

      <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">
          Đơn #{booking_reference} đã thanh toán và được tự động xác nhận!
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Khách hàng đã hoàn tất thanh toán qua chuyển khoản ngân hàng. Đơn đặt chỗ đã được tự động xác nhận.
      </p>

      <!-- Payment Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin thanh toán</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt chỗ:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Số tiền đã nhận:</td>
            <td style="padding: 10px 0; color: #7c3aed; font-size: 16px; font-weight: bold; text-align: right;">{amount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khách hàng:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{guest_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Lều:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{item_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Ngày:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{check_in_date} → {check_out_date}</td>
          </tr>
        </table>
      </div>

      <hr style="${emailStyles.divider}">

      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{notification_link}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Xem chi tiết đơn
        </a>
      </div>

      <p style="color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
        Đây là email tự động từ hệ thống GlampingHub.
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Admin Email: Booking Cancelled
export const glampingAdminBookingCancelledHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông báo: Đơn đã bị hủy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub Admin</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Đơn đặt chỗ đã bị hủy</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{admin_name}</strong>,</p>

      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 16px; font-weight: bold;">
          Đơn #{booking_reference} đã bị hủy
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Đơn đặt chỗ sau đây đã bị hủy bởi admin. Vui lòng xem chi tiết bên dưới.
      </p>

      <!-- Booking Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin đơn đã hủy</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt chỗ:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Tổng tiền:</td>
            <td style="padding: 10px 0; color: #dc2626; font-size: 16px; font-weight: bold; text-align: right;">{amount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khách hàng:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{guest_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Email:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{guest_email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Lều:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{item_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Ngày:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{check_in_date} → {check_out_date}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Lý do hủy:</td>
            <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 500; text-align: right;">{cancellation_reason}</td>
          </tr>
        </table>
      </div>

      <hr style="${emailStyles.divider}">

      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{notification_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Xem chi tiết đơn
        </a>
      </div>

      <p style="color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
        Đây là email tự động từ hệ thống GlampingHub.
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Customer Email: Payment Confirmation
export const glampingPaymentConfirmationHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận thanh toán</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="${emailStyles.header}">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Xác nhận thanh toán thành công</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">
          Chúng tôi đã nhận được thanh toán của bạn!
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Cảm ơn bạn đã thanh toán cho đơn đặt chỗ tại GlampingHub. Đơn của bạn đang được xem xét và sẽ sớm được xác nhận.
      </p>

      <!-- Payment Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin thanh toán</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt chỗ:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 16px; color: #1f2937; font-weight: bold;">Số tiền đã nhận:</td>
            <td style="padding: 12px 0; font-size: 18px; color: #7c3aed; font-weight: bold; text-align: right;">{amount}</td>
          </tr>
        </table>
      </div>

      <!-- Confirmed Status -->
      <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
          <strong>Đơn của bạn đã được xác nhận thành công!</strong><br>
          Chúng tôi sẽ liên hệ với bạn nếu có bất kỳ thắc mắc nào.
        </p>
      </div>

      <!-- View Booking Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{notification_link}" style="${emailStyles.button}">
          Xem chi tiết đặt chỗ
        </a>
      </div>

      <hr style="${emailStyles.divider}">

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
`;

// Customer Email: Late Payment
export const glampingLatePaymentCustomerHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thanh toán muộn</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thông báo thanh toán</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: bold;">
          Chúng tôi đã nhận được thanh toán của bạn
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúng tôi ghi nhận đã nhận được khoản thanh toán <strong>{amount}</strong> cho đơn đặt chỗ <strong>#{booking_reference}</strong>.
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Tuy nhiên, đơn đặt chỗ này <strong>đã hết hạn</strong> do quá thời gian thanh toán quy định.
      </p>

      <!-- What Happens Next -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Bước tiếp theo</h2>

        <p style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0;">
          Đội ngũ hỗ trợ của chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để:
        </p>
        <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
          <li>Kiểm tra tình trạng phòng trống cho ngày bạn muốn đặt</li>
          <li>Hỗ trợ đặt lại nếu còn phòng</li>
          <li>Hoặc xử lý hoàn tiền nếu không còn phòng</li>
        </ul>
      </div>

      <!-- Contact Info -->
      <div style="background-color: #ecfeff; border-left: 4px solid #0891b2; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #155e75; font-size: 14px; line-height: 1.6;">
          <strong>Liên hệ hỗ trợ:</strong><br>
          Nếu cần hỗ trợ gấp, vui lòng liên hệ hotline hoặc email của chúng tôi.
        </p>
      </div>

      <hr style="${emailStyles.divider}">

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Xin lỗi vì sự bất tiện này. Chúng tôi sẽ cố gắng hỗ trợ bạn tốt nhất có thể.
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
`;

// Customer Email: Booking Expired
export const glampingBookingExpiredHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đơn đặt chỗ đã bị hủy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thông báo hủy đơn đặt chỗ</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: bold;">
          Đơn đặt chỗ của bạn đã bị hủy do hết thời gian chuyển khoản
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Rất tiếc, đơn đặt chỗ <strong>#{booking_reference}</strong> của bạn đã bị hủy tự động do chúng tôi không nhận được thanh toán trong thời gian quy định.
      </p>

      <!-- Booking Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin đơn đặt chỗ đã hủy</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt chỗ:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Khu vực:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{zone_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Ngày check-in:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{checkin_date}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Ngày check-out:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{checkout_date}</td>
          </tr>
        </table>
      </div>

      <hr style="${emailStyles.divider}">

      <!-- Rebook Section -->
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; color: #065f46; font-size: 15px; font-weight: bold;">
          Bạn vẫn muốn đặt chỗ?
        </p>
        <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6;">
          Nếu bạn vẫn có nhu cầu, hãy đặt lại ngay để không bỏ lỡ cơ hội trải nghiệm tuyệt vời!
        </p>
      </div>

      <!-- Rebook Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{rebook_url}" style="${emailStyles.button}">
          Đặt lại ngay
        </a>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
        Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi.
      </p>

      <p style="color: #1f2937; font-size: 14px; margin-top: 30px;">
        Trân trọng,<br>
        <strong>Đội ngũ GlampingHub</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
`;

// Admin Email: Late Payment Alert
export const glampingAdminLatePaymentHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Late Payment - Cần xử lý</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px 20px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub Admin</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Late Payment - Cần xử lý</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào Admin,</p>

      <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 16px; font-weight: bold;">
          Nhận được thanh toán muộn cho đơn đã hết hạn!
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Hệ thống đã ghi nhận một khoản thanh toán cho đơn đặt chỗ <strong>đã bị hủy do quá thời gian thanh toán</strong>.
        Cần xử lý hoàn tiền hoặc restore booking.
      </p>

      <!-- Payment Info -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thông tin giao dịch</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã đặt chỗ:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Số tiền nhận:</td>
            <td style="padding: 10px 0; color: #dc2626; font-size: 16px; font-weight: bold; text-align: right;">{amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Trạng thái booking:</td>
            <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 500; text-align: right;">Đã hết hạn / Đã hủy</td>
          </tr>
        </table>
      </div>

      <!-- Action Required -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Hành động cần thiết</h2>

        <ol style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Kiểm tra tình trạng phòng trống cho ngày khách muốn đặt</li>
          <li>Nếu còn phòng: Restore booking và xác nhận với khách</li>
          <li>Nếu hết phòng: Xử lý hoàn tiền cho khách</li>
          <li>Liên hệ khách để thông báo kết quả</li>
        </ol>
      </div>

      <hr style="${emailStyles.divider}">

      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{notification_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Xem chi tiết và xử lý
        </a>
      </div>

      <p style="color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
        Đây là email tự động từ hệ thống GlampingHub.
      </p>
    </div>

    <!-- Footer -->
    <div style="${emailStyles.footer}">
      <p>© 2025 GlampingHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Menu Selection Reminder - Day 3 (3 days before check-in)
export const glampingMenuSelectionReminderDay3HTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc nhở chọn món ăn - {booking_code}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🍽️ Còn 3 ngày - Đừng quên chọn món ăn!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Xin chào <strong>{customer_name}</strong>,
              </p>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Chuyến glamping của bạn chỉ còn <strong>3 ngày nữa</strong>! Chúng tôi nhận thấy bạn chưa chọn món ăn cho chuyến đi.
              </p>

              <!-- Booking Info Box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Mã đặt phòng</p>
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">{booking_code}</p>

                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Địa điểm</p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">{property_name}</p>

                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Check-in</p>
                <p style="margin: 0; font-size: 16px; color: #333;">{check_in_date} lúc {check_in_time}</p>
              </div>

              <!-- Info Box -->
              <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #0369a1; font-size: 15px; line-height: 1.6;">
                  💡 <strong>Mẹo:</strong> Chọn món ăn sớm để chúng tôi chuẩn bị nguyên liệu tươi ngon nhất cho bạn!
                </p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 20px 0;">
                Hãy chọn món ăn yêu thích của bạn ngay để đảm bảo chúng tôi chuẩn bị đầy đủ cho chuyến đi của bạn!
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{management_url}"
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                  Chọn món ăn ngay
                </a>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 20px 0 0 0;">
                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Cảm ơn bạn đã chọn dịch vụ glamping của chúng tôi! 🌟
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Menu Selection Reminder - Day 2 (2 days before check-in)
export const glampingMenuSelectionReminderDay2HTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc nhở chọn món ăn - {booking_code}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🍽️ Còn 2 ngày - Chọn món ăn ngay!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Xin chào <strong>{customer_name}</strong>,
              </p>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Chuyến glamping của bạn chỉ còn <strong>2 ngày nữa</strong>! Bạn vẫn chưa chọn món ăn cho chuyến đi.
              </p>

              <!-- Booking Info Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">Mã đặt phòng</p>
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">{booking_code}</p>

                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">Địa điểm</p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">{property_name}</p>

                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">Check-in</p>
                <p style="margin: 0; font-size: 16px; color: #333;">{check_in_date} lúc {check_in_time}</p>
              </div>

              <!-- Warning Box -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.6;">
                  ⏰ <strong>Lưu ý:</strong> Bạn chỉ có thể chỉnh sửa món ăn đến <strong>24 giờ trước khi check-in</strong>. Hãy chọn món ngay hôm nay!
                </p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 20px 0;">
                Hãy chọn món ăn yêu thích của bạn ngay để đảm bảo chúng tôi chuẩn bị đầy đủ cho chuyến đi của bạn!
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{management_url}"
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.4);">
                  Chọn món ăn ngay
                </a>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 20px 0 0 0;">
                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Cảm ơn bạn đã chọn dịch vụ glamping của chúng tôi! 🌟
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Menu Selection Reminder - Day 1 (1 day before check-in - URGENT)
export const glampingMenuSelectionReminderDay1HTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⚠️ KHẨN CẤP: Chọn món ăn NGAY - {booking_code}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ KHẨN CẤP: Chọn món ăn NGAY!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Xin chào <strong>{customer_name}</strong>,
              </p>

              <!-- Urgent Alert -->
              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #991b1b; font-size: 18px; font-weight: bold; line-height: 1.6;">
                  🚨 Chuyến glamping của bạn là <strong>NGÀY MAI</strong>!<br>
                  Bạn chưa chọn món ăn và sắp hết thời hạn!
                </p>
              </div>

              <!-- Booking Info Box -->
              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">Mã đặt phòng</p>
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">{booking_code}</p>

                <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">Địa điểm</p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">{property_name}</p>

                <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">Check-in</p>
                <p style="margin: 0; font-size: 16px; color: #333;">{check_in_date} lúc {check_in_time}</p>
              </div>

              <!-- Critical Warning -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
                  ⏰ <strong>QUAN TRỌNG:</strong> Sau <strong>hôm nay</strong>, bạn sẽ không thể chọn hoặc thay đổi món ăn được nữa!
                </p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 20px 0;">
                Nếu bạn không chọn món, chúng tôi sẽ không thể chuẩn bị đồ ăn cho bạn. Hãy chọn ngay!
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{management_url}"
                   style="display: inline-block; padding: 18px 50px; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.4);">
                  🍽️ CHỌN MÓN ĂN NGAY
                </a>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 20px 0 0 0;">
                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi ngay.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Cảm ơn bạn đã chọn dịch vụ glamping của chúng tôi! 🌟
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Trip Reminder - 24h before check-in (for customers who HAVE selected menu)
export const glampingTripReminderHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🏕️ Chuyến đi của bạn là NGÀY MAI! - {booking_code}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🏕️ Chuyến đi của bạn là NGÀY MAI!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Xin chào <strong>{customer_name}</strong>,
              </p>

              <!-- Excitement Box -->
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: bold; line-height: 1.6;">
                  🎉 Chỉ còn 24 giờ nữa thôi! Chuyến glamping tuyệt vời đang chờ đón bạn!
                </p>
              </div>

              <!-- Booking Info Box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Mã đặt phòng</p>
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">{booking_code}</p>

                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Địa điểm</p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">{property_name}</p>

                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Check-in</p>
                <p style="margin: 0; font-size: 16px; color: #333;">{check_in_date} lúc {check_in_time}</p>
              </div>

              <!-- Menu Ready Notice -->
              <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.6;">
                  ✅ <strong>Món ăn đã được chọn!</strong> Chúng tôi đang chuẩn bị nguyên liệu tươi ngon nhất cho bạn.
                </p>
              </div>

              <!-- Checklist -->
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">📋 Checklist trước khi đi:</h3>
                <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>Mang theo giấy tờ tùy thân</li>
                  <li>Chuẩn bị quần áo thoải mái</li>
                  <li>Mang theo kem chống nắng và thuốc chống muỗi</li>
                  <li>Đèn pin hoặc đèn đầu (nếu có)</li>
                  <li>Đến đúng giờ check-in: <strong>{check_in_time}</strong></li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{management_url}"
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.4);">
                  Xem chi tiết đặt phòng
                </a>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 20px 0;">
                Chúng tôi rất háo hức được đón tiếp bạn! Chúc bạn có một chuyến đi tuyệt vời! 🌟
              </p>

              <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 20px 0 0 0;">
                Nếu bạn cần hỗ trợ gì, vui lòng liên hệ với chúng tôi ngay.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Cảm ơn bạn đã chọn dịch vụ glamping của chúng tôi! 🏕️
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Keep the old template for backward compatibility
export const glampingMenuSelectionReminderHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc nhở chọn món ăn - {booking_code}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🍽️ Đừng quên chọn món ăn nhé!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Xin chào <strong>{customer_name}</strong>,
              </p>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Chúng tôi nhận thấy bạn chưa chọn món ăn cho chuyến đi glamping sắp tới của mình.
              </p>

              <!-- Booking Info Box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Mã đặt phòng</p>
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">{booking_code}</p>

                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Địa điểm</p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">{property_name}</p>

                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Check-in</p>
                <p style="margin: 0; font-size: 16px; color: #333;">{check_in_date} lúc {check_in_time}</p>
              </div>

              <!-- Warning Box -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.6;">
                  ⚠️ <strong>Lưu ý quan trọng:</strong> Bạn chỉ có thể chỉnh sửa món ăn đến <strong>24 giờ trước khi check-in</strong>.
                  Sau thời gian này, hệ thống sẽ không cho phép thay đổi.
                </p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 20px 0;">
                Hãy chọn món ăn yêu thích của bạn ngay để đảm bảo chúng tôi chuẩn bị đầy đủ cho chuyến đi của bạn!
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{management_url}"
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                  Chọn món ăn ngay
                </a>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 20px 0 0 0;">
                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Cảm ơn bạn đã chọn dịch vụ glamping của chúng tôi! 🌟
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Admin Email: Failed Email Notification
export const glampingAdminEmailFailedHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email gửi thất bại - {booking_reference}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Email Gửi Thất Bại</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Xin chào <strong>{admin_name}</strong>,
              </p>

              <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
                Hệ thống không thể gửi email cho một booking. Vui lòng kiểm tra và xử lý.
              </p>

              <!-- Error Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: bold;">Chi tiết lỗi:</p>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6; word-break: break-word;">
                  {error_message}
                </p>
              </div>

              <!-- Booking Info Box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #6b7280; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Thông tin chi tiết:</h3>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Mã booking:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{booking_reference}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Template email:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{template_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Email người nhận:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{recipient_email}</td>
                  </tr>
                </table>
              </div>

              <!-- Action Required Notice -->
              <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #9a3412; font-size: 15px; line-height: 1.6;">
                  <strong>Hành động cần thực hiện:</strong> Vui lòng kiểm tra cấu hình email và thử gửi lại email thủ công từ trang quản lý booking.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{notification_link}"
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.4);">
                  Đi đến trang quản lý Booking
                </a>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 20px 0 0 0;">
                Nếu lỗi tiếp tục xảy ra, vui lòng kiểm tra:
              </p>
              <ul style="font-size: 14px; line-height: 1.8; color: #666; margin: 10px 0 0 0; padding-left: 20px;">
                <li>Cấu hình BREVO_API_KEY trong biến môi trường</li>
                <li>Hạn mức gửi email của tài khoản Brevo</li>
                <li>Địa chỉ email người nhận có hợp lệ không</li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                GlampingHub Admin System
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                Email này được gửi tự động từ hệ thống giám sát.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export interface GlampingEmailTemplateDefinition {
  slug: string;
  name: string;
  subject: string;
  html: string;
  type: string;
  description: string;
  availableVariables: string[];
  isActive: boolean;
}

export const GLAMPING_EMAIL_TEMPLATES: Record<string, GlampingEmailTemplateDefinition> = {
  'glamping-booking-confirmation': {
    slug: 'glamping-booking-confirmation',
    name: 'Xác nhận đặt chỗ',
    subject: 'Xác nhận đặt chỗ #{booking_reference} - GlampingHub',
    html: glampingBookingConfirmationHTML,
    type: 'booking_confirmation',
    description: 'Email gửi cho khách sau khi đặt chỗ thành công',
    availableVariables: ['customer_name', 'booking_reference', 'zone_name', 'item_name', 'checkin_date', 'checkout_date', 'number_of_guests', 'total_amount', 'confirmation_url'],
    isActive: true,
  },
  'glamping-booking-cancellation': {
    slug: 'glamping-booking-cancellation',
    name: 'Xác nhận hủy đặt chỗ',
    subject: 'Xác nhận hủy đặt chỗ #{booking_reference} - GlampingHub',
    html: glampingBookingCancellationHTML,
    type: 'cancellation',
    description: 'Email xác nhận hủy đặt chỗ gửi cho khách',
    availableVariables: ['customer_name', 'booking_reference', 'zone_name', 'cancellation_reason'],
    isActive: true,
  },
  'glamping-booking-confirmed': {
    slug: 'glamping-booking-confirmed',
    name: 'Đặt chỗ đã được xác nhận',
    subject: 'Đặt chỗ #{booking_reference} đã được xác nhận - GlampingHub',
    html: glampingBookingConfirmedHTML,
    type: 'booking_confirmation',
    description: 'Email gửi cho khách khi admin xác nhận đặt chỗ',
    availableVariables: ['customer_name', 'booking_reference', 'zone_name', 'checkin_date', 'checkout_date', 'notification_link'],
    isActive: true,
  },
  'glamping-payment-reminder': {
    slug: 'glamping-payment-reminder',
    name: 'Nhắc nhở thanh toán',
    subject: 'Nhắc nhở thanh toán - #{booking_reference} - GlampingHub',
    html: glampingPaymentReminderHTML,
    type: 'payment_reminder',
    description: 'Email nhắc nhở thanh toán số tiền còn lại',
    availableVariables: ['customer_name', 'booking_reference', 'zone_name', 'amount_due', 'due_date', 'payment_url'],
    isActive: true,
  },
  'glamping-welcome-email': {
    slug: 'glamping-welcome-email',
    name: 'Chào mừng thành viên mới',
    subject: 'Chào mừng bạn đến với GlampingHub!',
    html: glampingWelcomeEmailHTML,
    type: 'welcome',
    description: 'Email chào mừng gửi khi khách đăng ký tài khoản mới',
    availableVariables: ['customer_name', 'customer_email', 'app_url'],
    isActive: true,
  },
  'glamping-password-reset': {
    slug: 'glamping-password-reset',
    name: 'Đặt lại mật khẩu',
    subject: 'Yêu cầu đặt lại mật khẩu - GlampingHub',
    html: glampingPasswordResetHTML,
    type: 'security',
    description: 'Email gửi khi khách yêu cầu đặt lại mật khẩu',
    availableVariables: ['customer_name', 'customer_email', 'reset_url'],
    isActive: true,
  },
  'admin-password-reset': {
    slug: 'admin-password-reset',
    name: 'Đặt lại mật khẩu (Admin/Staff)',
    subject: 'Yêu cầu đặt lại mật khẩu - GlampingHub Admin',
    html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu Admin</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Admin Portal - Đặt lại mật khẩu</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px 25px;">
      <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">Xin chào <strong>{user_name}</strong>,</p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản admin/staff của bạn tại <strong>GlampingHub</strong>.
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Nếu bạn đã gửi yêu cầu này, hãy nhấn vào nút bên dưới để đặt lại mật khẩu của bạn:
      </p>

      <!-- Reset Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_url}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(30, 58, 95, 0.3);">
          Đặt lại mật khẩu
        </a>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Lưu ý bảo mật:</strong>
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px; line-height: 1.8;">
          <li>Link đặt lại mật khẩu có hiệu lực trong <strong>1 giờ</strong></li>
          <li>Link này chỉ sử dụng được <strong>một lần duy nhất</strong></li>
          <li>Không chia sẻ link này với bất kỳ ai</li>
        </ul>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

      <!-- Not Requested Notice -->
      <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
          <strong>Không phải bạn yêu cầu?</strong><br>
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ admin hệ thống ngay lập tức.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        © 2024 GlampingHub. All rights reserved.<br>
        Email này được gửi tự động, vui lòng không trả lời.
      </p>
    </div>
  </div>
</body>
</html>
    `,
    type: 'security',
    description: 'Email gửi khi admin/staff yêu cầu đặt lại mật khẩu',
    availableVariables: ['user_name', 'user_email', 'reset_url'],
    isActive: true,
  },
  'glamping-admin-new-booking-created': {
    slug: 'glamping-admin-new-booking-created',
    name: '[Admin] Đơn đặt chỗ mới',
    subject: 'Đơn đặt chỗ mới #{booking_reference} - GlampingHub',
    html: glampingAdminNewBookingCreatedHTML,
    type: 'admin_notification',
    description: 'Email thông báo cho admin khi có đơn đặt chỗ mới',
    availableVariables: ['admin_name', 'booking_reference', 'guest_name', 'guest_email', 'guest_phone', 'zone_name', 'item_name', 'check_in_date', 'check_out_date', 'number_of_guests', 'total_amount', 'payment_status', 'notification_link'],
    isActive: true,
  },
  'glamping-admin-new-booking-pending': {
    slug: 'glamping-admin-new-booking-pending',
    name: '[Admin] Đơn đã tự động xác nhận',
    subject: 'Đã nhận thanh toán - Đơn #{booking_reference} đã tự động xác nhận',
    html: glampingAdminNewBookingPendingHTML,
    type: 'admin_notification',
    description: 'Email thông báo cho admin khi khách đã thanh toán và đơn được tự động xác nhận',
    availableVariables: ['admin_name', 'booking_reference', 'amount', 'guest_name', 'guest_email', 'zone_name', 'item_name', 'check_in_date', 'check_out_date', 'notification_link'],
    isActive: true,
  },
  'glamping-admin-booking-cancelled': {
    slug: 'glamping-admin-booking-cancelled',
    name: '[Admin] Đơn đã bị hủy',
    subject: 'Đơn #{booking_reference} đã bị hủy - GlampingHub Admin',
    html: glampingAdminBookingCancelledHTML,
    type: 'admin_notification',
    description: 'Email thông báo cho admin/staff khi booking bị hủy',
    availableVariables: ['admin_name', 'booking_reference', 'amount', 'guest_name', 'guest_email', 'zone_name', 'item_name', 'check_in_date', 'check_out_date', 'notification_link', 'cancellation_reason'],
    isActive: true,
  },
  'glamping-payment-confirmation': {
    slug: 'glamping-payment-confirmation',
    name: 'Xác nhận thanh toán',
    subject: 'Xác nhận thanh toán {amount} - #{booking_reference} - GlampingHub',
    html: glampingPaymentConfirmationHTML,
    type: 'payment_confirmation',
    description: 'Email gửi cho khách khi hệ thống nhận được thanh toán thành công',
    availableVariables: ['customer_name', 'booking_reference', 'amount', 'notification_link'],
    isActive: true,
  },
  'glamping-late-payment-customer': {
    slug: 'glamping-late-payment-customer',
    name: 'Thanh toán muộn (Khách)',
    subject: 'Thông báo thanh toán - #{booking_reference} - GlampingHub',
    html: glampingLatePaymentCustomerHTML,
    type: 'late_payment',
    description: 'Email gửi cho khách khi thanh toán sau khi booking đã hết hạn',
    availableVariables: ['customer_name', 'booking_reference', 'amount'],
    isActive: true,
  },
  'glamping-admin-late-payment': {
    slug: 'glamping-admin-late-payment',
    name: '[Admin] Late Payment cần xử lý',
    subject: 'Late Payment cần xử lý - #{booking_reference}',
    html: glampingAdminLatePaymentHTML,
    type: 'admin_notification',
    description: 'Email thông báo cho admin khi có thanh toán muộn cho booking đã hết hạn',
    availableVariables: ['booking_reference', 'amount', 'notification_link'],
    isActive: true,
  },
  'glamping-booking-expired': {
    slug: 'glamping-booking-expired',
    name: 'Đơn đặt chỗ hết hạn thanh toán',
    subject: 'Đơn đặt chỗ #{booking_reference} đã bị hủy - GlampingHub',
    html: glampingBookingExpiredHTML,
    type: 'booking_expired',
    description: 'Email thông báo cho khách khi booking bị hủy tự động do hết hạn thanh toán',
    availableVariables: ['customer_name', 'booking_reference', 'zone_name', 'checkin_date', 'checkout_date', 'rebook_url'],
    isActive: true,
  },
  'glamping-menu-updated-customer': {
    slug: 'glamping-menu-updated-customer',
    name: 'Cập nhật món ăn (Khách)',
    subject: 'Đã cập nhật món ăn - Booking #{booking_reference}',
    html: glampingMenuUpdatedCustomerHTML,
    type: 'menu_update',
    description: 'Email xác nhận gửi cho khách khi cập nhật món ăn thành công',
    availableVariables: ['customer_name', 'booking_reference', 'old_total', 'new_total', 'price_difference', 'price_increased', 'confirmation_url'],
    isActive: true,
  },
  'glamping-menu-updated-staff': {
    slug: 'glamping-menu-updated-staff',
    name: '[Admin] Khách cập nhật món ăn',
    subject: 'Khách cập nhật món ăn - #{booking_reference}',
    html: glampingMenuUpdatedStaffHTML,
    type: 'admin_notification',
    description: 'Email thông báo cho admin khi khách cập nhật món ăn',
    availableVariables: ['booking_reference', 'customer_name', 'old_total', 'new_total', 'price_difference', 'price_increased', 'requires_payment', 'notification_link'],
    isActive: true,
  },
  'glamping-common-items-updated-customer': {
    slug: 'glamping-common-items-updated-customer',
    name: 'Cập nhật dịch vụ chung (Khách)',
    subject: 'Đã cập nhật dịch vụ chung - Booking #{booking_reference}',
    html: glampingCommonItemsUpdatedCustomerHTML,
    type: 'common_items_update',
    description: 'Email xác nhận gửi cho khách khi cập nhật dịch vụ chung thành công',
    availableVariables: ['customer_name', 'booking_reference', 'old_total', 'new_total', 'price_difference', 'price_increased', 'confirmation_url'],
    isActive: true,
  },
  'glamping-common-items-updated-staff': {
    slug: 'glamping-common-items-updated-staff',
    name: '[Admin] Khách cập nhật dịch vụ chung',
    subject: 'Khách cập nhật dịch vụ chung - #{booking_reference}',
    html: glampingCommonItemsUpdatedStaffHTML,
    type: 'admin_notification',
    description: 'Email thông báo cho admin khi khách cập nhật dịch vụ chung',
    availableVariables: ['booking_reference', 'customer_name', 'old_total', 'new_total', 'price_difference', 'price_increased', 'requires_payment', 'notification_link'],
    isActive: true,
  },
  'glamping-pre-arrival-reminder': {
    slug: 'glamping-pre-arrival-reminder',
    name: 'Nhắc nhở trước khi nhận phòng',
    subject: '🏕️ Chuẩn bị cho chuyến đi - Booking #{booking_code}',
    html: glampingPreArrivalReminderHTML,
    type: 'pre_arrival',
    description: 'Email nhắc nhở gửi 2 ngày trước check-in',
    availableVariables: ['customer_name', 'booking_code', 'property_name', 'check_in_date', 'check_in_time', 'management_url'],
    isActive: true,
  },
  'glamping-post-stay-thank-you': {
    slug: 'glamping-post-stay-thank-you',
    name: 'Cảm ơn sau chuyến đi',
    subject: '🙏 Cảm ơn bạn đã trải nghiệm - Booking #{booking_code}',
    html: glampingPostStayThankYouHTML,
    type: 'post_stay',
    description: 'Email cảm ơn gửi 1 ngày sau check-out',
    availableVariables: ['customer_name', 'booking_code', 'property_name', 'review_url'],
    isActive: true,
  },
  'glamping-menu-selection-reminder': {
    slug: 'glamping-menu-selection-reminder',
    name: 'Nhắc nhở chọn món ăn',
    subject: '🍽️ Nhắc nhở chọn món ăn cho chuyến glamping - {booking_code}',
    html: glampingMenuSelectionReminderHTML,
    type: 'menu_reminder',
    description: 'Email nhắc khách chọn món ăn 48h trước check-in (legacy)',
    availableVariables: ['customer_name', 'booking_code', 'property_name', 'check_in_date', 'check_in_time', 'management_url'],
    isActive: true,
  },
  'glamping-menu-selection-reminder-day-3': {
    slug: 'glamping-menu-selection-reminder-day-3',
    name: 'Nhắc nhở chọn món ăn - Ngày 3',
    subject: '🍽️ Còn 3 ngày - Đừng quên chọn món ăn! - {booking_code}',
    html: glampingMenuSelectionReminderDay3HTML,
    type: 'menu_reminder',
    description: 'Email nhắc khách chọn món ăn 3 ngày trước check-in',
    availableVariables: ['customer_name', 'booking_code', 'property_name', 'check_in_date', 'check_in_time', 'management_url'],
    isActive: true,
  },
  'glamping-menu-selection-reminder-day-2': {
    slug: 'glamping-menu-selection-reminder-day-2',
    name: 'Nhắc nhở chọn món ăn - Ngày 2',
    subject: '🍽️ Còn 2 ngày - Chọn món ăn ngay! - {booking_code}',
    html: glampingMenuSelectionReminderDay2HTML,
    type: 'menu_reminder',
    description: 'Email nhắc khách chọn món ăn 2 ngày trước check-in',
    availableVariables: ['customer_name', 'booking_code', 'property_name', 'check_in_date', 'check_in_time', 'management_url'],
    isActive: true,
  },
  'glamping-menu-selection-reminder-day-1': {
    slug: 'glamping-menu-selection-reminder-day-1',
    name: 'Nhắc nhở chọn món ăn - KHẨN CẤP',
    subject: '⚠️ KHẨN CẤP: Chọn món ăn NGAY - Ngày mai check-in! - {booking_code}',
    html: glampingMenuSelectionReminderDay1HTML,
    type: 'menu_reminder',
    description: 'Email KHẨN CẤP nhắc khách chọn món ăn 1 ngày trước check-in',
    availableVariables: ['customer_name', 'booking_code', 'property_name', 'check_in_date', 'check_in_time', 'management_url'],
    isActive: true,
  },
  'glamping-trip-reminder': {
    slug: 'glamping-trip-reminder',
    name: 'Nhắc nhở chuyến đi 24h',
    subject: '🏕️ Chuyến đi của bạn là NGÀY MAI! - {booking_code}',
    html: glampingTripReminderHTML,
    type: 'trip_reminder',
    description: 'Email nhắc nhở 24h trước check-in cho khách ĐÃ chọn món ăn',
    availableVariables: ['customer_name', 'booking_code', 'property_name', 'check_in_date', 'check_in_time', 'management_url'],
    isActive: true,
  },
  'glamping-admin-email-failed': {
    slug: 'glamping-admin-email-failed',
    name: '[Admin] Email gửi thất bại',
    subject: '⚠️ Email gửi thất bại - Booking #{booking_reference}',
    html: glampingAdminEmailFailedHTML,
    type: 'admin_notification',
    description: 'Email thông báo cho admin khi gửi email cho khách thất bại',
    availableVariables: ['admin_name', 'booking_reference', 'template_name', 'recipient_email', 'error_message', 'notification_link'],
    isActive: true,
  },
};

// Backward compatible: Keep GLAMPING_EMAIL_TEMPLATES_HTML for any legacy code
export const GLAMPING_EMAIL_TEMPLATES_HTML: Record<string, string> = Object.fromEntries(
  Object.entries(GLAMPING_EMAIL_TEMPLATES).map(([slug, template]) => [slug, template.html])
);
