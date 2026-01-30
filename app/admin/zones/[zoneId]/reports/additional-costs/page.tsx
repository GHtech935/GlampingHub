"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReportDataTable, type ColumnDef } from "@/components/admin/reports/ReportDataTable";
import { ExportDropdown } from "@/components/admin/reports/ExportDropdown";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";
import { GlampingBookingDetailModal } from "@/components/admin/glamping/GlampingBookingDetailModal";

interface AdditionalCostRow {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount: number;
  notes: string | null;
  createdAt: string;
  booking: {
    id: string;
    bookingCode: string;
    customerName: string | null;
    customerPhone: string | null;
  };
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  bookingCode: string;
}

export default function AdditionalCostsReportPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const t = useTranslations("admin.reportAdditionalCosts");
  const tCols = useTranslations("admin.reportAdditionalCosts.columns");
  const tActions = useTranslations("admin.reportAdditionalCosts.actions");
  const { locale } = useAdminLocale();

  const [data, setData] = useState<AdditionalCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: "",
    dateTo: "",
    bookingCode: "",
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [summary, setSummary] = useState({ totalCount: 0, totalAmount: 0 });

  // Booking detail modal state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fmtCur = useCallback((val: number) => formatCurrency(val, locale), [locale]);
  const fmtDateTime = useCallback(
    (val: string) =>
      val
        ? formatDate(val, locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
    [locale]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        zoneId,
        page: String(page),
        limit: "50",
      });
      if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) p.set("dateTo", filters.dateTo);
      if (filters.bookingCode) p.set("bookingCode", filters.bookingCode);

      const res = await fetch(`/api/admin/glamping/reports/additional-costs?${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json.data || []);
      setPagination(json.pagination || { page: 1, limit: 50, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
      setSummary(json.summary || { totalCount: 0, totalAmount: 0 });
    } catch {
      toast.error(locale === "vi" ? "Không thể tải dữ liệu" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [zoneId, page, filters, locale]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters({ dateFrom: "", dateTo: "", bookingCode: "" });
    setPage(1);
  };

  const handleViewBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedBookingId(null);
    setIsDetailModalOpen(false);
  };

  const columns: ColumnDef<AdditionalCostRow>[] = useMemo(
    () => [
      {
        key: "index",
        header: tCols("index"),
        render: (_, index) => (page - 1) * pagination.limit + index + 1,
      },
      {
        key: "createdAt",
        header: tCols("createdAt"),
        render: (row) => fmtDateTime(row.createdAt),
      },
      {
        key: "bookingCode",
        header: tCols("bookingCode"),
        render: (row) => (
          <button
            onClick={() => handleViewBooking(row.booking.id)}
            className="font-medium text-primary hover:underline"
          >
            {row.booking.bookingCode}
          </button>
        ),
      },
      {
        key: "customer",
        header: tCols("customer"),
        render: (row) => (
          <div>
            <div className="font-medium">{row.booking.customerName || "-"}</div>
            {row.booking.customerPhone && (
              <div className="text-xs text-gray-500">{row.booking.customerPhone}</div>
            )}
          </div>
        ),
      },
      {
        key: "name",
        header: tCols("name"),
        render: (row) => row.name,
      },
      {
        key: "quantity",
        header: tCols("quantity"),
        align: "center",
        render: (row) => row.quantity,
      },
      {
        key: "unitPrice",
        header: tCols("unitPrice"),
        align: "right",
        render: (row) => fmtCur(row.unitPrice),
      },
      {
        key: "totalPrice",
        header: tCols("totalPrice"),
        align: "right",
        render: (row) => (
          <span className="font-semibold">{fmtCur(row.totalPrice + row.taxAmount)}</span>
        ),
      },
      {
        key: "notes",
        header: tCols("notes"),
        render: (row) => (
          <span className="text-gray-500 truncate max-w-[150px] inline-block">
            {row.notes || "-"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "center",
        render: (row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewBooking(row.booking.id)}
            title={tActions("viewBooking")}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [tCols, tActions, fmtCur, fmtDateTime, page, pagination.limit]
  );

  const handleExportExcel = async () => {
    const exportCols = [
      { header: tCols("index"), key: "index", width: 8 },
      { header: tCols("createdAt"), key: "createdAt", width: 20 },
      { header: tCols("bookingCode"), key: "bookingCode", width: 16 },
      { header: tCols("customer"), key: "customerName", width: 20 },
      { header: locale === "vi" ? "SĐT" : "Phone", key: "customerPhone", width: 15 },
      { header: tCols("name"), key: "name", width: 25 },
      { header: tCols("quantity"), key: "quantity", width: 10 },
      { header: tCols("unitPrice"), key: "unitPrice", width: 15 },
      { header: tCols("totalPrice"), key: "totalPrice", width: 15 },
      { header: tCols("notes"), key: "notes", width: 25 },
    ];
    const exportData = data.map((row, index) => ({
      index: index + 1,
      createdAt: fmtDateTime(row.createdAt),
      bookingCode: row.booking.bookingCode,
      customerName: row.booking.customerName || "",
      customerPhone: row.booking.customerPhone || "",
      name: row.name,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice + row.taxAmount,
      notes: row.notes || "",
    }));
    await exportToExcel(exportData, exportCols, { title: t("title"), filename: "additional-costs" });
    toast.success(locale === "vi" ? "Đã xuất Excel" : "Excel exported");
  };

  const handleExportCSV = () => {
    const exportCols = [
      { header: tCols("index"), key: "index" },
      { header: tCols("createdAt"), key: "createdAt" },
      { header: tCols("bookingCode"), key: "bookingCode" },
      { header: tCols("customer"), key: "customerName" },
      { header: locale === "vi" ? "SĐT" : "Phone", key: "customerPhone" },
      { header: tCols("name"), key: "name" },
      { header: tCols("quantity"), key: "quantity" },
      { header: tCols("unitPrice"), key: "unitPrice" },
      { header: tCols("totalPrice"), key: "totalPrice" },
      { header: tCols("notes"), key: "notes" },
    ];
    const exportData = data.map((row, index) => ({
      index: index + 1,
      createdAt: row.createdAt || "",
      bookingCode: row.booking.bookingCode,
      customerName: row.booking.customerName || "",
      customerPhone: row.booking.customerPhone || "",
      name: row.name,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice + row.taxAmount,
      notes: row.notes || "",
    }));
    exportToCSV(exportData, exportCols, { title: t("title"), filename: "additional-costs" });
    toast.success(locale === "vi" ? "Đã xuất CSV" : "CSV exported");
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
          labelExport={tActions("export")}
          labelExcel={tActions("exportExcel")}
          labelCSV={tActions("exportCSV")}
          disabled={loading || data.length === 0}
        />
      </div>

      {/* Filter Bar & Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* Filters - Left */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{t("filters.dateFrom")}</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{t("filters.dateTo")}</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{t("filters.bookingCode")}</label>
              <Input
                type="text"
                placeholder={t("filters.bookingCodePlaceholder")}
                value={filters.bookingCode}
                onChange={(e) => handleFilterChange("bookingCode", e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" onClick={handleReset}>
              {t("filters.reset")}
            </Button>
          </div>

          {/* Summary - Right */}
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-sm text-gray-500">{t("summary.totalCount")}: </span>
              <span className="font-semibold">{summary.totalCount}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t("summary.totalAmount")}: </span>
              <span className="font-semibold text-primary">{fmtCur(summary.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <ReportDataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage={t("noData")}
        getRowId={(row) => row.id}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-600">
            {locale === "vi"
              ? `Trang ${pagination.page} / ${pagination.totalPages} (${pagination.total} kết quả)`
              : `Page ${pagination.page} / ${pagination.totalPages} (${pagination.total} results)`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  className="w-9"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      <GlampingBookingDetailModal
        bookingId={selectedBookingId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdate={fetchData}
      />
    </div>
  );
}
