"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Eye, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { ExportDropdown } from "@/components/admin/reports/ExportDropdown";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";
import { GlampingBookingDetailModal } from "@/components/admin/glamping/GlampingBookingDetailModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface BookingNote {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface MenuProduct {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  notes: string | null;
}

interface TentParameter {
  label: string;
  quantity: number;
}

interface TentData {
  tentId: string;
  itemId: string;
  itemName: string;
  parameters: TentParameter[];
  menuProducts: MenuProduct[];
}

interface BookingData {
  bookingId: string;
  bookingCode: string;
  bookerName: string;
  tentCount: number;
  notes: BookingNote[];
  tents: TentData[];
}

interface AggregatedMenuItem {
  menuItemName: string;
  totalQuantity: number;
}

interface ParameterSummary {
  label: string;
  quantity: number;
}

interface Summary {
  date: string;
  totalTents: number;
  parametersSummary: ParameterSummary[];
  aggregatedMenuItems: AggregatedMenuItem[];
}

interface FlatRow {
  isFirstRowOfBooking: boolean;
  isFirstRowOfTent: boolean;
  bookingId: string;
  bookingCode: string;
  bookerName: string;
  tentCount: number;
  itemName: string;
  menuItemName: string;
  quantity: number;
  parameters: TentParameter[];
  notes: string | null;
  bookingNotes: BookingNote[];
}

export default function KitchenFoodReportPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const t = useTranslations("admin.reportKitchenFood");
  const tCols = useTranslations("admin.reportKitchenFood.columns");
  const tActions = useTranslations("admin.reportKitchenFood.actions");
  const tSummary = useTranslations("admin.reportKitchenFood.summary");
  const tNotesModal = useTranslations("admin.reportKitchenFood.notesModal");
  const { locale } = useAdminLocale();

  // Default to today's date
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<BookingData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking detail modal state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Notes modal state
  const [notesModalBookingId, setNotesModalBookingId] = useState<string | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        zoneId,
        date: selectedDate,
      });

      const res = await fetch(`/api/admin/glamping/reports/kitchen-food?${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json.data || []);
      setSummary(json.summary || null);
    } catch {
      toast.error(locale === "vi" ? "Không thể tải dữ liệu" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [zoneId, selectedDate, locale]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedBookingId(null);
    setIsDetailModalOpen(false);
  };

  const handleOpenNotesModal = (bookingId: string) => {
    setNotesModalBookingId(bookingId);
    setIsNotesModalOpen(true);
  };

  const handleCloseNotesModal = () => {
    setNotesModalBookingId(null);
    setIsNotesModalOpen(false);
  };

  // Get notes for the currently selected booking in the modal
  const currentBookingNotes = useMemo(() => {
    if (!notesModalBookingId) return [];
    const booking = data.find(b => b.bookingId === notesModalBookingId);
    return booking?.notes || [];
  }, [notesModalBookingId, data]);

  // Transform nested data to flat rows for table display
  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    data.forEach((booking) => {
      let isFirstRowOfBooking = true;
      booking.tents.forEach((tent) => {
        let isFirstRowOfTent = true;
        tent.menuProducts.forEach((product) => {
          rows.push({
            isFirstRowOfBooking,
            isFirstRowOfTent,
            bookingId: booking.bookingId,
            bookingCode: booking.bookingCode,
            bookerName: booking.bookerName,
            tentCount: booking.tentCount,
            itemName: tent.itemName,
            menuItemName: product.menuItemName,
            quantity: product.quantity,
            parameters: tent.parameters || [],
            notes: product.notes,
            bookingNotes: booking.notes || [],
          });
          isFirstRowOfBooking = false;
          isFirstRowOfTent = false;
        });
      });
    });
    return rows;
  }, [data]);

  // Count how many rows belong to each booking (for rowSpan)
  const bookingRowCounts = useMemo(() => {
    const counts = new Map<string, number>();
    flatRows.forEach((row) => {
      counts.set(row.bookingId, (counts.get(row.bookingId) || 0) + 1);
    });
    return counts;
  }, [flatRows]);

  // Count how many rows belong to each tent (for rowSpan)
  const tentRowCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach((booking) => {
      booking.tents.forEach((tent) => {
        const key = `${booking.bookingId}-${tent.tentId}`;
        counts.set(key, tent.menuProducts.length);
      });
    });
    return counts;
  }, [data]);

  const handleExportExcel = async () => {
    if (!summary) return;

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t("title"));

    // ===== HEADER SECTION =====
    // Row 1: Title
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${t("title")} - ${selectedDate}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Row 2: Empty
    worksheet.addRow([]);

    // Row 3: Summary info
    worksheet.mergeCells('A3:B3');
    worksheet.getCell('A3').value = `${tSummary("totalTents")}: ${summary.totalTents}`;
    worksheet.getCell('A3').font = { bold: true };

    // Parameters summary on same row
    let paramText = summary.parametersSummary.map(p => `${p.label}: ${p.quantity}`).join(' | ');
    worksheet.mergeCells('C3:H3');
    worksheet.getCell('C3').value = paramText;

    // Row 4: Empty
    worksheet.addRow([]);

    // ===== MENU ITEMS SUMMARY TABLE =====
    // Row 5: Section title
    worksheet.mergeCells('A5:B5');
    worksheet.getCell('A5').value = tSummary("menuItemsSummary");
    worksheet.getCell('A5').font = { bold: true, size: 12 };

    // Row 6: Menu items table header
    const menuHeaderRow = worksheet.addRow([locale === "vi" ? "MÓN ĂN" : "MENU ITEM", locale === "vi" ? "SL" : "QTY"]);
    menuHeaderRow.eachCell((cell, colNumber) => {
      if (colNumber <= 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    });
    worksheet.getColumn(1).width = 35;
    worksheet.getColumn(2).width = 10;

    // Menu items data rows
    summary.aggregatedMenuItems.forEach((item) => {
      const row = worksheet.addRow([item.menuItemName, item.totalQuantity]);
      row.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      row.getCell(2).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      row.getCell(2).alignment = { horizontal: 'center' };
    });

    // Total row
    const totalQty = summary.aggregatedMenuItems.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalRow = worksheet.addRow([locale === "vi" ? "Tổng cộng" : "Total", totalQty]);
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber <= 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };
        cell.font = { bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    });
    totalRow.getCell(2).alignment = { horizontal: 'center' };

    // Empty rows
    worksheet.addRow([]);
    worksheet.addRow([]);

    // ===== DETAILED BOOKING TABLE =====
    // Get unique parameter labels for dynamic columns
    const allParamLabels = new Set<string>();
    data.forEach(booking => {
      booking.tents.forEach(tent => {
        tent.parameters.forEach(p => allParamLabels.add(p.label));
      });
    });
    const paramLabels = Array.from(allParamLabels);

    // Header row
    const detailHeaders = [
      tCols("tentCount"),
      tCols("bookingCode"),
      tCols("booker"),
      tCols("item"),
      tCols("menuItem"),
      tCols("quantity"),
      ...paramLabels,
      tCols("notes")
    ];
    const detailHeaderRow = worksheet.addRow(detailHeaders);
    detailHeaderRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Set column widths
    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 16;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 25;
    worksheet.getColumn(6).width = 8;
    paramLabels.forEach((_, idx) => {
      worksheet.getColumn(7 + idx).width = 15;
    });
    worksheet.getColumn(7 + paramLabels.length).width = 50;

    // Data rows - expand each booking with notes
    data.forEach((booking) => {
      // Determine the max rows needed: max of (menu products count, notes count, 1)
      const menuProductCount = booking.tents.reduce((sum, tent) => sum + tent.menuProducts.length, 0);
      const notesCount = booking.notes?.length || 0;
      const maxRows = Math.max(menuProductCount, notesCount, 1);

      // Build flat menu product rows for this booking
      const menuProductRows: { tent: typeof booking.tents[0]; product: typeof booking.tents[0]['menuProducts'][0]; isFirstOfTent: boolean }[] = [];
      booking.tents.forEach(tent => {
        tent.menuProducts.forEach((product, idx) => {
          menuProductRows.push({ tent, product, isFirstOfTent: idx === 0 });
        });
      });

      // Generate export rows
      for (let i = 0; i < maxRows; i++) {
        const menuRow = menuProductRows[i];
        const note = booking.notes?.[i];

        // Build param values
        const paramValues = paramLabels.map(label => {
          if (!menuRow || !menuRow.isFirstOfTent) return "";
          const param = menuRow.tent.parameters.find(p => p.label === label);
          return param ? param.quantity : "";
        });

        // Combine menu product notes and booking notes into single column
        const noteParts: string[] = [];
        if (menuRow?.product.notes) noteParts.push(menuRow.product.notes);
        if (note) noteParts.push(`${note.authorName}: ${note.content}`);
        const combinedNotes = noteParts.join(" | ");

        const dataRow = worksheet.addRow([
          i === 0 ? booking.tentCount : "",
          i === 0 ? booking.bookingCode : "",
          i === 0 ? booking.bookerName : "",
          menuRow?.isFirstOfTent ? menuRow.tent.itemName : "",
          menuRow?.product.menuItemName || "",
          menuRow?.product.quantity || "",
          ...paramValues,
          combinedNotes
        ]);

        dataRow.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Highlight tent rows
        if (menuRow?.isFirstOfTent) {
          dataRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        }
      }
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kitchen-food-${selectedDate}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success(locale === "vi" ? "Đã xuất Excel" : "Excel exported");
  };

  const handleExportCSV = () => {
    // Get unique parameter labels for dynamic columns
    const allParamLabels = new Set<string>();
    data.forEach(booking => {
      booking.tents.forEach(tent => {
        tent.parameters.forEach(p => allParamLabels.add(p.label));
      });
    });
    const paramLabels = Array.from(allParamLabels);

    const exportCols = [
      { header: tCols("tentCount"), key: "tentCount" },
      { header: tCols("bookingCode"), key: "bookingCode" },
      { header: tCols("booker"), key: "bookerName" },
      { header: tCols("item"), key: "itemName" },
      { header: tCols("menuItem"), key: "menuItemName" },
      { header: tCols("quantity"), key: "quantity" },
      ...paramLabels.map(label => ({ header: label, key: label })),
      { header: tCols("notes"), key: "notes" },
    ];

    // Build export data with expanded rows for booking notes
    const exportData: Record<string, any>[] = [];
    data.forEach((booking) => {
      const menuProductRows: { tent: typeof booking.tents[0]; product: typeof booking.tents[0]['menuProducts'][0]; isFirstOfTent: boolean }[] = [];
      booking.tents.forEach(tent => {
        tent.menuProducts.forEach((product, idx) => {
          menuProductRows.push({ tent, product, isFirstOfTent: idx === 0 });
        });
      });

      const notesCount = booking.notes?.length || 0;
      const maxRows = Math.max(menuProductRows.length, notesCount, 1);

      for (let i = 0; i < maxRows; i++) {
        const menuRow = menuProductRows[i];
        const note = booking.notes?.[i];

        // Combine menu product notes and booking notes into single column
        const noteParts: string[] = [];
        if (menuRow?.product.notes) noteParts.push(menuRow.product.notes);
        if (note) noteParts.push(`${note.authorName}: ${note.content}`);
        const combinedNotes = noteParts.join(" | ");

        const rowData: Record<string, any> = {
          tentCount: i === 0 ? booking.tentCount : "",
          bookingCode: i === 0 ? booking.bookingCode : "",
          bookerName: i === 0 ? booking.bookerName : "",
          itemName: menuRow?.isFirstOfTent ? menuRow.tent.itemName : "",
          menuItemName: menuRow?.product.menuItemName || "",
          quantity: menuRow?.product.quantity || "",
          notes: combinedNotes,
        };
        // Add parameter values
        paramLabels.forEach(label => {
          if (menuRow?.isFirstOfTent) {
            const param = menuRow.tent.parameters.find(p => p.label === label);
            rowData[label] = param ? param.quantity : "";
          } else {
            rowData[label] = "";
          }
        });
        exportData.push(rowData);
      }
    });

    exportToCSV(exportData, exportCols, {
      title: `${t("title")} - ${selectedDate}`,
      filename: `kitchen-food-${selectedDate}`
    });
    toast.success(locale === "vi" ? "Đã xuất CSV" : "CSV exported");
  };

  const handleExportPDF = () => {
    if (!summary) return;

    const currentDate = new Date().toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US");

    // Get unique parameter labels
    const allParamLabels = new Set<string>();
    data.forEach(booking => {
      booking.tents.forEach(tent => {
        tent.parameters.forEach(p => allParamLabels.add(p.label));
      });
    });
    const paramLabels = Array.from(allParamLabels);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>${t("title")} - ${selectedDate}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #333; font-size: 11px; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #EA580C; }
          .title { font-size: 20px; font-weight: bold; color: #1F2937; margin-bottom: 5px; }
          .date { font-size: 14px; color: #EA580C; font-weight: 600; }
          .summary-section { margin-bottom: 20px; }
          .summary-row { display: flex; gap: 30px; margin-bottom: 10px; }
          .summary-item { font-size: 12px; }
          .summary-item strong { color: #EA580C; }
          .section-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px; border-bottom: 1px solid #E5E7EB; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #EA580C; color: white; padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; }
          td { padding: 6px; border: 1px solid #E5E7EB; }
          tr:nth-child(even) { background-color: #FFF7ED; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .bg-orange-light { background-color: #FFEDD5; }
          .bg-yellow { background-color: #FFFBEB; }
          .menu-table { max-width: 400px; }
          .menu-table th { background-color: #F97316; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; display: flex; justify-content: space-between; }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${t("title")}</div>
          <div class="date">${formatDisplayDate(selectedDate)}</div>
        </div>

        <div class="summary-section">
          <div class="summary-row">
            <div class="summary-item">${tSummary("totalTents")}: <strong>${summary.totalTents}</strong></div>
            ${summary.parametersSummary.map(p => `<div class="summary-item">${p.label}: <strong>${p.quantity}</strong></div>`).join('')}
          </div>
        </div>

        <div class="section-title">${tSummary("menuItemsSummary")}</div>
        <table class="menu-table">
          <thead>
            <tr>
              <th>${tCols("menuItem")}</th>
              <th class="text-center" style="width: 80px;">${tCols("quantity")}</th>
            </tr>
          </thead>
          <tbody>
            ${summary.aggregatedMenuItems.map(item => `
              <tr>
                <td>${item.menuItemName}</td>
                <td class="text-center font-bold">${item.totalQuantity}</td>
              </tr>
            `).join('')}
            <tr class="bg-orange-light">
              <td class="font-bold">${locale === "vi" ? "Tổng cộng" : "Total"}</td>
              <td class="text-center font-bold">${summary.aggregatedMenuItems.reduce((sum, item) => sum + item.totalQuantity, 0)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">${locale === "vi" ? "Chi tiết theo Booking" : "Booking Details"}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">${tCols("tentCount")}</th>
              <th style="width: 10%;">${tCols("bookingCode")}</th>
              <th style="width: 10%;">${tCols("booker")}</th>
              <th style="width: 14%;">${tCols("item")}</th>
              <th style="width: 14%;">${tCols("menuItem")}</th>
              <th class="text-center" style="width: 5%;">${tCols("quantity")}</th>
              ${paramLabels.map(label => `<th class="text-center" style="width: 6%;">${label}</th>`).join('')}
              <th>${tCols("notes")}</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              // Build expanded rows for PDF
              const pdfRows: string[] = [];
              data.forEach((booking) => {
                const menuProductRows: { tent: typeof booking.tents[0]; product: typeof booking.tents[0]['menuProducts'][0]; isFirstOfTent: boolean }[] = [];
                booking.tents.forEach(tent => {
                  tent.menuProducts.forEach((product, idx) => {
                    menuProductRows.push({ tent, product, isFirstOfTent: idx === 0 });
                  });
                });

                const notesCount = booking.notes?.length || 0;
                const maxRows = Math.max(menuProductRows.length, notesCount, 1);

                for (let i = 0; i < maxRows; i++) {
                  const menuRow = menuProductRows[i];
                  const note = booking.notes?.[i];

                  // Combine menu product notes and booking notes into single column
                  const noteParts: string[] = [];
                  if (menuRow?.product.notes) noteParts.push(menuRow.product.notes);
                  if (note) noteParts.push(`${note.authorName}: ${note.content}`);
                  const combinedNotes = noteParts.join(' | ');

                  pdfRows.push(`
                    <tr>
                      <td class="text-center">${i === 0 ? booking.tentCount : ''}</td>
                      <td>${i === 0 ? booking.bookingCode : ''}</td>
                      <td>${i === 0 ? booking.bookerName : ''}</td>
                      <td class="${menuRow?.isFirstOfTent ? 'bg-yellow font-bold' : ''}">${menuRow?.isFirstOfTent ? menuRow.tent.itemName : ''}</td>
                      <td>${menuRow?.product.menuItemName || ''}</td>
                      <td class="text-center font-bold">${menuRow?.product.quantity || ''}</td>
                      ${paramLabels.map(label => {
                        if (!menuRow?.isFirstOfTent) return '<td class="text-center"></td>';
                        const param = menuRow.tent.parameters.find(p => p.label === label);
                        return `<td class="text-center">${param ? param.quantity : ''}</td>`;
                      }).join('')}
                      <td>${combinedNotes}</td>
                    </tr>
                  `);
                }
              });
              return pdfRows.join('');
            })()}
          </tbody>
        </table>

        <div class="footer">
          <span>${locale === "vi" ? "Tổng số" : "Total"}: ${data.reduce((sum, b) => sum + Math.max(b.tents.reduce((s, t) => s + t.menuProducts.length, 0), b.notes?.length || 0, 1), 0)} ${locale === "vi" ? "dòng" : "rows"}</span>
          <span>${locale === "vi" ? "Ngày xuất" : "Exported"}: ${currentDate}</span>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      toast.error(locale === "vi" ? "Vui lòng cho phép popup" : "Please allow popups");
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };

    toast.success(locale === "vi" ? "Đang mở PDF..." : "Opening PDF...");
  };

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <ExportDropdown
          onExportExcel={handleExportExcel}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          labelExport={tActions("export")}
          labelExcel={tActions("exportExcel")}
          labelCSV={tActions("exportCSV")}
          labelPDF={locale === "vi" ? "Xuất PDF" : "Export PDF"}
          disabled={loading || flatRows.length === 0}
        />
      </div>

      {/* Date Picker & Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* Date Picker - Left */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{tSummary("date")}</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
              />
            </div>
          </div>

          {/* Summary - Right */}
          {summary && (
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-sm text-gray-500">{tSummary("totalTents")}: </span>
                <span className="font-semibold">{summary.totalTents}</span>
              </div>
              {summary.parametersSummary && summary.parametersSummary.map((param, idx) => (
                <div key={idx}>
                  <span className="text-sm text-gray-500">{param.label}: </span>
                  <span className="font-semibold">{param.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aggregated Menu Items Table */}
        {summary && summary.aggregatedMenuItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{tSummary("menuItemsSummary")}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-[300px] divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">
                      {tCols("menuItem")}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-orange-800 uppercase tracking-wider w-24">
                      {tCols("quantity")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {summary.aggregatedMenuItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-orange-50/50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.menuItemName}
                      </td>
                      <td className="px-4 py-2 text-sm text-center font-semibold text-orange-700">
                        {item.totalQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-100">
                  <tr>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                      {locale === "vi" ? "Tổng cộng" : "Total"}
                    </td>
                    <td className="px-4 py-2 text-sm text-center font-bold text-orange-800">
                      {summary.aggregatedMenuItems.reduce((sum, item) => sum + item.totalQuantity, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Display Date Header */}
      {summary && !loading && (
        <div className="text-center py-2">
          <span className="text-lg font-medium text-gray-700">
            {formatDisplayDate(selectedDate)}
          </span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            {locale === "vi" ? "Đang tải..." : "Loading..."}
          </div>
        ) : flatRows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t("noData")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("tentCount")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("bookingCode")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("booker")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("item")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("guests")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("menuItem")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("quantity")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("notes")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {/* Actions */}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flatRows.map((row, idx) => {
                  const bookingRowSpan = bookingRowCounts.get(row.bookingId) || 1;
                  const tentKey = `${row.bookingId}-${row.itemName}`;
                  // Need to recalculate tent row span based on actual position
                  let tentRowSpan = 1;
                  if (row.isFirstRowOfTent) {
                    // Count consecutive rows for this tent
                    let count = 1;
                    for (let i = idx + 1; i < flatRows.length; i++) {
                      if (flatRows[i].bookingId === row.bookingId && flatRows[i].itemName === row.itemName && !flatRows[i].isFirstRowOfTent) {
                        count++;
                      } else {
                        break;
                      }
                    }
                    tentRowSpan = count;
                  }

                  return (
                    <tr
                      key={idx}
                      className={`${row.isFirstRowOfBooking ? "border-t-2 border-gray-300" : ""}`}
                    >
                      {/* Tent Count - only show for first row of booking */}
                      {row.isFirstRowOfBooking && (
                        <td
                          rowSpan={bookingRowSpan}
                          className="px-4 py-3 text-sm text-gray-900 align-top font-semibold"
                        >
                          {row.tentCount}
                        </td>
                      )}

                      {/* Booking Code - only show for first row of booking */}
                      {row.isFirstRowOfBooking && (
                        <td
                          rowSpan={bookingRowSpan}
                          className="px-4 py-3 text-sm align-top"
                        >
                          <button
                            onClick={() => handleViewBooking(row.bookingId)}
                            className="font-medium text-primary hover:underline"
                          >
                            {row.bookingCode}
                          </button>
                        </td>
                      )}

                      {/* Booker - only show for first row of booking */}
                      {row.isFirstRowOfBooking && (
                        <td
                          rowSpan={bookingRowSpan}
                          className="px-4 py-3 text-sm text-gray-900 align-top"
                        >
                          {row.bookerName}
                        </td>
                      )}

                      {/* Item (Tent) - only show for first row of tent, highlighted */}
                      {row.isFirstRowOfTent && (
                        <td
                          rowSpan={tentRowSpan}
                          className="px-4 py-3 text-sm text-gray-900 align-top bg-yellow-50 font-medium"
                        >
                          {row.itemName}
                        </td>
                      )}

                      {/* Guests (Parameters) - only show for first row of tent */}
                      {row.isFirstRowOfTent && (
                        <td
                          rowSpan={tentRowSpan}
                          className="px-4 py-3 text-sm text-gray-900 align-top"
                        >
                          {row.parameters.map((p, idx) => (
                            <div key={idx}>{p.label}: {p.quantity}</div>
                          ))}
                        </td>
                      )}

                      {/* Menu Item */}
                      <td className="px-4 py-3 text-sm text-gray-900">{row.menuItemName}</td>

                      {/* Quantity */}
                      <td className="px-4 py-3 text-sm text-gray-900 text-center font-semibold">
                        {row.quantity}
                      </td>

                      {/* Notes - combined menu product notes and booking notes icon */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {row.notes && <span className="truncate max-w-[180px]">{row.notes}</span>}
                          {row.isFirstRowOfBooking && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenNotesModal(row.bookingId)}
                              className="relative flex-shrink-0"
                            >
                              <MessageSquare className="h-4 w-4" />
                              {row.bookingNotes.length > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {row.bookingNotes.length}
                                </Badge>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>

                      {/* Actions - only show for first row of booking */}
                      {row.isFirstRowOfBooking && (
                        <td
                          rowSpan={bookingRowSpan}
                          className="px-4 py-3 text-center align-top"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewBooking(row.bookingId)}
                            title={tActions("viewBooking")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      <GlampingBookingDetailModal
        bookingId={selectedBookingId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdate={fetchData}
      />

      {/* Notes Modal */}
      <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tNotesModal("title")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {currentBookingNotes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{tNotesModal("noNotes")}</p>
            ) : (
              <div className="space-y-3">
                {currentBookingNotes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900">{note.authorName}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
