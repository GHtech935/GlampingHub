"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarDayData } from "./calendar-types";
import { STATUS_COLORS } from "./calendar-types";

interface BookingCalendarProps {
  days: Record<string, CalendarDayData>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick: (date: string, events: CalendarEvent[]) => void;
  onEventClick: (event: CalendarEvent) => void;
  locale: string;
  loading?: boolean;
  showAllBookings?: boolean;
}

const WEEKDAYS_VI = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface WeekEvent {
  event: CalendarEvent;
  startCol: number; // 0-6 (Monday to Sunday)
  colSpan: number;  // 1-7
  continuesBefore: boolean; // Booking started before this week
  continuesAfter: boolean;  // Booking continues after this week
}

export function BookingCalendar({
  days,
  currentMonth,
  onMonthChange,
  onDayClick,
  onEventClick,
  locale,
  loading = false,
  showAllBookings = false,
}: BookingCalendarProps) {
  const weekdays = locale === 'vi' ? WEEKDAYS_VI : WEEKDAYS_EN;
  const months = locale === 'vi' ? MONTHS_VI : MONTHS_EN;

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const result: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean }> = [];

    const prevMonth = new Date(year, month, 0);
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      result.push({
        date,
        dateStr: date.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      result.push({
        date,
        dateStr: date.toISOString().split('T')[0],
        isCurrentMonth: true,
      });
    }

    const remainingDays = 42 - result.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      result.push({
        date,
        dateStr: date.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }

    return result;
  }, [currentMonth]);

  const today = new Date().toISOString().split('T')[0];

  const goToToday = () => onMonthChange(new Date());
  const goToPrevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };
  const goToNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  // Group calendar days into weeks
  const weeks = useMemo(() => {
    const result: typeof calendarDays[] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  // Get events for a week with their positions
  const getWeekEvents = (week: typeof calendarDays): WeekEvent[] => {
    const eventMap = new Map<string, WeekEvent>();

    // For each day in the week, check which events appear
    week.forEach((day, dayIndex) => {
      const dayData = days[day.dateStr];
      if (!dayData?.events) return;

      dayData.events.forEach((event) => {
        const key = `${event.id}-${event.itemId}`;

        if (eventMap.has(key)) {
          // Event already exists, extend the endCol
          const existing = eventMap.get(key)!;
          existing.colSpan = dayIndex - existing.startCol + 1;
        } else {
          // New event - starts at this day
          const checkInDate = event.checkInDate.split('T')[0]; // Normalize to YYYY-MM-DD
          const checkOutDate = event.checkOutDate.split('T')[0];
          const weekStartDate = week[0].dateStr;
          const weekEndDate = week[6].dateStr;

          eventMap.set(key, {
            event,
            startCol: dayIndex,
            colSpan: 1,
            continuesBefore: checkInDate < weekStartDate,
            continuesAfter: checkOutDate > weekEndDate,
          });
        }
      });
    });

    return Array.from(eventMap.values());
  };

  // Maximum visible event rows per week (unlimited when showAllBookings is true)
  const MAX_EVENT_ROWS = showAllBookings ? Infinity : 3;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            {locale === 'vi' ? 'Hôm nay' : 'Today'}
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <h2 className="text-lg font-semibold">
          {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <div className="w-[100px]" />
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-2 text-center text-sm font-medium text-gray-600",
              index === 5 || index === 6 ? "bg-gray-50" : ""
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={cn("relative", loading && "opacity-50")}>
        {weeks.map((week, weekIndex) => {
          const weekEvents = getWeekEvents(week);
          const visibleEvents = weekEvents.slice(0, MAX_EVENT_ROWS);
          const hiddenCount = weekEvents.length - MAX_EVENT_ROWS;

          return (
            <div key={weekIndex} className="border-b border-gray-200 last:border-b-0">
              {/* Day numbers row */}
              <div className="grid grid-cols-7">
                {week.map((day, dayIndex) => {
                  const dayData = days[day.dateStr];
                  const isToday = day.dateStr === today;
                  const isWeekend = dayIndex === 5 || dayIndex === 6;

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => dayData?.events?.length && onDayClick(day.dateStr, dayData.events)}
                      className={cn(
                        "px-2 py-1 text-left border-r border-gray-200 last:border-r-0",
                        "hover:bg-gray-100 transition-colors",
                        !day.isCurrentMonth && "bg-gray-50",
                        isWeekend && day.isCurrentMonth && "bg-gray-50/50",
                        dayData?.events?.length && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full",
                            isToday && "bg-primary text-white font-semibold",
                            !isToday && day.isCurrentMonth && "text-gray-900",
                            !isToday && !day.isCurrentMonth && "text-gray-400"
                          )}
                        >
                          {day.date?.getDate()}
                        </span>
                        {dayData && dayData.totalBookings > 0 && (
                          <span className="text-xs text-gray-500">
                            {dayData.totalBookings} {locale === 'vi' ? 'đặt' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Event rows - spanning across columns */}
              <div className="relative min-h-[100px]">
                {/* Background grid lines */}
                <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "border-r border-gray-200 last:border-r-0",
                        (i === 5 || i === 6) && "bg-gray-50/50"
                      )}
                    />
                  ))}
                </div>
                {/* Events layer */}
                <div className="relative grid grid-cols-7 gap-y-0.5 px-0.5 py-0.5">
                  {visibleEvents.map((weekEvent, eventIndex) => {
                    const { event, startCol, colSpan, continuesBefore, continuesAfter } = weekEvent;
                    const statusColors = STATUS_COLORS[event.status] || STATUS_COLORS.pending;

                    // Format date range
                    const formatDate = (d: string) => {
                      const date = new Date(d);
                      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    };

                    return (
                      <button
                        key={`${event.id}-${event.itemId}`}
                        type="button"
                        onClick={() => onEventClick(event)}
                        className={cn(
                          "text-left px-2 py-0.5 text-xs font-medium",
                          "transition-all hover:opacity-80 cursor-pointer",
                          "flex items-center gap-1.5 min-h-[22px] overflow-hidden",
                          statusColors.bg,
                          statusColors.text,
                          // Rounded corners based on continuation
                          !continuesBefore && !continuesAfter && "rounded-md mx-0.5",
                          continuesBefore && !continuesAfter && "rounded-r-md ml-0 mr-0.5",
                          !continuesBefore && continuesAfter && "rounded-l-md ml-0.5 mr-0",
                          continuesBefore && continuesAfter && "rounded-none mx-0"
                        )}
                        style={{
                          gridColumn: `${startCol + 1} / span ${colSpan}`,
                          gridRow: eventIndex + 1,
                        }}
                        title={`${event.customerName} - ${event.itemName}${event.tentCount && event.tentCount > 1 ? ` (${event.tentCount} lều)` : ''} (${formatDate(event.checkInDate)} - ${formatDate(event.checkOutDate)})`}
                      >
                        {/* Left arrow for continuation from previous week */}
                        {continuesBefore && (
                          <span className="flex-shrink-0 text-[10px] opacity-60">‹</span>
                        )}

                        {/* Status dot */}
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColors.dot)} />

                        {/* Customer name */}
                        <span className="truncate min-w-0">{event.customerName}</span>

                        {/* Tent count badge if multiple */}
                        {event.tentCount && event.tentCount > 1 && (
                          <span className="flex-shrink-0 bg-white/30 px-1 rounded text-[10px]">
                            {event.tentCount}
                          </span>
                        )}

                        {/* Date range - always show */}
                        <span className="text-[10px] opacity-70 flex-shrink-0 ml-auto">
                          {formatDate(event.checkInDate)} - {formatDate(event.checkOutDate)}
                        </span>

                        {/* Right arrow for continuation to next week */}
                        {continuesAfter && (
                          <span className="flex-shrink-0 text-[10px] opacity-60">›</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* "+X more" indicators per day */}
                {hiddenCount > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 grid grid-cols-7 pointer-events-none">
                    {week.map((day, dayIndex) => {
                      const dayEvents = days[day.dateStr]?.events || [];
                      const dayHiddenCount = dayEvents.length - MAX_EVENT_ROWS;
                      if (dayHiddenCount <= 0) return <div key={day.dateStr} />;

                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => onDayClick(day.dateStr, dayEvents)}
                          className="pointer-events-auto text-xs text-gray-500 hover:text-gray-700 px-1 pb-0.5 text-left"
                        >
                          +{dayHiddenCount} {locale === 'vi' ? 'khác' : 'more'}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
