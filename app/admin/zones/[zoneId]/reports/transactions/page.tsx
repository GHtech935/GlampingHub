"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReportFilterBar, type TransactionFilters } from "@/components/admin/reports/ReportFilterBar";
import { ReportDataTable, type ColumnDef } from "@/components/admin/reports/ReportDataTable";
import { ExportDropdown } from "@/components/admin/reports/ExportDropdown";
import { TransactionDetailModal } from "@/components/admin/reports/TransactionDetailModal";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";

interface TransactionRow {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionReference: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  bookingId: string;
  bookingCode: string;
  checkInDate: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  createdBy: string | null;
  sepayRef: string | null;
  sepayAccount: string | null;
  sepayContent: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  refunded: "bg-purple-100 text-purple-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};

const DEFAULT_FILTERS: TransactionFilters = {
  dateRange: "last_30_days",
  dateFrom: "",
  dateTo: "",
  status: "",
  paymentMethod: "",
  search: "",
};

export default function TransactionsPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const t = useTranslations("admin.reportTransactions");
  const tFilters = useTranslations("admin.reportTransactions.filters");
  const tCols = useTranslations("admin.reportTransactions.columns");
  const tActions = useTranslations("admin.reportTransactions.actions");
  const tDetail = useTranslations("admin.reportTransactions.detail");
  const { locale } = useAdminLocale();

  const [data, setData] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, total: 0, limit: 50, hasNextPage: false, hasPreviousPage: false });
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);

  const fmtCur = useCallback((val: number) => formatCurrency(val, locale), [locale]);
  const fmtDate = useCallback((val: string) => val ? formatDate(val, locale, { day: "2-digit", month: "short", year: "numeric" }) : "-", [locale]);
  const fmtDateTime = useCallback((val: string) => val ? formatDate(val, locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-", [locale]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        zoneId,
        page: String(page),
        limit: "50",
        sortBy,
        sortOrder: sortOrder.toUpperCase(),
        dateRange: filters.dateRange,
      });
      if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) p.set("dateTo", filters.dateTo);
      if (filters.status) p.set("status", filters.status);
      if (filters.paymentMethod) p.set("paymentMethod", filters.paymentMethod);
      if (filters.search) p.set("search", filters.search);

      const res = await fetch(`/api/admin/glamping/reports/transactions?${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json.data || []);
      setPagination(json.pagination || { currentPage: 1, totalPages: 0, total: 0, limit: 50, hasNextPage: false, hasPreviousPage: false });
      setFilterOptions(json.filterOptions || {});
    } catch {
      toast.error("Failed to load transactions");
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

  const openDetail = (row: TransactionRow) => {
    setSelectedTransaction(row);
    setDetailOpen(true);
  };

  const columns: ColumnDef<TransactionRow>[] = useMemo(() => [
    {
      key: "createdAt",
      header: tCols("date"),
      sortable: true,
      render: (row) => fmtDateTime(row.createdAt),
    },
    {
      key: "bookingCode",
      header: tCols("bookingCode"),
      render: (row) => (
        <span className="font-medium text-primary">{row.bookingCode}</span>
      ),
    },
    {
      key: "customerName",
      header: tCols("customer"),
      render: (row) => row.customerName || "-",
    },
    {
      key: "paymentMethod",
      header: tCols("method"),
      render: (row) => (
        <span className="capitalize">{row.paymentMethod?.replace(/_/g, " ") || "-"}</span>
      ),
    },
    {
      key: "amount",
      header: tCols("amount"),
      align: "right",
      sortable: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-semibold">{fmtCur(row.amount)}</span>
          <Badge className={`${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-800"} text-xs`}>
            {row.status}
          </Badge>
        </div>
      ),
    },
    {
      key: "createdBy",
      header: tCols("createdBy"),
      render: (row) => row.createdBy || "-",
    },
    {
      key: "note",
      header: tCols("note"),
      render: (row) => (
        <span className="text-gray-500 truncate max-w-[150px] inline-block">
          {row.note || "-"}
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
          onClick={() => openDetail(row)}
          title={tActions("viewDetails")}
        >
          <Info className="h-4 w-4" />
        </Button>
      ),
    },
  ], [tCols, tActions, fmtCur, fmtDateTime]);

  const handleExportExcel = async () => {
    const exportCols = [
      { header: tCols("date"), key: "createdAt", width: 20 },
      { header: tCols("bookingCode"), key: "bookingCode", width: 16 },
      { header: tCols("customer"), key: "customerName", width: 20 },
      { header: tCols("method"), key: "paymentMethod", width: 16 },
      { header: tCols("amount"), key: "amount", width: 16 },
      { header: tCols("status"), key: "status", width: 12 },
      { header: tCols("createdBy"), key: "createdBy", width: 18 },
      { header: tCols("note"), key: "note", width: 20 },
    ];
    const exportData = data.map(row => ({
      createdAt: row.createdAt ? fmtDateTime(row.createdAt) : "",
      bookingCode: row.bookingCode,
      customerName: row.customerName || "",
      paymentMethod: row.paymentMethod || "",
      amount: row.amount,
      status: row.status,
      createdBy: row.createdBy || "",
      note: row.note || "",
    }));
    await exportToExcel(exportData, exportCols, { title: t("title"), filename: "transactions" });
    toast.success("Excel exported");
  };

  const handleExportCSV = () => {
    const exportCols = [
      { header: tCols("date"), key: "createdAt" },
      { header: tCols("bookingCode"), key: "bookingCode" },
      { header: tCols("customer"), key: "customerName" },
      { header: tCols("method"), key: "paymentMethod" },
      { header: tCols("amount"), key: "amount" },
      { header: tCols("status"), key: "status" },
      { header: tCols("createdBy"), key: "createdBy" },
      { header: tCols("note"), key: "note" },
    ];
    const exportData = data.map(row => ({
      createdAt: row.createdAt || "",
      bookingCode: row.bookingCode,
      customerName: row.customerName || "",
      paymentMethod: row.paymentMethod || "",
      amount: row.amount,
      status: row.status,
      createdBy: row.createdBy || "",
      note: row.note || "",
    }));
    exportToCSV(exportData, exportCols, { title: t("title"), filename: "transactions" });
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
        variant="transactions"
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
        getRowId={(row) => row.id}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

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

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        transaction={selectedTransaction}
        t={(key) => tDetail(key)}
        formatCurrency={fmtCur}
        formatDate={fmtDateTime}
      />
    </div>
  );
}
