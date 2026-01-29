"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { formatCurrency } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { SalesTabTable } from "@/components/admin/reports/SalesTabTable";
import { ExportDropdown } from "@/components/admin/reports/ExportDropdown";
import { ReportComboChart } from "@/components/admin/reports/ReportComboChart";
import { type ColumnDef } from "@/components/admin/reports/ReportDataTable";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";

interface BookingVolumeRow {
  month: string;
  monthLabel: string;
  bookings: number;
  qty: number;
  total: number;
}

const DATE_RANGE_OPTIONS = [
  { value: "this_month", labelKey: "thisMonth" },
  { value: "last_month", labelKey: "lastMonth" },
  { value: "last_30_days", labelKey: "last30Days" },
  { value: "last_90_days", labelKey: "last90Days" },
  { value: "this_year", labelKey: "thisYear" },
  { value: "last_year", labelKey: "lastYear" },
  { value: "all_time", labelKey: "allTime" },
  { value: "custom", labelKey: "custom" },
];

export default function BookingVolumePage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const t = useTranslations("admin.reportBookingVolume");
  const tFilters = useTranslations("admin.reportBookingVolume.filters");
  const tCols = useTranslations("admin.reportBookingVolume.columns");
  const tChart = useTranslations("admin.reportBookingVolume.chart");
  const tActions = useTranslations("admin.reportBookingVolume.actions");
  const { locale } = useAdminLocale();

  const [data, setData] = useState<BookingVolumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("this_year");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fmtCur = useCallback((val: number) => formatCurrency(val, locale), [locale]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ zoneId, dateRange });
      if (dateFrom) p.set("dateFrom", dateFrom);
      if (dateTo) p.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/glamping/reports/booking-volume?${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json.data || []);
    } catch {
      toast.error("Failed to load booking volume data");
    } finally {
      setLoading(false);
    }
  }, [zoneId, dateRange, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReset = () => {
    setDateRange("this_year");
    setDateFrom("");
    setDateTo("");
  };

  const columns: ColumnDef<BookingVolumeRow>[] = useMemo(() => [
    { key: "monthLabel", header: tCols("period") },
    { key: "bookings", header: tCols("newBookings"), align: "center" },
    { key: "qty", header: tCols("tentNights"), align: "center" },
    {
      key: "total",
      header: tCols("totalGuests"),
      align: "right",
      render: (r) => <span className="font-semibold text-green-700">{fmtCur(r.total)}</span>,
    },
  ], [tCols, fmtCur]);

  const handleExportExcel = async () => {
    const exportCols = columns.map(c => ({ header: c.header, key: c.key, width: 18 }));
    const exportData = data.map(row => ({
      monthLabel: row.monthLabel,
      bookings: row.bookings,
      qty: row.qty,
      total: row.total,
    }));
    await exportToExcel(exportData, exportCols, { title: t("title"), filename: "booking-volume" });
    toast.success("Excel exported");
  };

  const handleExportCSV = () => {
    const exportCols = columns.map(c => ({ header: c.header, key: c.key }));
    const exportData = data.map(row => ({
      monthLabel: row.monthLabel,
      bookings: row.bookings,
      qty: row.qty,
      total: row.total,
    }));
    exportToCSV(exportData, exportCols, { title: t("title"), filename: "booking-volume" });
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

      {/* Chart */}
      {!loading && data.length > 0 && (
        <ReportComboChart
          data={data}
          xKey="monthLabel"
          barKey="total"
          line1Key="bookings"
          line2Key="qty"
          barLabel={tChart("title")}
          line1Label={tChart("bookings")}
          line2Label={tChart("tentNights")}
          formatLeftAxis={(v) => {
            if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
            return String(v);
          }}
        />
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{tFilters("dateRange")}</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 text-sm w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{tFilters(opt.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dateRange === "custom" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{tFilters("from")}</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 text-sm w-[140px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{tFilters("to")}</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 text-sm w-[140px]"
                />
              </div>
            </>
          )}
          <div className="flex items-end">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleReset} title={tFilters("reset")}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <SalesTabTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage={t("noData")}
      />
    </div>
  );
}
