"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";
import { ReportFilterBar, type BookingSalesFilters } from "@/components/admin/reports/ReportFilterBar";
import { SalesTabTable } from "@/components/admin/reports/SalesTabTable";
import { ExportDropdown } from "@/components/admin/reports/ExportDropdown";
import { type ColumnDef } from "@/components/admin/reports/ReportDataTable";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";

type TabType = "day" | "booking" | "booking_item" | "customer" | "staff" | "category" | "item" | "product";

const TABS: TabType[] = ["day", "booking", "booking_item", "customer", "staff", "category", "item", "product"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  checked_in: "bg-blue-100 text-blue-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const DEFAULT_FILTERS: BookingSalesFilters = {
  dateSource: "created",
  dateRange: "this_month",
  dateFrom: "",
  dateTo: "",
  staffId: "",
  categoryId: "",
  itemId: "",
};

export default function BookingSalesPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const t = useTranslations("admin.reportBookingSales");
  const tTabs = useTranslations("admin.reportBookingSales.tabs");
  const tFilters = useTranslations("admin.reportBookingSales.filters");
  const tCols = useTranslations("admin.reportBookingSales.columns");
  const tSummary = useTranslations("admin.reportBookingSales.summary");
  const tActions = useTranslations("admin.reportBookingSales.actions");
  const { locale } = useAdminLocale();

  const [activeTab, setActiveTab] = useState<TabType>("day");
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BookingSalesFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, total: 0, limit: 50, hasNextPage: false, hasPreviousPage: false });
  const [filterOptions, setFilterOptions] = useState<any>({});

  const getLocalName = useCallback((name: any): string => {
    if (!name) return "-";
    if (typeof name === "object") return getLocalizedText(name as MultilingualText, locale);
    return name;
  }, [locale]);

  const fmtCur = useCallback((val: number) => formatCurrency(val, locale), [locale]);
  const fmtDate = useCallback((val: string) => val ? formatDate(val, locale, { day: "2-digit", month: "short", year: "numeric" }) : "-", [locale]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        zoneId,
        tab: activeTab,
        page: String(page),
        limit: "50",
        dateSource: filters.dateSource,
        dateRange: filters.dateRange,
      });
      if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) p.set("dateTo", filters.dateTo);
      if (filters.staffId) p.set("staffId", filters.staffId);
      if (filters.categoryId) p.set("categoryId", filters.categoryId);
      if (filters.itemId) p.set("itemId", filters.itemId);

      const res = await fetch(`/api/admin/glamping/reports/booking-sales?${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json.data || []);
      setSummary(json.summary || {});
      setPagination(json.pagination || { currentPage: 1, totalPages: 0, total: 0, limit: 50, hasNextPage: false, hasPreviousPage: false });
      setFilterOptions(json.filterOptions || {});
    } catch {
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  }, [zoneId, activeTab, page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
    setPage(1);
  };

  // Column definitions per tab
  const tabColumns = useMemo((): Record<TabType, ColumnDef[]> => ({
    day: [
      { key: "created_date", header: tCols("date"), render: (r) => fmtDate(r.created_date) },
      { key: "booking_count", header: "Bookings", align: "center" },
      { key: "item_quantity", header: tCols("itemQty"), align: "center" },
      { key: "discounts", header: tCols("discounts"), align: "right", render: (r) => fmtCur(r.discounts) },
      { key: "gross_sales", header: tCols("grossSales"), align: "right", render: (r) => fmtCur(r.gross_sales) },
      { key: "net_sales", header: tCols("netSales"), align: "right", render: (r) => fmtCur(r.net_sales) },
      { key: "total", header: tCols("total"), align: "right", render: (r) => <span className="font-semibold">{fmtCur(r.total)}</span> },
    ],
    booking: [
      { key: "booking_code", header: tCols("bookingCode"), render: (r) => <span className="font-medium text-primary">{r.booking_code}</span> },
      { key: "status", header: tCols("status"), render: (r) => <Badge className={`${STATUS_COLORS[r.status] || "bg-gray-100"} text-xs`}>{r.status?.replace(/_/g, " ")}</Badge> },
      { key: "staff_name", header: tCols("staff") },
      { key: "created_date", header: tCols("createdDate"), render: (r) => fmtDate(r.created_date) },
      { key: "customer_name", header: tCols("customer") },
      { key: "item_quantity", header: tCols("itemQty"), align: "center" },
      { key: "discounts", header: tCols("discounts"), align: "right", render: (r) => fmtCur(r.discounts) },
      { key: "gross_sales", header: tCols("grossSales"), align: "right", render: (r) => fmtCur(r.gross_sales) },
      { key: "net_sales", header: tCols("netSales"), align: "right", render: (r) => fmtCur(r.net_sales) },
      { key: "total", header: tCols("total"), align: "right", render: (r) => <span className="font-semibold">{fmtCur(r.total)}</span> },
      { key: "paid_total", header: tCols("paidTotal"), align: "right", render: (r) => fmtCur(r.paid_total) },
      { key: "balance_owing", header: tCols("balanceOwing"), align: "right", render: (r) => <span className={r.balance_owing > 0 ? "text-red-600 font-medium" : ""}>{fmtCur(r.balance_owing)}</span> },
    ],
    booking_item: [
      { key: "booking_code", header: tCols("bookingCode"), render: (r) => <span className="font-medium text-primary">{r.booking_code}</span> },
      { key: "status", header: tCols("status"), render: (r) => <Badge className={`${STATUS_COLORS[r.status] || "bg-gray-100"} text-xs`}>{r.status?.replace(/_/g, " ")}</Badge> },
      { key: "item_name", header: tCols("itemName"), render: (r) => getLocalName(r.item_name) },
      { key: "item_sku", header: tCols("itemSku") },
      { key: "staff_name", header: tCols("staff") },
      { key: "created_date", header: tCols("createdDate"), render: (r) => fmtDate(r.created_date) },
      { key: "customer_name", header: tCols("customer") },
      { key: "discounts", header: tCols("discounts"), align: "right", render: (r) => fmtCur(r.discounts) },
      { key: "gross_sales", header: tCols("grossSales"), align: "right", render: (r) => fmtCur(r.gross_sales) },
      { key: "net_sales", header: tCols("netSales"), align: "right", render: (r) => fmtCur(r.net_sales) },
      { key: "total", header: tCols("total"), align: "right", render: (r) => <span className="font-semibold">{fmtCur(r.total)}</span> },
    ],
    customer: [
      { key: "customer_name", header: tCols("customer") },
      { key: "customer_email", header: tCols("email") },
      { key: "customer_phone", header: tCols("phone") },
      { key: "booking_count", header: "Bookings", align: "center" },
      { key: "item_quantity", header: tCols("itemQty"), align: "center" },
      { key: "discounts", header: tCols("discounts"), align: "right", render: (r) => fmtCur(r.discounts) },
      { key: "gross_sales", header: tCols("grossSales"), align: "right", render: (r) => fmtCur(r.gross_sales) },
      { key: "net_sales", header: tCols("netSales"), align: "right", render: (r) => fmtCur(r.net_sales) },
      { key: "total", header: tCols("total"), align: "right", render: (r) => <span className="font-semibold">{fmtCur(r.total)}</span> },
      { key: "paid_total", header: tCols("paidTotal"), align: "right", render: (r) => fmtCur(r.paid_total) },
      { key: "balance_owing", header: tCols("balanceOwing"), align: "right", render: (r) => <span className={r.balance_owing > 0 ? "text-red-600 font-medium" : ""}>{fmtCur(r.balance_owing)}</span> },
    ],
    staff: [
      { key: "staff_name", header: tCols("staff") },
      { key: "booking_count", header: "Bookings", align: "center" },
      { key: "item_quantity", header: tCols("itemQty"), align: "center" },
      { key: "discounts", header: tCols("discounts"), align: "right", render: (r) => fmtCur(r.discounts) },
      { key: "gross_sales", header: tCols("grossSales"), align: "right", render: (r) => fmtCur(r.gross_sales) },
      { key: "net_sales", header: tCols("netSales"), align: "right", render: (r) => fmtCur(r.net_sales) },
      { key: "total", header: tCols("total"), align: "right", render: (r) => <span className="font-semibold">{fmtCur(r.total)}</span> },
    ],
    category: [
      { key: "category_name", header: tCols("categoryName"), render: (r) => getLocalName(r.category_name) },
      { key: "booking_count", header: "Bookings", align: "center" },
      { key: "item_quantity", header: tCols("itemQty"), align: "center" },
      { key: "discounts", header: tCols("discounts"), align: "right", render: (r) => fmtCur(r.discounts) },
      { key: "gross_sales", header: tCols("grossSales"), align: "right", render: (r) => fmtCur(r.gross_sales) },
      { key: "net_sales", header: tCols("netSales"), align: "right", render: (r) => fmtCur(r.net_sales) },
      { key: "total", header: tCols("total"), align: "right", render: (r) => <span className="font-semibold">{fmtCur(r.total)}</span> },
    ],
    item: [
      { key: "item_name", header: tCols("itemName"), render: (r) => getLocalName(r.item_name) },
      { key: "item_sku", header: tCols("itemSku") },
      { key: "category_name", header: tCols("categoryName"), render: (r) => getLocalName(r.category_name) },
      { key: "item_quantity", header: tCols("itemQty"), align: "center" },
      { key: "discounts", header: tCols("discounts"), align: "right", render: (r) => fmtCur(r.discounts) },
      { key: "gross_sales", header: tCols("grossSales"), align: "right", render: (r) => fmtCur(r.gross_sales) },
      { key: "net_sales", header: tCols("netSales"), align: "right", render: (r) => fmtCur(r.net_sales) },
      { key: "total", header: tCols("total"), align: "right", render: (r) => <span className="font-semibold">{fmtCur(r.total)}</span> },
    ],
    product: [
      { key: "product_name", header: tCols("productName"), render: (r) => getLocalName(r.product_name) },
      { key: "product_category", header: tCols("categoryName"), render: (r) => getLocalName(r.product_category) },
      { key: "item_quantity", header: tCols("itemQty"), align: "center" },
      { key: "discounts", header: tCols("discounts"), align: "right", render: (r) => fmtCur(r.discounts) },
      { key: "gross_sales", header: tCols("grossSales"), align: "right", render: (r) => fmtCur(r.gross_sales) },
      { key: "net_sales", header: tCols("netSales"), align: "right", render: (r) => fmtCur(r.net_sales) },
      { key: "total", header: tCols("total"), align: "right", render: (r) => <span className="font-semibold">{fmtCur(r.total)}</span> },
    ],
  }), [tCols, fmtCur, fmtDate, getLocalName]);

  const currentColumns = tabColumns[activeTab];

  // Tabs that show the summary/totals row
  const showSummary = ["day", "staff", "category", "item", "product"].includes(activeTab);

  const handleExportExcel = async () => {
    const exportCols = currentColumns.map(c => ({ header: c.header, key: c.key, width: 18 }));
    const exportData = data.map(row => {
      const flat: Record<string, any> = {};
      for (const col of currentColumns) {
        const val = row[col.key];
        if (["discounts", "gross_sales", "net_sales", "total", "paid_total", "balance_owing"].includes(col.key)) {
          flat[col.key] = val || 0;
        } else if (typeof val === "object" && val !== null) {
          flat[col.key] = getLocalName(val);
        } else {
          flat[col.key] = val ?? "";
        }
      }
      return flat;
    });
    await exportToExcel(exportData, exportCols, { title: `${t("title")} - ${tTabs(activeTab === "booking_item" ? "bookingItem" : activeTab)}`, filename: `booking-sales-${activeTab}` });
    toast.success("Excel exported");
  };

  const handleExportCSV = () => {
    const exportCols = currentColumns.map(c => ({ header: c.header, key: c.key }));
    const exportData = data.map(row => {
      const flat: Record<string, any> = {};
      for (const col of currentColumns) {
        const val = row[col.key];
        if (typeof val === "object" && val !== null) {
          flat[col.key] = getLocalName(val);
        } else {
          flat[col.key] = val ?? "";
        }
      }
      return flat;
    });
    exportToCSV(exportData, exportCols, { title: `${t("title")} - ${tTabs(activeTab === "booking_item" ? "bookingItem" : activeTab)}`, filename: `booking-sales-${activeTab}` });
    toast.success("CSV exported");
  };

  const getTabLabel = (tab: TabType): string => {
    const keyMap: Record<TabType, string> = {
      day: "day",
      booking: "booking",
      booking_item: "bookingItem",
      customer: "customer",
      staff: "staff",
      category: "category",
      item: "item",
      product: "product",
    };
    return tTabs(keyMap[tab]);
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

      {/* Filter Bar */}
      <ReportFilterBar
        variant="sales"
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        filterOptions={filterOptions}
        t={(key) => tFilters(key)}
      />

      {/* Tabs + Tables */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto">
            {TABS.map(tab => (
              <TabsTrigger key={tab} value={tab} className="whitespace-nowrap">
                {getTabLabel(tab)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TABS.map(tab => (
          <TabsContent key={tab} value={tab}>
            <SalesTabTable
              columns={tabColumns[tab]}
              data={data}
              loading={loading}
              emptyMessage={t("noData")}
              summary={showSummary ? summary : undefined}
              summaryLabel={tSummary("totalLabel")}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-600">
            Page {pagination.currentPage} / {pagination.totalPages} ({pagination.total} results)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
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
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
