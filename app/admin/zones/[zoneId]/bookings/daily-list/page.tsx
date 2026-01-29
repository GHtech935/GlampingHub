"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { DailyDateNavigation } from "@/components/admin/glamping/DailyDateNavigation";
import { DailyBookingFilters } from "@/components/admin/glamping/DailyBookingFilters";
import { DailyListSummaryTable } from "@/components/admin/glamping/DailyListSummaryTable";
import { DailyListBookingGroup } from "@/components/admin/glamping/DailyListBookingGroup";
import { GlampingBookingDetailModal } from "@/components/admin/glamping/GlampingBookingDetailModal";
import { type DailyListResponse, type BookingFilterType } from "@/components/admin/glamping/daily-types";

export default function DailyListPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const { locale } = useAdminLocale();
  const isVi = locale === "vi";

  const [data, setData] = useState<DailyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bookingFilter, setBookingFilter] = useState<BookingFilterType>("staying");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (zoneId && zoneId !== "all") params.append("zoneId", zoneId);
      params.append("date", selectedDate);
      params.append("bookingFilter", bookingFilter);
      if (categoryId !== "all") params.append("categoryId", categoryId);
      if (status !== "all") params.append("status", status);
      if (search.trim()) params.append("search", search.trim());

      const response = await fetch(`/api/admin/glamping/bookings/daily-list?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch daily list:", error);
      toast.error(isVi ? "Lỗi tải dữ liệu" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [zoneId, selectedDate, bookingFilter, categoryId, status, search, isVi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReset = () => {
    setBookingFilter("staying");
    setCategoryId("all");
    setStatus("all");
    setSearch("");
  };

  const handleViewBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  const handleToggleBooking = (bookingId: string) => {
    setSelectedBookingIds((prev) => {
      const next = new Set(prev);
      next.has(bookingId) ? next.delete(bookingId) : next.add(bookingId);
      return next;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isVi ? "Danh Sách Hàng Ngày" : "Booking Daily List"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {data?.summaryTotals.totalBookings || 0} {isVi ? "booking" : "bookings"} •{" "}
            {data?.summaryTotals.totalGuests || 0} {isVi ? "khách" : "guests"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          {isVi ? "Tải lại" : "Refresh"}
        </Button>
      </div>

      {/* Date Navigation */}
      <DailyDateNavigation
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        todayCount={data?.dateCounts.today}
        tomorrowCount={data?.dateCounts.tomorrow}
        locale={locale}
      />

      {/* Filters */}
      <DailyBookingFilters
        variant="daily-list"
        bookingFilter={bookingFilter}
        onBookingFilterChange={setBookingFilter}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={fetchData}
        onReset={handleReset}
        categories={data?.filterOptions.categories || []}
        locale={locale}
      />

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-gray-600">{isVi ? "Đang tải..." : "Loading..."}</span>
          </div>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            {isVi ? "Không có dữ liệu" : "No data available"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Table */}
          <DailyListSummaryTable
            summary={data.summary}
            totals={data.summaryTotals}
            parameters={data.parameters}
            locale={locale}
          />

          {/* Booking Groups */}
          <DailyListBookingGroup
            categories={data.categories}
            parameters={data.parameters}
            locale={locale}
            onViewBooking={handleViewBooking}
            selectedBookingIds={selectedBookingIds}
            onToggleBooking={handleToggleBooking}
          />
        </div>
      )}

      {/* Booking Detail Modal */}
      <GlampingBookingDetailModal
        bookingId={selectedBookingId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setSelectedBookingId(null);
          setIsDetailModalOpen(false);
        }}
        onUpdate={fetchData}
      />
    </div>
  );
}
