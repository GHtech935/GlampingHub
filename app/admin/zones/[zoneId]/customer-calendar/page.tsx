"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { format, addDays, startOfDay } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { CustomerCalendar } from "@/components/admin/glamping/CustomerCalendar";
import { CustomerCalendarFilters } from "@/components/admin/glamping/CustomerCalendarFilters";
import { GlampingBookingDetailModal } from "@/components/admin/glamping/GlampingBookingDetailModal";
import type {
  CustomerCalendarData,
  CustomerCalendarFilters as FilterType,
  CustomerCalendarBooking,
  CustomerCalendarCategory,
} from "@/components/admin/glamping/customer-calendar-types";
import { DEFAULT_CUSTOMER_CALENDAR_FILTERS } from "@/components/admin/glamping/customer-calendar-types";

export default function CustomerCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useAdminLocale();
  const zoneId = params.zoneId as string;
  const dateLocale = locale === "vi" ? vi : enUS;

  // State
  const [filters, setFilters] = useState<FilterType>(DEFAULT_CUSTOMER_CALENDAR_FILTERS);
  const [data, setData] = useState<CustomerCalendarData | null>(null);
  const [allCategories, setAllCategories] = useState<CustomerCalendarCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Calculate date range based on filters
  const dateRange = useMemo(() => {
    const startDate = new Date(filters.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = addDays(startDate, filters.viewWeeks * 7 - 1);
    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [filters.startDate, filters.viewWeeks]);

  // Format date range for title
  const titleDateRange = useMemo(() => {
    const start = filters.startDate;
    const end = addDays(start, filters.viewWeeks * 7 - 1);
    const startStr = format(start, "d 'thg' M", { locale: dateLocale });
    const endStr = format(end, "d 'thg' M yyyy", { locale: dateLocale });
    return `${startStr} - ${endStr}`;
  }, [filters.startDate, filters.viewWeeks, dateLocale]);

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        zoneId: zoneId === "all" ? "all" : zoneId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        showEmptyItems: String(filters.showEmptyItems),
      });

      if (filters.categoryIds.length > 0) {
        searchParams.set("categoryIds", filters.categoryIds.join(","));
      }

      const response = await fetch(
        `/api/admin/glamping/bookings/customer-calendar?${searchParams}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }

      const responseData = await response.json();
      setData(responseData);

      // Store all categories for the filter dropdown (only on first load or when empty)
      if (allCategories.length === 0 && responseData.categories?.length > 0) {
        setAllCategories(responseData.categories);
      }
    } catch (error) {
      console.error("Error fetching customer calendar data:", error);
      toast.error(
        locale === "vi"
          ? "Không thể tải dữ liệu lịch"
          : "Failed to load calendar data"
      );
    } finally {
      setLoading(false);
    }
  }, [zoneId, dateRange, filters.showEmptyItems, filters.categoryIds, locale, allCategories.length]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Handle booking click
  const handleBookingClick = (booking: CustomerCalendarBooking) => {
    setSelectedBookingId(booking.id);
    setDetailModalOpen(true);
  };

  // Handle booking update
  const handleBookingUpdate = () => {
    fetchCalendarData();
  };

  // Handle empty cell click - navigate to bookings page with create modal params
  const handleEmptyCellClick = (itemId: string, date: Date) => {
    const normalizedDate = startOfDay(date);
    const checkIn = format(normalizedDate, "yyyy-MM-dd");
    const checkOut = format(addDays(normalizedDate, 1), "yyyy-MM-dd");
    router.push(
      `/admin/zones/${zoneId}/bookings?action=create&itemId=${itemId}&checkIn=${checkIn}&checkOut=${checkOut}`
    );
  };

  // Handle PDF export - open print page in new tab
  const handleExportPDF = useCallback(() => {
    const startDate = new Date(filters.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = addDays(startDate, filters.viewWeeks * 7 - 1);

    const printParams = new URLSearchParams({
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      showEmptyItems: String(filters.showEmptyItems),
      locale,
    });

    if (filters.categoryIds.length > 0) {
      printParams.set("categoryIds", filters.categoryIds.join(","));
    }

    // Open print page in new tab
    window.open(
      `/admin/zones/${zoneId}/customer-calendar/print?${printParams}`,
      "_blank"
    );
  }, [zoneId, filters, locale]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">{titleDateRange}</p>
      </div>

      {/* Filters */}
      <CustomerCalendarFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={allCategories.length > 0 ? allCategories : (data?.categories || [])}
        locale={locale}
        onExportPDF={handleExportPDF}
      />

      {/* Calendar */}
      <CustomerCalendar
        data={data}
        startDate={filters.startDate}
        viewWeeks={filters.viewWeeks}
        locale={locale}
        loading={loading}
        onBookingClick={handleBookingClick}
        onEmptyCellClick={handleEmptyCellClick}
      />

      {/* Booking Detail Modal */}
      <GlampingBookingDetailModal
        bookingId={selectedBookingId}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBookingId(null);
        }}
        onUpdate={handleBookingUpdate}
      />
    </div>
  );
}
