"use client";

import { cn } from "@/lib/utils";
import type { CalendarEvent, EventBarPosition } from "./calendar-types";
import { STATUS_COLORS } from "./calendar-types";

interface BookingCalendarEventBarProps {
  event: CalendarEvent;
  position: EventBarPosition;
  /** True if this is a week continuation (booking started before this week) */
  isWeekContinuation?: boolean;
  /** True if booking continues after this week */
  continuesAfterWeek?: boolean;
  onClick?: () => void;
  locale: string;
}

export function BookingCalendarEventBar({
  event,
  position,
  isWeekContinuation = false,
  continuesAfterWeek = false,
  onClick,
  locale,
}: BookingCalendarEventBarProps) {
  const statusColors = STATUS_COLORS[event.status] || STATUS_COLORS.pending;

  // Format date range for multi-day display
  const formatDateRange = () => {
    const checkIn = new Date(event.checkInDate);
    const checkOut = new Date(event.checkOutDate);
    const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${formatDate(checkIn)} - ${formatDate(checkOut)}`;
  };

  // Determine rounded corners based on position and continuation
  const getRoundedClass = () => {
    if (position === 'single' && !isWeekContinuation && !continuesAfterWeek) return 'rounded-md';
    if (position === 'single' && isWeekContinuation && !continuesAfterWeek) return 'rounded-r-md rounded-l-none';
    if (position === 'single' && !isWeekContinuation && continuesAfterWeek) return 'rounded-l-md rounded-r-none';
    if (position === 'single' && isWeekContinuation && continuesAfterWeek) return 'rounded-none';
    if (position === 'start' && isWeekContinuation) return 'rounded-none';
    if (position === 'start') return 'rounded-l-md rounded-r-none';
    if (position === 'end' && continuesAfterWeek) return 'rounded-none';
    if (position === 'end') return 'rounded-r-md rounded-l-none';
    return 'rounded-none';
  };

  // Determine if we should show arrows for continuation
  // Left arrow: only when booking started before this week (week continuation)
  const showLeftArrow = isWeekContinuation;
  // Right arrow: only when booking continues after this week
  const showRightArrow = continuesAfterWeek;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-1.5 py-0.5 text-xs font-medium truncate",
        "transition-all hover:opacity-80 cursor-pointer",
        "flex items-center gap-1 min-h-[22px]",
        statusColors.bg,
        statusColors.text,
        getRoundedClass()
      )}
      title={`${event.customerName} - ${event.itemName} (${formatDateRange()})`}
    >
      {/* Left arrow for continuation */}
      {showLeftArrow && (
        <span className="flex-shrink-0 text-[10px] opacity-60">&larr;</span>
      )}

      {/* Status dot - show when: start, single, or when showing any arrow (boundary of week) */}
      {(position === 'start' || position === 'single' || showLeftArrow || showRightArrow) && (
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColors.dot)} />
      )}

      {/* Customer name - show when: start, single, or when showing any arrow (boundary of week) */}
      {(position === 'start' || position === 'single' || showLeftArrow || showRightArrow) ? (
        <span className="truncate flex-1">{event.customerName}</span>
      ) : (
        <span className="flex-1" />
      )}

      {/* Right arrow for continuation */}
      {showRightArrow && (
        <span className="flex-shrink-0 text-[10px] opacity-60">&rarr;</span>
      )}
    </button>
  );
}

/**
 * Determine the position of an event bar for a specific date
 */
export function getEventBarPosition(
  event: CalendarEvent,
  date: string,
  weekStart: Date,
  weekEnd: Date
): EventBarPosition {
  // Create new Date objects to avoid mutation
  const eventStart = new Date(event.checkInDate);
  const eventEnd = new Date(event.checkOutDate);
  const currentDate = new Date(date);
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekEnd);

  // Reset time for comparison
  eventStart.setHours(0, 0, 0, 0);
  eventEnd.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  weekStartDate.setHours(0, 0, 0, 0);
  weekEndDate.setHours(0, 0, 0, 0);

  // Is this the actual start of the booking?
  const isActualStart = currentDate.getTime() === eventStart.getTime();
  // Is this the start of a new week (for multi-week bookings)?
  const isWeekStart = currentDate.getTime() === weekStartDate.getTime() && currentDate.getTime() > eventStart.getTime();
  // Is this the visual start? (either actual start or beginning of week)
  const isVisualStart = isActualStart || isWeekStart;

  // Is this the actual end of the booking? (checkout day)
  const isActualEnd = currentDate.getTime() === eventEnd.getTime();
  // Is this the end of the week? (and booking continues after)
  const isWeekEnd = currentDate.getTime() === weekEndDate.getTime() && currentDate.getTime() < eventEnd.getTime();
  // Is this the visual end?
  const isVisualEnd = isActualEnd || isWeekEnd;

  // Single cell: both start and end on the same day (check-in === check-out, which shouldn't normally happen)
  if (isVisualStart && isVisualEnd) {
    return 'single';
  }

  if (isVisualStart) {
    return 'start';
  }

  if (isVisualEnd) {
    return 'end';
  }

  return 'middle';
}

/**
 * Calculate how many days an event spans starting from a given date within a week
 */
export function getEventSpan(
  event: CalendarEvent,
  startDate: Date,
  weekEnd: Date
): number {
  const eventEnd = new Date(event.checkOutDate);
  eventEnd.setHours(0, 0, 0, 0);

  // Calculate the end date for the span (min of checkout date and week end)
  const spanEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

  // Calculate the number of days
  const diffTime = spanEnd.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(1, diffDays);
}
