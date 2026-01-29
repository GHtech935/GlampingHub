"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";
import { ReportFilterBar, type BookingIndexFilters } from "@/components/admin/reports/ReportFilterBar";
import { ReportDataTable, type ColumnDef } from "@/components/admin/reports/ReportDataTable";
import { ColumnTogglePopover } from "@/components/admin/reports/ColumnTogglePopover";
import { ExportDropdown } from "@/components/admin/reports/ExportDropdown";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";

interface BookingRow {
  id: string;
  bookingCode: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalGuests: number;
  totalAmount: number;
  discountAmount: number;
  currency: string;
  referralSource: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
  };
  item: { id: string; name: any };
  category: { id: string; name: any };
  zone: { id: string; name: any };
  staff: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  checked_in: "bg-blue-100 text-blue-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  deposit_paid: "bg-blue-100 text-blue-800",
  fully_paid: "bg-green-100 text-green-800",
  refund_pending: "bg-orange-100 text-orange-800",
  refunded: "bg-purple-100 text-purple-800",
  no_refund: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
};

const DEFAULT_FILTERS: BookingIndexFilters = {
  dateSource: "created",
  dateRange: "all_time",
  dateFrom: "",
  dateTo: "",
  categoryId: "",
  tagId: "",
  itemId: "",
  status: "",
  source: "",
  search: "",
};

export default function BookingIndexPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const t = useTranslations("admin.reportBookingIndex");
  const tFilters = useTranslations("admin.reportBookingIndex.filters");
  const tCols = useTranslations("admin.reportBookingIndex.columns");
  const tActions = useTranslations("admin.reportBookingIndex.actions");
  const { locale } = useAdminLocale();

  const [data, setData] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BookingIndexFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, total: 0, limit: 50, hasNextPage: false, hasPreviousPage: false });
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(["email", "phone", "referral", "zone", "guests", "staff"]));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getItemName = useCallback((name: any): string => {
    if (!name) return "-";
    if (typeof name === "object") return getLocalizedText(name as MultilingualText, locale);
    return name;
  }, [locale]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        zoneId,
        page: String(page),
        limit: "50",
        sortBy,
        sortOrder: sortOrder.toUpperCase(),
        dateSource: filters.dateSource,
        dateRange: filters.dateRange,
      });
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.tagId) params.set("tagId", filters.tagId);
      if (filters.itemId) params.set("itemId", filters.itemId);
      if (filters.status) params.set("status", filters.status);
      if (filters.source) params.set("source", filters.source);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/admin/glamping/reports/booking-index?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json.data || []);
      setPagination(json.pagination || { currentPage: 1, totalPages: 0, total: 0, limit: 50, hasNextPage: false, hasPreviousPage: false });
      setFilterOptions(json.filterOptions || {});
    } catch {
      toast.error("Failed to load booking index");
    } finally {
      setLoading(false);
    }
  }, [zoneId, page, sortBy, sortOrder, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const columns: ColumnDef<BookingRow>[] = useMemo(() => [
    {
      key: "bookingCode",
      header: tCols("bookingCode"),
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-primary">{row.bookingCode}</div>
          <div className="text-xs text-gray-500 truncate max-w-[120px]">{getItemName(row.item?.name)}</div>
        </div>
      ),
    },
    {
      key: "checkInDate",
      header: tCols("checkIn"),
      sortable: true,
      render: (row) => row.checkInDate ? formatDate(row.checkInDate, locale, { day: "2-digit", month: "short", year: "numeric" }) : "-",
    },
    {
      key: "checkOutDate",
      header: tCols("checkOut"),
      sortable: true,
      render: (row) => row.checkOutDate ? formatDate(row.checkOutDate, locale, { day: "2-digit", month: "short", year: "numeric" }) : "-",
    },
    {
      key: "nights",
      header: tCols("nights"),
      align: "center",
      render: (row) => row.nights || "-",
    },
    {
      key: "customer",
      header: tCols("customer"),
      render: (row) => row.customer?.fullName || "-",
    },
    {
      key: "totalAmount",
      header: tCols("totalAmount"),
      align: "right",
      sortable: true,
      render: (row) => formatCurrency(row.totalAmount, locale),
    },
    {
      key: "status",
      header: tCols("status"),
      sortable: true,
      render: (row) => (
        <Badge className={`${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-800"} text-xs`}>
          {row.status?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "paymentStatus",
      header: tCols("paymentStatus"),
      render: (row) => (
        <Badge className={`${PAYMENT_COLORS[row.paymentStatus] || "bg-gray-100 text-gray-800"} text-xs`}>
          {row.paymentStatus?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: tCols("createdAt"),
      sortable: true,
      render: (row) => row.createdAt ? formatDate(row.createdAt, locale, { day: "2-digit", month: "short", year: "numeric" }) : "-",
      hidden: hiddenColumns.has("createdAt"),
    },
    {
      key: "referral",
      header: tCols("referral"),
      render: (row) => row.referralSource || "-",
      hidden: hiddenColumns.has("referral"),
    },
    {
      key: "email",
      header: tCols("email"),
      render: (row) => row.customer?.email || "-",
      hidden: hiddenColumns.has("email"),
    },
    {
      key: "phone",
      header: tCols("phone"),
      render: (row) => row.customer?.phone || "-",
      hidden: hiddenColumns.has("phone"),
    },
    {
      key: "zone",
      header: tCols("zone"),
      render: (row) => getItemName(row.zone?.name) || "-",
      hidden: hiddenColumns.has("zone"),
    },
    {
      key: "guests",
      header: tCols("guests"),
      align: "center",
      render: (row) => row.totalGuests || "-",
      hidden: hiddenColumns.has("guests"),
    },
    {
      key: "staff",
      header: tCols("staff"),
      render: (row) => row.staff || "-",
      hidden: hiddenColumns.has("staff"),
    },
  ], [tCols, locale, hiddenColumns, getItemName]);

  const handleExportExcel = async () => {
    const exportCols = columns.filter(c => !c.hidden).map(c => ({ header: c.header, key: c.key, width: 18 }));
    const exportData = data.map(row => ({
      bookingCode: row.bookingCode,
      checkInDate: row.checkInDate ? formatDate(row.checkInDate, locale) : "",
      checkOutDate: row.checkOutDate ? formatDate(row.checkOutDate, locale) : "",
      nights: row.nights,
      customer: row.customer?.fullName || "",
      totalAmount: row.totalAmount,
      status: row.status,
      paymentStatus: row.paymentStatus,
      createdAt: row.createdAt ? formatDate(row.createdAt, locale) : "",
      referral: row.referralSource || "",
      email: row.customer?.email || "",
      phone: row.customer?.phone || "",
      zone: getItemName(row.zone?.name),
      guests: row.totalGuests,
      staff: row.staff || "",
    }));
    await exportToExcel(exportData, exportCols, { title: t("title"), filename: "booking-index" });
    toast.success("Excel exported");
  };

  const handleExportCSV = () => {
    const exportCols = columns.filter(c => !c.hidden).map(c => ({ header: c.header, key: c.key }));
    const exportData = data.map(row => ({
      bookingCode: row.bookingCode,
      checkInDate: row.checkInDate || "",
      checkOutDate: row.checkOutDate || "",
      nights: row.nights,
      customer: row.customer?.fullName || "",
      totalAmount: row.totalAmount,
      status: row.status,
      paymentStatus: row.paymentStatus,
      createdAt: row.createdAt || "",
      referral: row.referralSource || "",
      email: row.customer?.email || "",
      phone: row.customer?.phone || "",
      zone: getItemName(row.zone?.name),
      guests: row.totalGuests,
      staff: row.staff || "",
    }));
    exportToCSV(exportData, exportCols, { title: t("title"), filename: "booking-index" });
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            labelExport={tActions("export")}
            labelExcel={tActions("exportExcel")}
            labelCSV={tActions("exportCSV")}
            disabled={loading || data.length === 0}
          />
          <ColumnTogglePopover
            columns={columns.map(c => ({ key: c.key, header: c.header }))}
            hiddenColumns={hiddenColumns}
            onToggle={toggleColumn}
            label={tActions("columns")}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        variant="booking-index"
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        filterOptions={filterOptions}
        t={(key) => tFilters(key)}
      />

      {/* Data Table */}
      <ReportDataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage={t("noData")}
        selectable
        selectedIds={selectedIds}
        onSelectAll={(checked) => {
          if (checked) {
            setSelectedIds(new Set(data.map(r => r.id)));
          } else {
            setSelectedIds(new Set());
          }
        }}
        onSelectRow={(id, checked) => {
          setSelectedIds(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
          });
        }}
        getRowId={(row) => row.id}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-600">
            {t("showing", {
              from: (pagination.currentPage - 1) * pagination.limit + 1,
              to: Math.min(pagination.currentPage * pagination.limit, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("previous")}
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
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage}
            >
              {t("next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
