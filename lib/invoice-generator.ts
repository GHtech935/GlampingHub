interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  originalUnitPrice: number; // Giá gốc (chưa giảm)
  unitPrice: number; // Đơn giá (đã giảm)
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalWithTax: number;
}

interface InvoiceData {
  bookingReference: string;
  createdAt: string;
  guest: {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
  };
  campsite: {
    name: string;
    address?: string;
    phone?: string;
    taxId?: string; // MST
  };
  items: InvoiceItem[];
  taxInvoiceRequired: boolean;
  totals: {
    subtotalBeforeDiscounts: number;
    totalDiscounts: number;
    subtotalAfterDiscounts: number;
    totalTax: number;
    grandTotal: number;
  };
  invoiceNotes?: string; // Ghi chú xuất hoá đơn (HTML formatted)
  specialRequests?: string; // Yêu cầu đặc biệt của khách (plain text)
  staffName?: string | null; // Nhân viên tư vấn (nếu admin tạo booking)
}

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount);
};

// Helper to format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

function generateInvoiceHTML(data: InvoiceData): string {
  const title = data.taxInvoiceRequired ? 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG' : 'PHIẾU THU';
  const subtitle = data.taxInvoiceRequired ? '(VAT Invoice)' : '(Receipt)';

  const itemsHTML = data.items.map((item, index) => {
    const hasDiscount = item.originalUnitPrice !== item.unitPrice;
    return `
    <tr>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee;">${index + 1}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee;">
        <div style="font-weight: 500;">${item.name}</div>
        ${item.description ? `<div style="font-size: 11px; color: #666;">${item.description}</div>` : ''}
      </td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.originalUnitPrice)}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: right; ${hasDiscount ? 'color: #16a34a;' : ''}">
        ${formatCurrency(item.unitPrice)}
      </td>
      ${data.taxInvoiceRequired ? `<td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.taxAmount)}</td>` : ''}
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">
        ${formatCurrency(data.taxInvoiceRequired ? item.totalWithTax : item.subtotal)}
      </td>
    </tr>
  `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${data.bookingReference}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 30px;
      max-width: 800px;
      margin: 0 auto;
      color: #333;
      font-size: 13px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
    }
    .info-box {
      flex: 1;
    }
    .info-box h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .info-box p {
      margin: 5px 0;
      font-size: 14px;
    }
    .booking-ref {
      text-align: right;
    }
    .booking-ref .ref-number {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    thead {
      background: #f5f5f5;
    }
    thead th {
      padding: 8px 4px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      color: #555;
      white-space: nowrap;
    }
    thead th.text-center { text-align: center; }
    thead th.text-right { text-align: right; }
    tbody td {
      font-size: 13px;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
    }
    .totals-box {
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .totals-row.discount {
      color: #16a34a;
    }
    .totals-row.tax {
      color: #666;
    }
    .totals-row.grand-total {
      font-size: 18px;
      font-weight: bold;
      border-top: 2px solid #333;
      padding-top: 12px;
      margin-top: 8px;
    }
    .notes-section {
      margin-top: 20px;
    }
    .notes-section .notes-label {
      font-weight: 600;
      color: #333;
      display: inline;
    }
    .notes-section .notes-content {
      display: inline;
      color: #4b5563;
    }
    .notes-section .notes-content p {
      display: inline;
      margin: 0;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-style: italic;
    }
    @media print {
      body {
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
    @media screen and (max-width: 600px) {
      body {
        padding: 15px;
        font-size: 11px;
      }
      .header h1 {
        font-size: 18px;
      }
      .info-box h3 {
        font-size: 11px;
      }
      .info-box p {
        font-size: 11px;
      }
      .booking-ref .ref-number {
        font-size: 14px;
      }
      thead th {
        font-size: 9px;
        padding: 6px 2px;
      }
      tbody td {
        font-size: 11px;
        padding: 4px 2px;
      }
      .totals-box {
        width: 100%;
      }
      .totals-row {
        font-size: 12px;
      }
      .totals-row.grand-total {
        font-size: 14px;
      }
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ In / Tải PDF</button>

  <div class="header">
    <h1>${title}</h1>
    <div class="subtitle">${subtitle}</div>
    ${data.taxInvoiceRequired && data.campsite.taxId ? `<div style="margin-top: 10px; font-size: 13px;">MST: ${data.campsite.taxId}</div>` : ''}
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Thông tin đơn hàng</h3>
      <p><strong>Khu glamping:</strong> ${data.campsite.name}</p>
      ${data.staffName ? `<p><strong>Nhân viên tư vấn:</strong> ${data.staffName}</p>` : ''}
      ${data.campsite.address ? `<p><strong>Địa chỉ:</strong> ${data.campsite.address}</p>` : ''}
      ${data.campsite.phone ? `<p><strong>SĐT:</strong> ${data.campsite.phone}</p>` : ''}
    </div>
    <div class="info-box booking-ref">
      <h3>Mã booking</h3>
      <div class="ref-number">${data.bookingReference}</div>
      <p style="margin-top: 10px;">Ngày: ${formatDate(data.createdAt)}</p>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Khách hàng</h3>
      <p><strong>Tên:</strong> ${data.guest.fullName}</p>
      <p><strong>Email:</strong> ${data.guest.email}</p>
      ${data.guest.phone ? `<p><strong>SĐT:</strong> ${data.guest.phone}</p>` : ''}
      ${data.guest.address ? `<p><strong>Địa chỉ:</strong> ${data.guest.address}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px;">STT</th>
        <th>Hạng mục</th>
        <th class="text-center" style="width: 40px;">SL</th>
        <th class="text-right" style="width: 90px;">Giá gốc</th>
        <th class="text-right" style="width: 90px;">Đơn giá</th>
        ${data.taxInvoiceRequired ? `<th class="text-right" style="width: 80px;">Thuế</th>` : ''}
        <th class="text-right" style="width: 100px;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      ${data.totals.totalDiscounts > 0 ? `
        <div class="totals-row">
          <span>Tiền hàng:</span>
          <span>${formatCurrency(data.totals.subtotalBeforeDiscounts)} VND</span>
        </div>
        <div class="totals-row discount">
          <span>Giảm giá:</span>
          <span>-${formatCurrency(data.totals.totalDiscounts)} VND</span>
        </div>
        <div class="totals-row">
          <span>Sau giảm giá:</span>
          <span>${formatCurrency(data.totals.subtotalAfterDiscounts)} VND</span>
        </div>
      ` : ''}
      ${data.taxInvoiceRequired && data.totals.totalTax > 0 ? `
        <div class="totals-row tax">
          <span>Thuế GTGT:</span>
          <span>${formatCurrency(data.totals.totalTax)} VND</span>
        </div>
      ` : ''}
      <div class="totals-row grand-total">
        <span>TỔNG CỘNG:</span>
        <span>${formatCurrency(data.totals.grandTotal)} VND</span>
      </div>
    </div>
  </div>

  ${data.specialRequests && data.specialRequests.trim() ? `
  <div class="notes-section">
    <span class="notes-label">Yêu cầu đặc biệt của khách / Customer Special Requests:</span> <span class="notes-content">${data.specialRequests}</span>
  </div>
  ` : ''}

  ${data.invoiceNotes && data.invoiceNotes.replace(/<[^>]*>/g, '').trim() ? `
  <div class="notes-section">
    <span class="notes-label">Ghi chú / Notes:</span> <span class="notes-content">${data.invoiceNotes}</span>
  </div>
  ` : ''}

  <div class="footer">
    <p>Cảm ơn quý khách đã sử dụng dịch vụ!</p>
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
  `;
}

export function downloadInvoicePDF(data: InvoiceData): void {
  const html = generateInvoiceHTML(data);

  // Open in new window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export { type InvoiceData, type InvoiceItem };
