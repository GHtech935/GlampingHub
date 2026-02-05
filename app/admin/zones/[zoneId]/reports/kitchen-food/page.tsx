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
  menuItemUnit: string;
  minGuests: number | null;
  quantity: number;
  adjustedQuantity: number;
  notes: string | null;
}

interface TentParameter {
  label: string;
  quantity: number;
  countedForMenu?: boolean;
}

interface CommonItemRow {
  itemName: string;
  parameterName: string;
  quantity: number;
}

interface AdditionalCost {
  name: string;
  quantity: number;
  notes: string | null;
}

interface TentData {
  tentId: string;
  itemId: string;
  itemName: string;
  parameters: TentParameter[];
  menuProducts: MenuProduct[];
  commonItems: CommonItemRow[];
}

interface BookingData {
  bookingId: string;
  bookingCode: string;
  bookerName: string;
  photoConsent: boolean | null;
  tentCount: number;
  notes: BookingNote[];
  additionalCosts: AdditionalCost[];
  tents: TentData[];
}

interface AggregatedMenuItem {
  menuItemName: string;
  menuItemUnit: string;
  minGuests: number | null;
  totalQuantity: number;
}

interface AggregatedCommonItem {
  itemName: string;
  parameterName: string;
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
  aggregatedCommonItems: AggregatedCommonItem[];
  aggregatedAdditionalCosts: Array<{
    name: string;
    totalQuantity: number;
  }>;
}

interface FlatRow {
  isFirstRowOfBooking: boolean;
  isFirstRowOfTent: boolean;
  isCommonItem: boolean;
  isAdditionalCost: boolean;
  isEmptyTent: boolean;
  bookingId: string;
  bookingCode: string;
  bookerName: string;
  photoConsent: boolean | null;
  tentCount: number;
  itemName: string;
  menuItemName: string;
  menuItemUnit: string;
  minGuests: number | null;
  quantity: number;
  adjustedQuantity: number;
  parameters: TentParameter[];
  notes: string | null;
  bookingNotes: BookingNote[];
  guestCount?: number;
  bookingColorIndex: number;
}

// Soft pastel colors for alternating booking backgrounds
const BOOKING_COLORS = [
  'bg-blue-50',
  'bg-green-50',
  'bg-amber-50',
  'bg-purple-50',
  'bg-pink-50',
  'bg-cyan-50',
];

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
    let bookingColorIndex = 0;

    data.forEach((booking) => {
      let isFirstRowOfBooking = true;
      let isFirstTentInBooking = true;
      const currentColorIndex = bookingColorIndex;
      bookingColorIndex++;

      booking.tents.forEach((tent) => {
        let isFirstRowOfTent = true;
        const hasMenuProducts = tent.menuProducts && tent.menuProducts.length > 0;
        const hasCommonItems = tent.commonItems && tent.commonItems.length > 0;

        if (hasMenuProducts || hasCommonItems) {
          // Process menu products
          tent.menuProducts.forEach((product) => {
            rows.push({
              isFirstRowOfBooking,
              isFirstRowOfTent,
              isCommonItem: false,
              isAdditionalCost: false,
              isEmptyTent: false,
              bookingId: booking.bookingId,
              bookingCode: booking.bookingCode,
              bookerName: booking.bookerName,
              photoConsent: booking.photoConsent,
              tentCount: booking.tentCount,
              itemName: tent.itemName,
              menuItemName: product.menuItemName,
              menuItemUnit: product.menuItemUnit || "",
              minGuests: product.minGuests,
              quantity: product.quantity,
              adjustedQuantity: product.adjustedQuantity,
              parameters: tent.parameters || [],
              notes: product.notes,
              bookingNotes: booking.notes || [],
              bookingColorIndex: currentColorIndex,
            });
            isFirstRowOfBooking = false;
            isFirstRowOfTent = false;
          });

          // Common items after menu products
          (tent.commonItems || []).forEach((ci) => {
            rows.push({
              isFirstRowOfBooking,
              isFirstRowOfTent,
              isCommonItem: true,
              isAdditionalCost: false,
              isEmptyTent: false,
              bookingId: booking.bookingId,
              bookingCode: booking.bookingCode,
              bookerName: booking.bookerName,
              photoConsent: booking.photoConsent,
              tentCount: booking.tentCount,
              itemName: tent.itemName,
              menuItemName: ci.itemName,
              menuItemUnit: ci.parameterName || "",
              minGuests: null,
              quantity: ci.quantity,
              adjustedQuantity: ci.quantity,
              parameters: tent.parameters || [],
              notes: null,
              bookingNotes: booking.notes || [],
              bookingColorIndex: currentColorIndex,
            });
            isFirstRowOfBooking = false;
            isFirstRowOfTent = false;
          });

          // Insert additional costs on first tent, after its products
          if (isFirstTentInBooking && booking.additionalCosts && booking.additionalCosts.length > 0) {
            booking.additionalCosts.forEach((cost) => {
              rows.push({
                isFirstRowOfBooking,
                isFirstRowOfTent: false,
                isCommonItem: false,
                isAdditionalCost: true,
                isEmptyTent: false,
                bookingId: booking.bookingId,
                bookingCode: booking.bookingCode,
                bookerName: booking.bookerName,
                photoConsent: booking.photoConsent,
                tentCount: booking.tentCount,
                itemName: tent.itemName,
                menuItemName: cost.name,
                menuItemUnit: "",
                minGuests: null,
                quantity: cost.quantity,
                adjustedQuantity: cost.quantity,
                parameters: tent.parameters || [],
                notes: cost.notes,
                bookingNotes: booking.notes || [],
                bookingColorIndex: currentColorIndex,
              });
              isFirstRowOfBooking = false;
            });
          }
        } else {
          // Empty tent - no menu products or common items
          const guestCount = (tent.parameters || [])
            .filter(p => p.countedForMenu)
            .reduce((sum, p) => sum + p.quantity, 0);

          rows.push({
            isFirstRowOfBooking,
            isFirstRowOfTent: true,
            isCommonItem: false,
            isAdditionalCost: false,
            isEmptyTent: true,
            bookingId: booking.bookingId,
            bookingCode: booking.bookingCode,
            bookerName: booking.bookerName,
            photoConsent: booking.photoConsent,
            tentCount: booking.tentCount,
            itemName: tent.itemName,
            menuItemName: "",
            menuItemUnit: "",
            minGuests: null,
            quantity: 0,
            adjustedQuantity: 0,
            parameters: tent.parameters || [],
            notes: null,
            bookingNotes: booking.notes || [],
            guestCount,
            bookingColorIndex: currentColorIndex,
          });
          isFirstRowOfBooking = false;

          // Insert additional costs on first (empty) tent
          if (isFirstTentInBooking && booking.additionalCosts && booking.additionalCosts.length > 0) {
            booking.additionalCosts.forEach((cost) => {
              rows.push({
                isFirstRowOfBooking: false,
                isFirstRowOfTent: false,
                isCommonItem: false,
                isAdditionalCost: true,
                isEmptyTent: false,
                bookingId: booking.bookingId,
                bookingCode: booking.bookingCode,
                bookerName: booking.bookerName,
                photoConsent: booking.photoConsent,
                tentCount: booking.tentCount,
                itemName: tent.itemName,
                menuItemName: cost.name,
                menuItemUnit: "",
                minGuests: null,
                quantity: cost.quantity,
                adjustedQuantity: cost.quantity,
                parameters: tent.parameters || [],
                notes: cost.notes,
                bookingNotes: booking.notes || [],
                bookingColorIndex: currentColorIndex,
              });
            });
          }
        }

        isFirstTentInBooking = false;
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
        counts.set(key, tent.menuProducts.length + (tent.commonItems || []).length);
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
    const menuHeaderRow = worksheet.addRow([locale === "vi" ? "MÓN ĂN" : "MENU ITEM", locale === "vi" ? "SL" : "QTY", locale === "vi" ? "ĐƠN VỊ" : "UNIT"]);
    menuHeaderRow.eachCell((cell, colNumber) => {
      if (colNumber <= 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    });
    worksheet.getColumn(1).width = 35;
    worksheet.getColumn(2).width = 10;
    worksheet.getColumn(3).width = 15;

    // Menu items data rows
    summary.aggregatedMenuItems.forEach((item) => {
      const displayUnit = item.minGuests && item.minGuests > 0 ? "combo 1 khách" : (item.menuItemUnit || "");
      const row = worksheet.addRow([item.menuItemName, item.totalQuantity, displayUnit]);
      row.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      row.getCell(2).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      row.getCell(3).alignment = { horizontal: 'center' };
    });

    // Total row
    const totalQty = summary.aggregatedMenuItems.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalRow = worksheet.addRow([locale === "vi" ? "Tổng cộng" : "Total", totalQty, ""]);
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber <= 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };
        cell.font = { bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    });
    totalRow.getCell(2).alignment = { horizontal: 'center' };

    // Empty rows
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Common items summary rows
    if (summary.aggregatedCommonItems && summary.aggregatedCommonItems.length > 0) {
      const ciLabelRow = worksheet.addRow([locale === "vi" ? "ITEM CHUNG" : "COMMON ITEMS", "", ""]);
      ciLabelRow.getCell(1).font = { bold: true, color: { argb: 'FF1D4ED8' } };
      ciLabelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      ciLabelRow.eachCell((cell, colNumber) => {
        if (colNumber <= 3) {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
      });

      summary.aggregatedCommonItems.forEach((item) => {
        const row = worksheet.addRow([item.itemName, item.totalQuantity, item.parameterName || ""]);
        row.getCell(1).font = { color: { argb: 'FF1D4ED8' } };
        row.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        row.getCell(2).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        row.getCell(3).alignment = { horizontal: 'center' };
      });

      // Empty rows after common items
      worksheet.addRow([]);
      worksheet.addRow([]);
    }

    // Additional costs summary rows
    if (summary.aggregatedAdditionalCosts && summary.aggregatedAdditionalCosts.length > 0) {
      const acLabelRow = worksheet.addRow([locale === "vi" ? "CHI PHÍ BỔ SUNG" : "ADDITIONAL COSTS", "", ""]);
      acLabelRow.getCell(1).font = { bold: true, color: { argb: 'FF7C3AED' } };
      acLabelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
      acLabelRow.eachCell((cell, colNumber) => {
        if (colNumber <= 3) {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
      });

      summary.aggregatedAdditionalCosts.forEach((cost) => {
        const row = worksheet.addRow([cost.name, cost.totalQuantity, ""]);
        row.getCell(1).font = { color: { argb: 'FF7C3AED' } };
        row.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        row.getCell(2).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        row.getCell(3).alignment = { horizontal: 'center' };
      });

      // Empty rows after additional costs
      worksheet.addRow([]);
      worksheet.addRow([]);
    }

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
      tCols("booker"),
      tCols("item"),
      tCols("menuItem"),
      tCols("quantity"),
      tCols("unit"),
      ...paramLabels,
      tCols("notes"),
      locale === "vi" ? "Chụp ảnh" : "Photo"
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
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 25;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 8;
    worksheet.getColumn(6).width = 12;
    paramLabels.forEach((_, idx) => {
      worksheet.getColumn(7 + idx).width = 15;
    });
    worksheet.getColumn(7 + paramLabels.length).width = 50;

    // Data rows - expand each booking with notes
    data.forEach((booking) => {
      // Build flat product rows (menu products + common items + additional costs + empty tents) for this booking
      const menuProductRows: { tent: typeof booking.tents[0]; product: { menuItemName: string; menuItemUnit: string; minGuests: number | null; adjustedQuantity: number; notes: string | null; isCommonItem: boolean; isAdditionalCost: boolean; isEmptyTent: boolean; guestCount?: number }; isFirstOfTent: boolean }[] = [];
      let isFirstTentInBooking = true;

      booking.tents.forEach(tent => {
        const hasMenuProducts = tent.menuProducts && tent.menuProducts.length > 0;
        const hasCommonItems = tent.commonItems && tent.commonItems.length > 0;

        if (hasMenuProducts || hasCommonItems) {
          tent.menuProducts.forEach((product, idx) => {
            menuProductRows.push({
              tent,
              product: {
                menuItemName: product.menuItemName,
                menuItemUnit: product.menuItemUnit,
                minGuests: product.minGuests,
                adjustedQuantity: product.adjustedQuantity,
                notes: product.notes,
                isCommonItem: false,
                isAdditionalCost: false,
                isEmptyTent: false
              },
              isFirstOfTent: idx === 0
            });
          });

          // Add common items
          (tent.commonItems || []).forEach((ci, idx) => {
            menuProductRows.push({
              tent,
              product: {
                menuItemName: ci.itemName,
                menuItemUnit: ci.parameterName || "",
                minGuests: null,
                adjustedQuantity: ci.quantity,
                notes: null,
                isCommonItem: true,
                isAdditionalCost: false,
                isEmptyTent: false
              },
              isFirstOfTent: tent.menuProducts.length === 0 && idx === 0
            });
          });

          // Add additional costs on first tent
          if (isFirstTentInBooking && booking.additionalCosts && booking.additionalCosts.length > 0) {
            booking.additionalCosts.forEach((cost) => {
              menuProductRows.push({
                tent,
                product: {
                  menuItemName: cost.name,
                  menuItemUnit: "",
                  minGuests: null,
                  adjustedQuantity: cost.quantity,
                  notes: cost.notes,
                  isCommonItem: false,
                  isAdditionalCost: true,
                  isEmptyTent: false
                },
                isFirstOfTent: false
              });
            });
          }
        } else {
          // Empty tent
          const guestCount = (tent.parameters || [])
            .filter(p => p.countedForMenu)
            .reduce((sum, p) => sum + p.quantity, 0);

          menuProductRows.push({
            tent,
            product: {
              menuItemName: "",
              menuItemUnit: "",
              minGuests: null,
              adjustedQuantity: 0,
              notes: null,
              isCommonItem: false,
              isAdditionalCost: false,
              isEmptyTent: true,
              guestCount
            },
            isFirstOfTent: true
          });

          // Add additional costs on first (empty) tent
          if (isFirstTentInBooking && booking.additionalCosts && booking.additionalCosts.length > 0) {
            booking.additionalCosts.forEach((cost) => {
              menuProductRows.push({
                tent,
                product: {
                  menuItemName: cost.name,
                  menuItemUnit: "",
                  minGuests: null,
                  adjustedQuantity: cost.quantity,
                  notes: cost.notes,
                  isCommonItem: false,
                  isAdditionalCost: true,
                  isEmptyTent: false
                },
                isFirstOfTent: false
              });
            });
          }
        }

        isFirstTentInBooking = false;
      });

      // Update maxRows calculation
      const notesCount = booking.notes?.length || 0;
      const maxRows = Math.max(menuProductRows.length, notesCount, 1);

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

        // Display adjusted quantity and "combo 1 khách" unit if minGuests > 0
        let displayQuantity: string | number = "";
        let displayUnit = "";
        let displayMenuItemName = "";

        if (menuRow?.product.isEmptyTent) {
          displayMenuItemName = locale === "vi" ? `${menuRow.product.guestCount} khách` : `${menuRow.product.guestCount} guests`;
          displayQuantity = "";
          displayUnit = "";
        } else if (menuRow) {
          displayMenuItemName = menuRow.product.menuItemName;
          displayQuantity = menuRow.product.adjustedQuantity;
          displayUnit = menuRow.product.minGuests && menuRow.product.minGuests > 0
            ? "combo 1 khách"
            : (menuRow.product.menuItemUnit || "");
        }

        const photoConsentText = booking.photoConsent ? (locale === "vi" ? "Đồng ý" : "Yes") : (locale === "vi" ? "Không đồng ý" : "No");
        const dataRow = worksheet.addRow([
          i === 0 ? booking.tentCount : "",
          i === 0 ? booking.bookerName : "",
          menuRow?.isFirstOfTent ? menuRow.tent.itemName : "",
          displayMenuItemName,
          displayQuantity,
          displayUnit,
          ...paramValues,
          combinedNotes,
          i === 0 ? photoConsentText : ""
        ]);

        dataRow.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Highlight tent rows
        if (menuRow?.isFirstOfTent) {
          dataRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        }

        // Highlight additional costs with purple
        if (menuRow?.product.isAdditionalCost) {
          dataRow.getCell(4).font = { color: { argb: 'FF7C3AED' }, bold: true };
          dataRow.getCell(5).font = { color: { argb: 'FF7C3AED' }, bold: true };
        }

        // Highlight common items with blue
        if (menuRow?.product.isCommonItem) {
          dataRow.getCell(4).font = { color: { argb: 'FF1D4ED8' } };
          dataRow.getCell(5).font = { color: { argb: 'FF1D4ED8' }, bold: true };
        }

        // Highlight empty tents with gray italic
        if (menuRow?.product.isEmptyTent) {
          dataRow.getCell(4).font = { color: { argb: 'FF9CA3AF' }, italic: true };
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
      { header: tCols("booker"), key: "bookerName" },
      { header: tCols("item"), key: "itemName" },
      { header: tCols("menuItem"), key: "menuItemName" },
      { header: tCols("quantity"), key: "quantity" },
      { header: tCols("unit"), key: "menuItemUnit" },
      ...paramLabels.map(label => ({ header: label, key: label })),
      { header: tCols("notes"), key: "notes" },
      { header: locale === "vi" ? "Chụp ảnh" : "Photo", key: "photoConsent" },
    ];

    // Build export data with expanded rows for booking notes
    const exportData: Record<string, any>[] = [];
    data.forEach((booking) => {
      const menuProductRows: { tent: typeof booking.tents[0]; product: { menuItemName: string; menuItemUnit: string; minGuests: number | null; adjustedQuantity: number; notes: string | null; isCommonItem: boolean; isAdditionalCost: boolean; isEmptyTent: boolean; guestCount?: number }; isFirstOfTent: boolean }[] = [];
      let isFirstTentInBooking = true;

      booking.tents.forEach(tent => {
        const hasMenuProducts = tent.menuProducts && tent.menuProducts.length > 0;
        const hasCommonItems = tent.commonItems && tent.commonItems.length > 0;

        if (hasMenuProducts || hasCommonItems) {
          tent.menuProducts.forEach((product, idx) => {
            menuProductRows.push({
              tent,
              product: {
                menuItemName: product.menuItemName,
                menuItemUnit: product.menuItemUnit,
                minGuests: product.minGuests,
                adjustedQuantity: product.adjustedQuantity,
                notes: product.notes,
                isCommonItem: false,
                isAdditionalCost: false,
                isEmptyTent: false
              },
              isFirstOfTent: idx === 0
            });
          });

          // Add common items
          (tent.commonItems || []).forEach((ci, idx) => {
            menuProductRows.push({
              tent,
              product: {
                menuItemName: ci.itemName,
                menuItemUnit: ci.parameterName || "",
                minGuests: null,
                adjustedQuantity: ci.quantity,
                notes: null,
                isCommonItem: true,
                isAdditionalCost: false,
                isEmptyTent: false
              },
              isFirstOfTent: tent.menuProducts.length === 0 && idx === 0
            });
          });

          // Add additional costs on first tent
          if (isFirstTentInBooking && booking.additionalCosts && booking.additionalCosts.length > 0) {
            booking.additionalCosts.forEach((cost) => {
              menuProductRows.push({
                tent,
                product: {
                  menuItemName: cost.name,
                  menuItemUnit: "",
                  minGuests: null,
                  adjustedQuantity: cost.quantity,
                  notes: cost.notes,
                  isCommonItem: false,
                  isAdditionalCost: true,
                  isEmptyTent: false
                },
                isFirstOfTent: false
              });
            });
          }
        } else {
          // Empty tent
          const guestCount = (tent.parameters || [])
            .filter(p => p.countedForMenu)
            .reduce((sum, p) => sum + p.quantity, 0);

          menuProductRows.push({
            tent,
            product: {
              menuItemName: "",
              menuItemUnit: "",
              minGuests: null,
              adjustedQuantity: 0,
              notes: null,
              isCommonItem: false,
              isAdditionalCost: false,
              isEmptyTent: true,
              guestCount
            },
            isFirstOfTent: true
          });

          // Add additional costs on first (empty) tent
          if (isFirstTentInBooking && booking.additionalCosts && booking.additionalCosts.length > 0) {
            booking.additionalCosts.forEach((cost) => {
              menuProductRows.push({
                tent,
                product: {
                  menuItemName: cost.name,
                  menuItemUnit: "",
                  minGuests: null,
                  adjustedQuantity: cost.quantity,
                  notes: cost.notes,
                  isCommonItem: false,
                  isAdditionalCost: true,
                  isEmptyTent: false
                },
                isFirstOfTent: false
              });
            });
          }
        }

        isFirstTentInBooking = false;
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

        // Display adjusted quantity and "combo 1 khách" unit if minGuests > 0
        let displayQuantity: string | number = "";
        let displayUnit = "";
        let displayMenuItemName = "";

        if (menuRow?.product.isEmptyTent) {
          displayMenuItemName = locale === "vi" ? `${menuRow.product.guestCount} khách` : `${menuRow.product.guestCount} guests`;
          displayQuantity = "";
          displayUnit = "";
        } else if (menuRow?.product.isAdditionalCost) {
          displayMenuItemName = `${menuRow.product.menuItemName} (${locale === "vi" ? "Chi phí bổ sung" : "Additional cost"})`;
          displayQuantity = menuRow.product.adjustedQuantity;
          displayUnit = "";
        } else if (menuRow) {
          displayMenuItemName = menuRow.product.menuItemName;
          displayQuantity = menuRow.product.adjustedQuantity;
          displayUnit = menuRow.product.minGuests && menuRow.product.minGuests > 0
            ? "combo 1 khách"
            : (menuRow.product.menuItemUnit || "");
        }

        const photoConsentText = booking.photoConsent ? (locale === "vi" ? "Đồng ý" : "Yes") : (locale === "vi" ? "Không đồng ý" : "No");
        const rowData: Record<string, any> = {
          tentCount: i === 0 ? booking.tentCount : "",
          bookerName: i === 0 ? booking.bookerName : "",
          itemName: menuRow?.isFirstOfTent ? menuRow.tent.itemName : "",
          menuItemName: displayMenuItemName,
          quantity: displayQuantity,
          menuItemUnit: displayUnit,
          notes: combinedNotes,
          photoConsent: i === 0 ? photoConsentText : "",
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
          .bg-blue-light { background-color: #DBEAFE; }
          .text-blue { color: #1D4ED8; }
          .bg-purple-light { background-color: #F3E8FF; }
          .text-purple { color: #7C3AED; }
          .text-gray-light { color: #9CA3AF; }
          .menu-table { max-width: 400px; }
          .menu-table th { background-color: #F97316; }
          .common-table { max-width: 400px; }
          .common-table th { background-color: #3B82F6; }
          .notes-cell { max-width: 200px; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; font-size: 9px; line-height: 1.3; }
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
              <th class="text-center" style="width: 80px;">${tCols("unit")}</th>
            </tr>
          </thead>
          <tbody>
            ${summary.aggregatedMenuItems.map(item => {
              const displayUnit = item.minGuests && item.minGuests > 0 ? "combo 1 khách" : (item.menuItemUnit || '');
              return `
              <tr>
                <td>${item.menuItemName}</td>
                <td class="text-center font-bold">${item.totalQuantity}</td>
                <td class="text-center">${displayUnit}</td>
              </tr>
            `;}).join('')}
            <tr class="bg-orange-light">
              <td class="font-bold">${locale === "vi" ? "Tổng cộng" : "Total"}</td>
              <td class="text-center font-bold">${summary.aggregatedMenuItems.reduce((sum, item) => sum + item.totalQuantity, 0)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        ${summary.aggregatedCommonItems && summary.aggregatedCommonItems.length > 0 ? `
        <div class="section-title text-blue">${locale === "vi" ? "Item chung" : "Common Items"}</div>
        <table class="common-table">
          <thead>
            <tr>
              <th>${tCols("menuItem")}</th>
              <th class="text-center" style="width: 80px;">${tCols("quantity")}</th>
              <th class="text-center" style="width: 80px;">${tCols("unit")}</th>
            </tr>
          </thead>
          <tbody>
            ${summary.aggregatedCommonItems.map(item => `
              <tr>
                <td class="text-blue">${item.itemName}</td>
                <td class="text-center font-bold text-blue">${item.totalQuantity}</td>
                <td class="text-center">${item.parameterName || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        ${summary.aggregatedAdditionalCosts && summary.aggregatedAdditionalCosts.length > 0 ? `
        <div class="section-title text-purple">${locale === "vi" ? "Chi phí bổ sung" : "Additional Costs"}</div>
        <table class="common-table">
          <thead>
            <tr>
              <th>${locale === "vi" ? "Tên chi phí" : "Cost Name"}</th>
              <th class="text-center" style="width: 80px;">${tCols("quantity")}</th>
            </tr>
          </thead>
          <tbody>
            ${summary.aggregatedAdditionalCosts.map(cost => `
              <tr>
                <td class="text-purple">${cost.name}</td>
                <td class="text-center font-bold text-purple">${cost.totalQuantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        <div class="section-title">${locale === "vi" ? "Chi tiết theo Booking" : "Booking Details"}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 4%;">${tCols("tentCount")}</th>
              <th style="width: 10%;">${tCols("booker")}</th>
              <th style="width: 10%;">${tCols("item")}</th>
              <th style="width: 12%;">${tCols("menuItem")}</th>
              <th class="text-center" style="width: 4%;">${tCols("quantity")}</th>
              <th class="text-center" style="width: 8%;">${tCols("unit")}</th>
              ${paramLabels.map(label => `<th class="text-center" style="width: 5%;">${label}</th>`).join('')}
              <th style="width: 20%;">${tCols("notes")}</th>
              <th class="text-center" style="width: 5%;">${locale === "vi" ? "Chụp ảnh" : "Photo"}</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              // Build expanded rows for PDF
              const pdfRows: string[] = [];
              data.forEach((booking) => {
                const menuProductRows: { tent: typeof booking.tents[0]; product: { menuItemName: string; menuItemUnit: string; minGuests: number | null; adjustedQuantity: number; notes: string | null; isCommonItem: boolean; isAdditionalCost: boolean; isEmptyTent: boolean; guestCount?: number }; isFirstOfTent: boolean }[] = [];
                let isFirstTentInBooking = true;

                booking.tents.forEach(tent => {
                  const hasMenuProducts = tent.menuProducts && tent.menuProducts.length > 0;
                  const hasCommonItems = tent.commonItems && tent.commonItems.length > 0;

                  if (hasMenuProducts || hasCommonItems) {
                    tent.menuProducts.forEach((product, idx) => {
                      menuProductRows.push({
                        tent,
                        product: {
                          menuItemName: product.menuItemName,
                          menuItemUnit: product.menuItemUnit,
                          minGuests: product.minGuests,
                          adjustedQuantity: product.adjustedQuantity,
                          notes: product.notes,
                          isCommonItem: false,
                          isAdditionalCost: false,
                          isEmptyTent: false
                        },
                        isFirstOfTent: idx === 0
                      });
                    });

                    // Add common items
                    (tent.commonItems || []).forEach((ci, idx) => {
                      menuProductRows.push({
                        tent,
                        product: {
                          menuItemName: ci.itemName,
                          menuItemUnit: ci.parameterName || "",
                          minGuests: null,
                          adjustedQuantity: ci.quantity,
                          notes: null,
                          isCommonItem: true,
                          isAdditionalCost: false,
                          isEmptyTent: false
                        },
                        isFirstOfTent: tent.menuProducts.length === 0 && idx === 0
                      });
                    });

                    // Add additional costs on first tent
                    if (isFirstTentInBooking && booking.additionalCosts && booking.additionalCosts.length > 0) {
                      booking.additionalCosts.forEach((cost) => {
                        menuProductRows.push({
                          tent,
                          product: {
                            menuItemName: cost.name,
                            menuItemUnit: "",
                            minGuests: null,
                            adjustedQuantity: cost.quantity,
                            notes: cost.notes,
                            isCommonItem: false,
                            isAdditionalCost: true,
                            isEmptyTent: false
                          },
                          isFirstOfTent: false
                        });
                      });
                    }
                  } else {
                    // Empty tent
                    const guestCount = (tent.parameters || [])
                      .filter(p => p.countedForMenu)
                      .reduce((sum, p) => sum + p.quantity, 0);

                    menuProductRows.push({
                      tent,
                      product: {
                        menuItemName: "",
                        menuItemUnit: "",
                        minGuests: null,
                        adjustedQuantity: 0,
                        notes: null,
                        isCommonItem: false,
                        isAdditionalCost: false,
                        isEmptyTent: true,
                        guestCount
                      },
                      isFirstOfTent: true
                    });

                    // Add additional costs on first (empty) tent
                    if (isFirstTentInBooking && booking.additionalCosts && booking.additionalCosts.length > 0) {
                      booking.additionalCosts.forEach((cost) => {
                        menuProductRows.push({
                          tent,
                          product: {
                            menuItemName: cost.name,
                            menuItemUnit: "",
                            minGuests: null,
                            adjustedQuantity: cost.quantity,
                            notes: cost.notes,
                            isCommonItem: false,
                            isAdditionalCost: true,
                            isEmptyTent: false
                          },
                          isFirstOfTent: false
                        });
                      });
                    }
                  }

                  isFirstTentInBooking = false;
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

                  // Display adjusted quantity and "combo 1 khách" unit if minGuests > 0
                  let displayQuantity = '';
                  let displayUnit = '';
                  let displayMenuItemName = '';
                  let menuItemClass = '';

                  if (menuRow?.product.isEmptyTent) {
                    displayMenuItemName = locale === "vi" ? `${menuRow.product.guestCount} khách` : `${menuRow.product.guestCount} guests`;
                    displayQuantity = '';
                    displayUnit = '';
                    menuItemClass = 'text-gray-light';
                  } else if (menuRow?.product.isAdditionalCost) {
                    displayMenuItemName = menuRow.product.menuItemName;
                    displayQuantity = String(menuRow.product.adjustedQuantity);
                    displayUnit = '';
                    menuItemClass = 'text-purple font-bold';
                  } else if (menuRow?.product.isCommonItem) {
                    displayMenuItemName = menuRow.product.menuItemName;
                    displayQuantity = String(menuRow.product.adjustedQuantity);
                    displayUnit = menuRow.product.menuItemUnit;
                    menuItemClass = 'text-blue';
                  } else if (menuRow) {
                    displayMenuItemName = menuRow.product.menuItemName;
                    displayQuantity = String(menuRow.product.adjustedQuantity);
                    displayUnit = menuRow.product.minGuests && menuRow.product.minGuests > 0
                      ? "combo 1 khách"
                      : (menuRow.product.menuItemUnit || '');
                    menuItemClass = '';
                  }

                  const photoConsentText = booking.photoConsent ? (locale === "vi" ? "Đồng ý" : "Yes") : (locale === "vi" ? "Không đồng ý" : "No");
                  // Truncate long notes for PDF
                  const truncatedNotes = combinedNotes.length > 150
                    ? combinedNotes.substring(0, 150) + '...'
                    : combinedNotes;
                  pdfRows.push(`
                    <tr>
                      <td class="text-center">${i === 0 ? booking.tentCount : ''}</td>
                      <td>${i === 0 ? booking.bookerName : ''}</td>
                      <td class="${menuRow?.isFirstOfTent ? 'bg-yellow font-bold' : ''}">${menuRow?.isFirstOfTent ? menuRow.tent.itemName : ''}</td>
                      <td class="${menuItemClass}">${displayMenuItemName}</td>
                      <td class="text-center font-bold ${menuItemClass}">${displayQuantity}</td>
                      <td class="text-center">${displayUnit}</td>
                      ${paramLabels.map(label => {
                        if (!menuRow?.isFirstOfTent) return '<td class="text-center"></td>';
                        const param = menuRow.tent.parameters.find(p => p.label === label);
                        return `<td class="text-center">${param ? param.quantity : ''}</td>`;
                      }).join('')}
                      <td class="notes-cell">${truncatedNotes}</td>
                      <td class="text-center">${i === 0 ? photoConsentText : ''}</td>
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
                    <th className="px-4 py-2 text-center text-xs font-medium text-orange-800 uppercase tracking-wider w-24">
                      {tCols("unit")}
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
                      <td className="px-4 py-2 text-sm text-center text-gray-600 whitespace-nowrap">
                        {item.minGuests && item.minGuests > 0 ? "combo 1 khách" : item.menuItemUnit}
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
                    <td className="px-4 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Aggregated Common Items Table */}
        {summary && summary.aggregatedCommonItems && summary.aggregatedCommonItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-blue-700 mb-3">{locale === "vi" ? "Item chung" : "Common Items"}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-[300px] divide-y divide-gray-200 border border-blue-200 rounded-lg overflow-hidden">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                      {tCols("menuItem")}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-blue-800 uppercase tracking-wider w-24">
                      {tCols("quantity")}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-blue-800 uppercase tracking-wider w-24">
                      {tCols("unit")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {summary.aggregatedCommonItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/50">
                      <td className="px-4 py-2 text-sm text-blue-900">
                        {item.itemName}
                      </td>
                      <td className="px-4 py-2 text-sm text-center font-semibold text-blue-700">
                        {item.totalQuantity}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-gray-600 whitespace-nowrap">
                        {item.parameterName || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Aggregated Additional Costs Table */}
        {summary && summary.aggregatedAdditionalCosts && summary.aggregatedAdditionalCosts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-purple-700 mb-3">{locale === "vi" ? "Chi phí bổ sung" : "Additional Costs"}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-[300px] divide-y divide-gray-200 border border-purple-200 rounded-lg overflow-hidden">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                      {locale === "vi" ? "Tên chi phí" : "Cost Name"}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-purple-800 uppercase tracking-wider w-24">
                      {tCols("quantity")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {summary.aggregatedAdditionalCosts.map((cost, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/50">
                      <td className="px-4 py-2 text-sm text-purple-900">
                        {cost.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-center font-semibold text-purple-700">
                        {cost.totalQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
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
            <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("tentCount")}
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
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("unit")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCols("notes")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {locale === "vi" ? "Xem" : "View"}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {locale === "vi" ? "Chụp ảnh" : "Photo"}
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

                  // Get booking background color
                  const bookingBgColor = BOOKING_COLORS[row.bookingColorIndex % BOOKING_COLORS.length];

                  return (
                    <tr
                      key={idx}
                      className={`${row.isFirstRowOfBooking ? "border-t-2 border-gray-300" : ""} ${bookingBgColor}`}
                    >
                      {/* Tent Count - only show for first row of booking */}
                      {row.isFirstRowOfBooking && (
                        <td
                          rowSpan={bookingRowSpan}
                          className={`px-4 py-3 text-sm text-gray-900 align-top font-semibold ${bookingBgColor}`}
                        >
                          {row.tentCount}
                        </td>
                      )}

                      {/* Booker - only show for first row of booking */}
                      {row.isFirstRowOfBooking && (
                        <td
                          rowSpan={bookingRowSpan}
                          className={`px-4 py-3 text-sm text-gray-900 align-top ${bookingBgColor}`}
                        >
                          {row.bookerName}
                        </td>
                      )}

                      {/* Item (Tent) - only show for first row of tent, highlighted */}
                      {row.isFirstRowOfTent && (
                        <td
                          rowSpan={tentRowSpan}
                          className={`px-4 py-3 text-sm text-gray-900 align-top font-medium ${bookingBgColor}`}
                        >
                          {row.itemName}
                        </td>
                      )}

                      {/* Guests (Parameters) - only show for first row of tent */}
                      {row.isFirstRowOfTent && (
                        <td
                          rowSpan={tentRowSpan}
                          className={`px-4 py-3 text-sm text-gray-900 align-top ${bookingBgColor}`}
                        >
                          {row.parameters.map((p, idx) => (
                            <div key={idx}>{p.label}: {p.quantity}</div>
                          ))}
                        </td>
                      )}

                      {/* Menu Item */}
                      <td className={`px-4 py-3 text-sm ${bookingBgColor} ${
                        row.isAdditionalCost ? 'text-purple-700 font-medium' :
                        row.isCommonItem ? 'text-blue-700' :
                        row.isEmptyTent ? 'text-gray-400 italic' :
                        'text-gray-900'
                      }`}>
                        {row.isEmptyTent ? (
                          <span>{locale === "vi" ? `${row.guestCount} khách` : `${row.guestCount} guests`}</span>
                        ) : (
                          <>
                            {row.menuItemName}
                            {row.isAdditionalCost && (
                              <span className="text-xs text-purple-500 ml-2">
                                ({locale === "vi" ? "Chi phí bổ sung" : "Additional cost"})
                              </span>
                            )}
                          </>
                        )}
                      </td>

                      {/* Quantity - display adjusted quantity */}
                      <td className={`px-4 py-3 text-sm text-center font-semibold ${bookingBgColor} ${
                        row.isAdditionalCost ? 'text-purple-700' :
                        row.isCommonItem ? 'text-blue-700' :
                        row.isEmptyTent ? 'text-gray-400' :
                        'text-gray-900'
                      }`}>
                        {row.isEmptyTent ? '' : row.adjustedQuantity}
                      </td>

                      {/* Unit - display "combo 1 khách" if minGuests > 0 */}
                      <td className={`px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap ${bookingBgColor}`}>
                        {row.isEmptyTent ? '' : (row.minGuests && row.minGuests > 0 ? "combo 1 khách" : row.menuItemUnit)}
                      </td>

                      {/* Notes - combined menu product notes and booking notes icon */}
                      <td className={`px-4 py-3 text-sm text-gray-500 ${bookingBgColor}`}>
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
                          className={`px-4 py-3 text-center align-top ${bookingBgColor}`}
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

                      {/* Photo Consent - only show for first row of booking */}
                      {row.isFirstRowOfBooking && (
                        <td
                          rowSpan={bookingRowSpan}
                          className={`px-4 py-3 text-center align-top text-sm ${bookingBgColor} ${
                            row.photoConsent ? "text-green-600 font-medium" : "text-gray-500"
                          }`}
                        >
                          {row.photoConsent ? (locale === "vi" ? "Đồng ý" : "Yes") : (locale === "vi" ? "Không đồng ý" : "No")}
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
