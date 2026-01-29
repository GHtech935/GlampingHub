"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { DailyDateNavigation } from "@/components/admin/glamping/DailyDateNavigation";
import { DailyBookingFilters } from "@/components/admin/glamping/DailyBookingFilters";
import { ManifestItemGroup } from "@/components/admin/glamping/ManifestItemGroup";
import { GlampingBookingDetailModal } from "@/components/admin/glamping/GlampingBookingDetailModal";
import { AdminGlampingBookingFormModal } from "@/components/admin/AdminGlampingBookingFormModal";
import { type ManifestResponse, type BookingFilterType } from "@/components/admin/glamping/daily-types";

export default function DailyManifestPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const { locale } = useAdminLocale();
  const isVi = locale === "vi";

  const [data, setData] = useState<ManifestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bookingFilter, setBookingFilter] = useState<BookingFilterType>("staying");
  const [categoryId, setCategoryId] = useState("all");
  const [itemId, setItemId] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (zoneId && zoneId !== "all") params.append("zoneId", zoneId);
      params.append("date", selectedDate);
      params.append("bookingFilter", bookingFilter);
      if (categoryId !== "all") params.append("categoryId", categoryId);
      if (itemId !== "all") params.append("itemId", itemId);
      if (status !== "all") params.append("status", status);
      if (search.trim()) params.append("search", search.trim());

      const response = await fetch(`/api/admin/glamping/bookings/daily-manifest?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch daily manifest:", error);
      toast.error(isVi ? "Lỗi tải dữ liệu" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [zoneId, selectedDate, bookingFilter, categoryId, itemId, status, search, isVi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReset = () => {
    setBookingFilter("staying");
    setCategoryId("all");
    setItemId("all");
    setStatus("all");
    setSearch("");
  };

  const handleViewBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  const totalBookings = data?.items.reduce((sum, item) => sum + item.totalBookings, 0) || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isVi ? "Biểu Đồ Hàng Ngày" : "Daily Manifest"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {totalBookings} {isVi ? "booking" : totalBookings === 1 ? "booking" : "bookings"} •{" "}
            {data?.items.length || 0} {isVi ? "tent" : "items"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {isVi ? "Tạo Booking" : "New Booking"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {isVi ? "Tải lại" : "Refresh"}
          </Button>
        </div>
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
        variant="manifest"
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
        items={data?.filterOptions.items || []}
        itemId={itemId}
        onItemChange={setItemId}
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
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            {isVi ? "Không có booking nào cho ngày này" : "No bookings for this date"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((item) => (
            <ManifestItemGroup
              key={item.itemId}
              item={item}
              locale={locale}
              onViewBooking={handleViewBooking}
            />
          ))}
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

      {/* Create Booking Modal */}
      <AdminGlampingBookingFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchData();
          toast.success(isVi ? "Tạo booking thành công" : "Booking created successfully");
        }}
        zoneId={zoneId}
        locale={locale}
      />
    </div>
  );
}
