/**
 * Email templates for glamping menu updates
 */

const emailStyles = {
  container: 'max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9fafb;',
  header: 'background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); padding: 20px 15px; text-align: center;',
  headerTitle: 'color: white; font-size: 24px; margin: 0; font-weight: bold;',
  content: 'background-color: white; padding: 20px 15px; border-radius: 8px; margin: 20px;',
  greeting: 'font-size: 18px; color: #1f2937; margin-bottom: 20px;',
  section: 'background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;',
  sectionTitle: 'font-size: 16px; font-weight: bold; color: #7c3aed; margin-bottom: 15px;',
  button: 'display: inline-block; background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;',
  footer: 'text-align: center; padding: 20px; color: #6b7280; font-size: 12px;',
  divider: 'border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;',
};

// Customer confirmation email
export const glampingMenuUpdatedCustomerHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cập nhật món ăn thành công</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="${emailStyles.header}">
      <h1 style="${emailStyles.headerTitle}">GlampingHub</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Cập nhật món ăn thành công</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào <strong>{customer_name}</strong>,</p>

      <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">
          Đã cập nhật món ăn thành công!
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Chúng tôi đã nhận được yêu cầu thay đổi món ăn cho đơn đặt phòng <strong>#{booking_reference}</strong> của bạn.
      </p>

      <!-- Price Summary -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thay đổi chi phí</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Tổng tiền cũ:</td>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; text-align: right; text-decoration: line-through;">{old_total}</td>
          </tr>
          <tr style="border-bottom: 2px solid #7c3aed;">
            <td style="padding: 12px 0; font-size: 16px; color: #1f2937; font-weight: bold;">Tổng tiền mới:</td>
            <td style="padding: 12px 0; font-size: 18px; color: #7c3aed; font-weight: bold; text-align: right;">{new_total}</td>
          </tr>
          {price_increased_section}
        </table>
      </div>

      {payment_required_section}

      <!-- View Booking Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{confirmation_url}" style="${emailStyles.button}">
          Xem chi tiết đặt phòng
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

// Staff notification email
export const glampingMenuUpdatedStaffHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khách cập nhật món ăn</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="${emailStyles.container}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 20px 15px; text-align: center;">
      <h1 style="${emailStyles.headerTitle}">GlampingHub Admin</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Khách cập nhật món ăn</p>
    </div>

    <!-- Content -->
    <div style="${emailStyles.content}">
      <p style="${emailStyles.greeting}">Xin chào,</p>

      <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 16px; font-weight: bold;">
          Khách hàng đã cập nhật món ăn cho đơn #{booking_reference}
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
        Khách hàng <strong>{customer_name}</strong> vừa thay đổi món ăn và đồ uống trong đơn đặt phòng.
      </p>

      <!-- Price Changes -->
      <div style="${emailStyles.section}">
        <h2 style="${emailStyles.sectionTitle}">Thay đổi chi phí</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Tổng tiền cũ:</td>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; text-align: right;">{old_total}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Tổng tiền mới:</td>
            <td style="padding: 10px 0; color: #1f2937; font-size: 16px; font-weight: 600; text-align: right;">{new_total}</td>
          </tr>
          <tr style="border-top: 2px solid #2563eb;">
            <td style="padding: 12px 0; font-size: 15px; color: #1f2937; font-weight: bold;">Chênh lệch:</td>
            <td style="padding: 12px 0; font-size: 16px; color: {price_color}; font-weight: bold; text-align: right;">{price_change_text}</td>
          </tr>
        </table>
      </div>

      {payment_required_section}

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
