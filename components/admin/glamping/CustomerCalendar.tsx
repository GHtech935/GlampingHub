"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { format, addDays, differenceInCalendarDays, isSameDay, parseISO, startOfDay } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type {
  CustomerCalendarData,
  CustomerCalendarBooking,
} from "./customer-calendar-types";
import { CUSTOMER_CALENDAR_STATUS_COLORS } from "./customer-calendar-types";

interface CustomerCalendarProps {
  data: CustomerCalendarData | null;
  startDate: Date;
  viewWeeks: number;
  locale: string;
  loading?: boolean;
  onBookingClick?: (booking: CustomerCalendarBooking) => void;
  onEmptyCellClick?: (itemId: string, date: Date) => void;
}

// Constants
const ITEM_COLUMN_WIDTH = 200;
const DAY_COLUMN_WIDTH = 130;

// Vietnamese day abbreviations
const WEEKDAY_ABBR_VI = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const WEEKDAY_ABBR_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CustomerCalendar({
  data,
  startDate,
  viewWeeks,
  locale,
  loading = false,
  onBookingClick,
  onEmptyCellClick,
}: CustomerCalendarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  // Generate array of dates for the view
  const dates = useMemo(() => {
    const result: Date[] = [];
    const totalDays = viewWeeks * 7;
    for (let i = 0; i < totalDays; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, viewWeeks]);

  // Toggle category collapse
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Get bookings for a specific item
  const getBookingsForItem = (itemId: string): CustomerCalendarBooking[] => {
    if (!data) return [];
    return data.bookings.filter((b) => b.itemId === itemId);
  };

  // Calculate booking bar position and width
  const getBookingBarStyle = (
    booking: CustomerCalendarBooking
  ): { left: number; width: number; visible: boolean } => {
    // Normalize all dates to start of day to avoid timezone issues
    const bookingStart = startOfDay(parseISO(booking.checkInDate));
    const bookingEnd = startOfDay(parseISO(booking.checkOutDate));
    const viewStart = startOfDay(dates[0]);
    const viewEnd = startOfDay(dates[dates.length - 1]);

    // Check if booking is visible in current view
    // Booking ends before view starts OR booking starts after view ends
    // Note: checkOutDate is the day guest leaves, so we check <= not <
    if (bookingEnd <= viewStart || bookingStart > viewEnd) {
      return { left: 0, width: 0, visible: false };
    }

    // Calculate start position (calendar days from view start)
    // If booking starts before view, start at day 0
    const startOffset = Math.max(0, differenceInCalendarDays(bookingStart, viewStart));

    // Calculate end position
    // checkOutDate is exclusive (guest leaves that day, doesn't stay)
    // So the bar should end at checkOutDate - 1
    const endOffset = Math.min(
      dates.length,
      differenceInCalendarDays(bookingEnd, viewStart) // NOT +1, because checkout day is not included
    );

    // Calculate width in days
    const widthDays = endOffset - startOffset;

    // If no days to show (shouldn't happen but safety check)
    if (widthDays <= 0) {
      return { left: 0, width: 0, visible: false };
    }

    return {
      left: startOffset * DAY_COLUMN_WIDTH,
      width: widthDays * DAY_COLUMN_WIDTH - 4, // -4 for padding between bars
      visible: true,
    };
  };

  // Check if date is today
  const today = new Date();
  const isToday = (date: Date) => isSameDay(date, today);

  // Check if date is Sunday (day 0)
  const isSunday = (date: Date) => date.getDay() === 0;

  // Check if an item has a booking on a specific date
  const hasBookingOnDate = (itemId: string, date: Date): boolean => {
    if (!data) return false;
    const checkDate = startOfDay(date);
    return data.bookings.some((b) => {
      if (b.itemId !== itemId) return false;
      const bookingStart = startOfDay(parseISO(b.checkInDate));
      const bookingEnd = startOfDay(parseISO(b.checkOutDate));
      // Check if date is within booking range [checkIn, checkOut)
      return checkDate >= bookingStart && checkDate < bookingEnd;
    });
  };

  // Get day abbreviation
  const getDayAbbr = (date: Date) => {
    const dayIndex = date.getDay();
    return locale === "vi" ? WEEKDAY_ABBR_VI[dayIndex] : WEEKDAY_ABBR_EN[dayIndex];
  };

  if (!data && !loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        {locale === "vi" ? "Không có dữ liệu" : "No data available"}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="relative overflow-x-auto">
        {/* Header Row - Date Headers */}
        <div
          className="flex border-b border-gray-300"
          style={{ minWidth: ITEM_COLUMN_WIDTH + dates.length * DAY_COLUMN_WIDTH }}
        >
          {/* Fixed Item Column Header */}
          <div
            className="sticky left-0 z-20 bg-white border-r border-gray-300 flex items-end px-3 py-2 font-medium text-sm text-gray-700 flex-shrink-0"
            style={{ minWidth: ITEM_COLUMN_WIDTH, width: ITEM_COLUMN_WIDTH }}
          >
            {locale === "vi" ? "Lều/Phòng" : "Tent/Room"}
          </div>

          {/* Date Column Headers */}
          <div className="flex">
            {dates.map((date, index) => {
              const sunday = isSunday(date);
              const todayDate = isToday(date);

              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 border-r border-gray-200 text-xs flex-shrink-0",
                    sunday && "bg-amber-50",
                    todayDate && "bg-blue-50"
                  )}
                  style={{ width: DAY_COLUMN_WIDTH, minWidth: DAY_COLUMN_WIDTH }}
                >
                  <span className={cn(
                    "text-gray-500",
                    todayDate && "text-blue-600 font-medium"
                  )}>
                    {getDayAbbr(date)}
                  </span>
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      todayDate ? "text-blue-600" : "text-gray-800"
                    )}
                  >
                    {format(date, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Rows */}
        <div className={cn("relative", loading && "opacity-50")}>
          {data?.categories.map((category) => {
            const isCollapsed = collapsedCategories.has(category.id);

            return (
              <div key={category.id}>
                {/* Category Header Row */}
                <div
                  className="flex border-b border-gray-200"
                  style={{ minWidth: ITEM_COLUMN_WIDTH + dates.length * DAY_COLUMN_WIDTH }}
                >
                  <button
                    className="sticky left-0 z-20 bg-white border-r border-gray-300 flex items-center gap-2 px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-50 transition-colors text-left flex-shrink-0"
                    style={{ minWidth: ITEM_COLUMN_WIDTH, width: ITEM_COLUMN_WIDTH }}
                    onClick={() => toggleCategory(category.id)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="font-semibold uppercase truncate">
                      {category.name}
                    </span>
                    {(category.bookingCount ?? 0) > 0 && (
                      <span className="text-gray-500 font-normal">
                        ({category.bookingCount})
                      </span>
                    )}
                  </button>

                  {/* Empty cells for dates - category row */}
                  <div
                    className="flex"
                    style={{ width: dates.length * DAY_COLUMN_WIDTH, minWidth: dates.length * DAY_COLUMN_WIDTH }}
                  >
                    {dates.map((date, index) => (
                      <div
                        key={index}
                        className={cn(
                          "border-r border-gray-100 flex-shrink-0 h-10",
                          isSunday(date) && "bg-amber-50/50",
                          isToday(date) && "bg-blue-50/50"
                        )}
                        style={{ width: DAY_COLUMN_WIDTH, minWidth: DAY_COLUMN_WIDTH }}
                      />
                    ))}
                  </div>
                </div>

                {/* Item Rows (if category is expanded) */}
                {!isCollapsed &&
                  category.items.map((item) => {
                    const bookings = getBookingsForItem(item.id);

                    return (
                      <div
                        key={item.id}
                        className="group flex border-b border-gray-100 hover:bg-blue-50/50 transition-colors"
                        style={{ minWidth: ITEM_COLUMN_WIDTH + dates.length * DAY_COLUMN_WIDTH }}
                      >
                        {/* Item Name Cell */}
                        <div
                          className="sticky left-0 z-20 bg-white group-hover:bg-blue-50/50 border-r border-gray-200 flex items-center px-3 py-2 text-sm text-gray-700 flex-shrink-0 transition-colors"
                          style={{ minWidth: ITEM_COLUMN_WIDTH, width: ITEM_COLUMN_WIDTH }}
                        >
                          <span className="pl-6 truncate" title={item.name}>
                            {item.name}
                          </span>
                        </div>

                        {/* Booking Bar Container */}
                        <div
                          className="relative"
                          style={{
                            height: "40px",
                            width: dates.length * DAY_COLUMN_WIDTH,
                            minWidth: dates.length * DAY_COLUMN_WIDTH
                          }}
                        >
                          {/* Background grid */}
                          <div className="absolute inset-0 flex">
                            {dates.map((date, index) => {
                              const hasBooking = hasBookingOnDate(item.id, date);
                              return (
                                <div
                                  key={index}
                                  className={cn(
                                    "border-r border-gray-100 flex-shrink-0 relative group/cell",
                                    isSunday(date) && "bg-amber-50/30",
                                    isToday(date) && "bg-blue-50/30",
                                    !hasBooking && onEmptyCellClick && "cursor-pointer"
                                  )}
                                  style={{ width: DAY_COLUMN_WIDTH, minWidth: DAY_COLUMN_WIDTH }}
                                  onClick={() => !hasBooking && onEmptyCellClick?.(item.id, date)}
                                >
                                  {!hasBooking && onEmptyCellClick && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover/cell:opacity-60 transition-opacity">
                                      <Plus className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Booking Bars */}
                          {bookings.map((booking) => {
                            const barStyle = getBookingBarStyle(booking);
                            if (!barStyle.visible) return null;

                            const statusColor =
                              CUSTOMER_CALENDAR_STATUS_COLORS[booking.status] ||
                              "bg-blue-500";

                            return (
                              <button
                                key={`${booking.id}-${booking.itemId}`}
                                className={cn(
                                  "absolute top-1.5 h-7 text-xs text-white font-medium flex items-center overflow-hidden hover:opacity-90 transition-opacity cursor-pointer shadow-sm z-10",
                                  statusColor
                                )}
                                style={{
                                  left: barStyle.left + 10, // Shift right so right edge overlaps grid line
                                  width: Math.max(barStyle.width, 28),
                                  borderRadius: '0 10px 0 10px',
                                }}
                                onClick={() => onBookingClick?.(booking)}
                                title={`${booking.customerName} (${booking.bookingCode})`}
                              >
                                <span className="truncate px-3">
                                  {booking.customerName}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}

          {/* Empty state */}
          {data?.categories.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-500">
              {locale === "vi"
                ? "Không có lều/phòng nào"
                : "No tents/rooms available"}
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
