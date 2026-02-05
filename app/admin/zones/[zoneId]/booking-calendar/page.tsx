"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-hot-toast";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { BookingCalendar } from "@/components/admin/glamping/BookingCalendar";
import { BookingCalendarFilters } from "@/components/admin/glamping/BookingCalendarFilters";
import { BookingCalendarDayModal } from "@/components/admin/glamping/BookingCalendarDayModal";
import { GlampingBookingDetailModal } from "@/components/admin/glamping/GlampingBookingDetailModal";
import type {
  CalendarDayData,
  CalendarEvent,
  CalendarFilters,
  CalendarFilterOptions,
  CalendarSummary,
} from "@/components/admin/glamping/calendar-types";
import { DEFAULT_CALENDAR_FILTERS } from "@/components/admin/glamping/calendar-types";
import type { BookingStatus } from "@/components/admin/glamping/types";
import { formatCurrency } from "@/lib/utils";

export default function BookingCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useAdminLocale();
  const t = useTranslations("admin");
  const zoneId = params.zoneId as string;

  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState<Record<string, CalendarDayData>>({});
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS);
  const [filterOptions, setFilterOptions] = useState<CalendarFilterOptions>({
    categories: [],
    items: [],
    adminUsers: [],
  });
  const [summary, setSummary] = useState<CalendarSummary>({
    totalBookings: 0,
    totalGuests: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modal state
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;

      const searchParams = new URLSearchParams({
        zoneId: zoneId === "all" ? "all" : zoneId,
        month,
      });

      if (filters.categoryId !== "all") {
        searchParams.set("categoryId", filters.categoryId);
      }
      if (filters.itemId !== "all") {
        searchParams.set("itemId", filters.itemId);
      }
      if (filters.statuses.length > 0) {
        searchParams.set("statuses", filters.statuses.join(","));
      }
      if (filters.source !== "all") {
        searchParams.set("source", filters.source);
      }
      if (filters.search) {
        searchParams.set("search", filters.search);
        searchParams.set("searchType", filters.searchType);
      }

      const response = await fetch(`/api/admin/glamping/bookings/calendar?${searchParams}`);

      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }

      const data = await response.json();
      setDays(data.days || {});
      setFilterOptions(data.filterOptions || { categories: [], items: [], adminUsers: [] });
      setSummary(data.summary || { totalBookings: 0, totalGuests: 0, totalAmount: 0 });
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      toast.error(locale === "vi" ? "Không thể tải dữ liệu lịch" : "Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, zoneId, filters, locale]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Handle day click - open day modal
  const handleDayClick = (date: string, events: CalendarEvent[]) => {
    setSelectedDate(date);
    setSelectedDayEvents(events);
    setDayModalOpen(true);
  };

  // Handle event click - open detail modal
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedBookingId(event.id);
    setDetailModalOpen(true);
  };

  // Handle status change from day modal
  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(locale === "vi" ? "Đã cập nhật trạng thái" : "Status updated");

      // Refresh data
      await fetchCalendarData();

      // Update the day modal events if open
      if (dayModalOpen && selectedDate) {
        const updatedDayData = days[selectedDate];
        if (updatedDayData) {
          setSelectedDayEvents(updatedDayData.events);
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(locale === "vi" ? "Không thể cập nhật" : "Failed to update");
    }
  };

  // Handle check-in from day modal
  const handleCheckIn = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "checked_in" }),
      });

      if (!response.ok) {
        throw new Error("Failed to check in");
      }

      toast.success(locale === "vi" ? "Check-in thành công" : "Check-in successful");

      // Refresh data
      await fetchCalendarData();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error(locale === "vi" ? "Không thể check-in" : "Failed to check in");
    }
  };

  // Handle new booking
  const handleNewBooking = () => {
    // Navigate to bookings page with action=create to auto-open the modal
    router.push(`/admin/zones/${zoneId}/bookings?action=create`);
  };

  // Handle booking detail update
  const handleBookingUpdate = () => {
    fetchCalendarData();
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === "vi" ? "Lịch Booking" : "Booking Calendar"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {locale === "vi"
              ? `${summary.totalBookings} booking | ${summary.totalGuests} khách | ${formatCurrency(summary.totalAmount)}`
              : `${summary.totalBookings} bookings | ${summary.totalGuests} guests | ${formatCurrency(summary.totalAmount)}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <BookingCalendarFilters
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        onNewBooking={zoneId !== "all" ? handleNewBooking : undefined}
        locale={locale}
      />

      {/* Calendar */}
      <BookingCalendar
        days={days}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onDayClick={handleDayClick}
        onEventClick={handleEventClick}
        locale={locale}
        loading={loading}
        showAllBookings={filters.showAllBookings}
      />

      {/* Day Modal */}
      <BookingCalendarDayModal
        isOpen={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        date={selectedDate}
        events={selectedDayEvents}
        onEventClick={(event) => {
          setDayModalOpen(false);
          handleEventClick(event);
        }}
        onStatusChange={handleStatusChange}
        onCheckIn={handleCheckIn}
        locale={locale}
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
