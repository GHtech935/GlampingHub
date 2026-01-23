import ExcelJS from 'exceljs';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: string;
  filename: string;
}

// Export to Excel
export async function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  options: ExportOptions
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.title);

  // Add title
  worksheet.mergeCells('A1:' + String.fromCharCode(64 + columns.length) + '1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = options.title;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Add subtitle/date range
  if (options.subtitle || options.dateRange) {
    worksheet.mergeCells('A2:' + String.fromCharCode(64 + columns.length) + '2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = options.dateRange || options.subtitle || '';
    subtitleCell.font = { size: 12, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };
  }

  // Add empty row
  worksheet.addRow([]);

  // Add headers
  const headerRow = worksheet.addRow(columns.map(col => col.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Set column widths
  columns.forEach((col, index) => {
    worksheet.getColumn(index + 1).width = col.width || 15;
  });

  // Add data rows
  data.forEach((row, rowIndex) => {
    const dataRow = worksheet.addRow(columns.map(col => row[col.key]));
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    // Alternate row colors
    if (rowIndex % 2 === 1) {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      });
    }
  });

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

// Generate HTML content for PDF
function generatePDFHtml(
  data: Record<string, any>[],
  columns: ExportColumn[],
  options: ExportOptions
): string {
  const currentDate = new Date().toLocaleDateString('vi-VN');

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #4F46E5;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #1F2937;
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 14px;
          color: #6B7280;
        }
        .date-range {
          font-size: 13px;
          color: #4F46E5;
          margin-top: 5px;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 11px;
        }
        th {
          background-color: #4F46E5;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #4338CA;
        }
        td {
          padding: 8px;
          border: 1px solid #E5E7EB;
          vertical-align: middle;
        }
        tr:nth-child(even) {
          background-color: #F9FAFB;
        }
        tr:hover {
          background-color: #F3F4F6;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .font-medium {
          font-weight: 500;
        }
        .text-green {
          color: #059669;
        }
        .footer {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #9CA3AF;
        }
        .summary {
          background-color: #EEF2FF;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .summary-title {
          font-size: 12px;
          font-weight: 600;
          color: #4F46E5;
          margin-bottom: 5px;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 500;
        }
        .badge-primary {
          background-color: #4F46E5;
          color: white;
        }
        .badge-secondary {
          background-color: #E5E7EB;
          color: #374151;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${options.title}</div>
        ${options.subtitle ? `<div class="subtitle">${options.subtitle}</div>` : ''}
        ${options.dateRange ? `<div class="date-range">Khoảng thời gian: ${options.dateRange}</div>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map((row, index) => `
            <tr>
              ${columns.map(col => {
                const value = row[col.key];
                // Check if it's a rank/number column
                if (col.key === 'rank') {
                  const badgeClass = index < 3 ? 'badge-primary' : 'badge-secondary';
                  return `<td class="text-center"><span class="badge ${badgeClass}">${value}</span></td>`;
                }
                // Check if it's a revenue/currency column
                if (col.key === 'revenue' || col.key === 'totalRevenue' || col.key === 'avgPrice' || col.key === 'avgValue') {
                  return `<td class="text-right font-medium text-green">${value}</td>`;
                }
                // Check if it's a number column
                if (col.key === 'bookings' || col.key === 'nights' || col.key === 'orders' || col.key === 'quantity' || col.key === 'pitches') {
                  return `<td class="text-right">${value}</td>`;
                }
                return `<td>${value}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <span>Tổng số: ${data.length} dòng</span>
        <span>Ngày xuất: ${currentDate}</span>
      </div>
    </body>
    </html>
  `;
}

// Export to PDF using browser print
export async function exportToPDF(
  data: Record<string, any>[],
  columns: ExportColumn[],
  options: ExportOptions
): Promise<void> {
  // Generate HTML content
  const htmlContent = generatePDFHtml(data, columns, options);

  // Open new window with print dialog
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('Vui lòng cho phép popup để xuất PDF');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

// Export to CSV with UTF-8 BOM
export function exportToCSV(
  data: Record<string, any>[],
  columns: ExportColumn[],
  options: ExportOptions
): void {
  // Add BOM for UTF-8 encoding support in Excel
  const BOM = '\uFEFF';

  // Create header row
  const headerRow = columns.map(col => `"${col.header}"`).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      // Escape double quotes and wrap in quotes
      if (value === null || value === undefined) {
        return '""';
      }
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  // Combine all rows
  const csvContent = BOM + [headerRow, ...dataRows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}

// Format currency for export
export function formatCurrencyForExport(value: number, locale: string = 'vi'): string {
  return value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    maximumFractionDigits: 0,
  }) + 'đ';
}

// Commission Stats interface for PDF export
interface CommissionStatsForExport {
  summary: {
    totalCommission: number;
    totalBookings: number;
    totalRevenue: number;
    pendingPayoutsAmount: number;
    pendingPayoutsCount: number;
    monthOverMonthGrowth: number;
  };
  metrics: {
    avgCommissionRate: number;
    avgCommissionPerBooking: number;
    activeCampsitesCount: number;
    totalOwnersCount: number;
  };
  topCampsites: Array<{
    name: string;
    commissionPercentage: number;
    totalCommission: number;
    totalOwnerEarnings: number;
    bookingCount: number;
  }>;
  ownerComparison: Array<{
    ownerName: string;
    campsiteCount: number;
    totalBookings: number;
    totalCommission: number;
    totalOwnerEarnings: number;
    owner_bank_name?: string;
    owner_bank_id?: string;
    owner_bank_branch?: string;
    owner_account_number?: string;
    owner_account_holder?: string;
  }>;
}

// Generate HTML content for Commission Stats PDF
function generateCommissionStatsPDFHtml(
  stats: CommissionStatsForExport,
  dateRange: { from: Date | null; to: Date | null }
): string {
  const currentDateTime = new Date().toLocaleString('vi-VN');
  const formatCurrency = (value: number) => value.toLocaleString('vi-VN') + 'đ';

  // Format bank info with line breaks
  const formatBankInfo = (bankName?: string, bankId?: string, branch?: string) => {
    if (!bankName && !bankId && !branch) return '-';
    const parts = [];
    if (bankName) parts.push(bankName);
    if (bankId) parts.push(bankId);
    if (branch) parts.push(branch);
    return parts.join('<br/>');
  };

  const dateRangeText = dateRange.from && dateRange.to
    ? `${dateRange.from.toLocaleDateString('vi-VN')} - ${dateRange.to.toLocaleDateString('vi-VN')}`
    : 'Tất cả thời gian';

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Báo cáo Hoa hồng - GlampingHub</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 30px;
          color: #333;
          font-size: 12px;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 3px solid #10B981;
        }
        .title {
          font-size: 22px;
          font-weight: bold;
          color: #1F2937;
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 13px;
          color: #6B7280;
        }
        .date-range {
          font-size: 12px;
          color: #10B981;
          margin-top: 5px;
          font-weight: 600;
        }

        /* Summary Cards */
        .summary-section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 1px solid #E5E7EB;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }
        .summary-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .summary-card.green { border-left: 4px solid #10B981; }
        .summary-card.blue { border-left: 4px solid #3B82F6; }
        .summary-card.purple { border-left: 4px solid #8B5CF6; }
        .summary-card.orange { border-left: 4px solid #F59E0B; }
        .card-label {
          font-size: 11px;
          color: #6B7280;
          margin-bottom: 5px;
        }
        .card-value {
          font-size: 18px;
          font-weight: bold;
          color: #1F2937;
        }
        .card-value.green { color: #059669; }
        .card-value.blue { color: #2563EB; }
        .card-value.purple { color: #7C3AED; }
        .card-value.orange { color: #D97706; }

        /* Metrics Row */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }
        .metric-card {
          background: #EEF2FF;
          border-radius: 8px;
          padding: 12px 15px;
        }
        .metric-label {
          font-size: 11px;
          color: #4F46E5;
          margin-bottom: 3px;
        }
        .metric-value {
          font-size: 16px;
          font-weight: bold;
          color: #1F2937;
        }
        .metric-sub {
          font-size: 10px;
          color: #6B7280;
          margin-top: 2px;
        }

        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 11px;
        }
        th {
          background-color: #10B981;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #059669;
        }
        td {
          padding: 8px;
          border: 1px solid #E5E7EB;
          vertical-align: middle;
        }
        tr:nth-child(even) {
          background-color: #F9FAFB;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .font-medium {
          font-weight: 500;
        }
        .text-green {
          color: #059669;
        }
        .text-blue {
          color: #2563EB;
        }

        .table-section {
          margin-bottom: 25px;
        }

        /* Footer */
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #9CA3AF;
        }

        @media print {
          body {
            padding: 15px;
          }
          .summary-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">BÁO CÁO HOA HỒNG - GLAMPINGHUB</div>
        <div class="subtitle">Commission Report</div>
        <div class="date-range">Khoảng thời gian: ${dateRangeText}</div>
      </div>

      <!-- Summary Section -->
      <div class="summary-section">
        <div class="section-title">TỔNG QUAN</div>
        <div class="summary-grid">
          <div class="summary-card green">
            <div class="card-label">Tổng Hoa Hồng</div>
            <div class="card-value green">${formatCurrency(stats.summary.totalCommission)}</div>
          </div>
          <div class="summary-card blue">
            <div class="card-label">Tổng Đặt Phòng</div>
            <div class="card-value blue">${stats.summary.totalBookings}</div>
          </div>
          <div class="summary-card purple">
            <div class="card-label">Tổng Doanh Thu</div>
            <div class="card-value purple">${formatCurrency(stats.summary.totalRevenue)}</div>
          </div>
          <div class="summary-card orange">
            <div class="card-label">Chờ Thanh Toán</div>
            <div class="card-value orange">${formatCurrency(stats.summary.pendingPayoutsAmount)}</div>
          </div>
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Tỷ lệ hoa hồng trung bình</div>
          <div class="metric-value">${stats.metrics.avgCommissionRate.toFixed(2)}%</div>
          <div class="metric-sub">Trên tất cả khu cắm trại</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Hoa hồng trung bình / Đặt phòng</div>
          <div class="metric-value">${formatCurrency(stats.metrics.avgCommissionPerBooking)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Khu cắm trại hoạt động</div>
          <div class="metric-value">${stats.metrics.activeCampsitesCount}</div>
          <div class="metric-sub">${stats.metrics.totalOwnersCount} chủ sở hữu</div>
        </div>
      </div>

      <!-- Top Campsites Table -->
      <div class="table-section">
        <div class="section-title">TOP KHU CẮM TRẠI THEO HOA HỒNG</div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%">#</th>
              <th style="width: 35%">Tên Khu Cắm Trại</th>
              <th class="text-center" style="width: 12%">Tỷ Lệ</th>
              <th class="text-right" style="width: 16%">Hoa Hồng</th>
              <th class="text-right" style="width: 16%">Thu Nhập Owner</th>
              <th class="text-center" style="width: 16%">Đặt Phòng</th>
            </tr>
          </thead>
          <tbody>
            ${stats.topCampsites.slice(0, 10).map((campsite, index) => `
              <tr>
                <td class="text-center font-medium">${index + 1}</td>
                <td class="font-medium">${campsite.name}</td>
                <td class="text-center">${campsite.commissionPercentage}%</td>
                <td class="text-right text-green font-medium">${formatCurrency(campsite.totalCommission)}</td>
                <td class="text-right text-blue">${formatCurrency(campsite.totalOwnerEarnings)}</td>
                <td class="text-center">${campsite.bookingCount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${stats.topCampsites.length === 0 ? '<p style="text-align: center; padding: 20px; color: #6B7280;">Không có dữ liệu</p>' : ''}
      </div>

      <!-- Owner Comparison Table -->
      <div class="table-section">
        <div class="section-title">CHỦ SỞ HỮU</div>
        <table>
          <thead>
            <tr>
              <th style="width: 3%">#</th>
              <th style="width: 18%">Chủ Sở Hữu</th>
              <th class="text-center" style="width: 7%">Số Khu</th>
              <th class="text-center" style="width: 7%">Đặt Phòng</th>
              <th class="text-right" style="width: 13%">Hoa Hồng</th>
              <th class="text-right" style="width: 13%">Thu Nhập Owner</th>
              <th style="width: 13%">Ngân Hàng</th>
              <th style="width: 13%">Số TK</th>
              <th style="width: 13%">Chủ TK</th>
            </tr>
          </thead>
          <tbody>
            ${stats.ownerComparison.slice(0, 15).map((owner, index) => `
              <tr>
                <td class="text-center font-medium">${index + 1}</td>
                <td class="font-medium">${owner.ownerName}</td>
                <td class="text-center">${owner.campsiteCount}</td>
                <td class="text-center">${owner.totalBookings}</td>
                <td class="text-right text-green font-medium">${formatCurrency(owner.totalCommission)}</td>
                <td class="text-right text-blue">${formatCurrency(owner.totalOwnerEarnings)}</td>
                <td style="font-size: 10px; line-height: 1.4;">${formatBankInfo(owner.owner_bank_name, owner.owner_bank_id, owner.owner_bank_branch)}</td>
                <td>${owner.owner_account_number || '-'}</td>
                <td>${owner.owner_account_holder || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${stats.ownerComparison.length === 0 ? '<p style="text-align: center; padding: 20px; color: #6B7280;">Không có dữ liệu</p>' : ''}
      </div>

      <div class="footer">
        <span>GlampingHub - Hệ thống quản lý đặt phòng cắm trại</span>
        <span>Ngày xuất: ${currentDateTime}</span>
      </div>
    </body>
    </html>
  `;
}

// Export Commission Stats to PDF using browser print dialog
export function exportCommissionStatsToPDF(
  stats: CommissionStatsForExport,
  dateRange: { from: Date | null; to: Date | null }
): void {
  // Generate HTML content
  const htmlContent = generateCommissionStatsPDFHtml(stats, dateRange);

  // Open new window with print dialog
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('Vui lòng cho phép popup để xuất PDF');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };
}
