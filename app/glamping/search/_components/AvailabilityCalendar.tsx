"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isBefore,
  startOfDay,
  isSameDay,
  parseISO
} from "date-fns";
import { vi } from "date-fns/locale";

interface AvailabilityCalendarProps {
  itemId: string;
  itemName: string;
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
}

interface DayAvailability {
  date: string;
  available: boolean;
  reason?: string;
}

export function AvailabilityCalendar({
  itemId,
  itemName,
  checkInDate,
  checkOutDate
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availabilityData, setAvailabilityData] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch availability data for current month
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

        const response = await fetch(
          `/api/glamping/availability/calendar?itemId=${itemId}&startDate=${monthStart}&endDate=${monthEnd}`
        );

        if (response.ok) {
          const data = await response.json();
          setAvailabilityData(data.availability || []);
        }
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [itemId, currentMonth]);

  // Navigate months
  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Get calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  // Get day status
  const getDayStatus = (day: Date): 'available' | 'unavailable' | 'booked' | 'selected' => {
    const today = startOfDay(new Date());
    const dayStart = startOfDay(day);

    // Check if in selected range
    if (checkInDate && checkOutDate) {
      const checkIn = startOfDay(checkInDate);
      const checkOut = startOfDay(checkOutDate);
      if ((isSameDay(dayStart, checkIn) || isSameDay(dayStart, checkOut)) ||
          (dayStart > checkIn && dayStart < checkOut)) {
        return 'selected';
      }
    }

    // Past dates are unavailable
    if (isBefore(dayStart, today)) {
      return 'unavailable';
    }

    // Check availability data
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayData = availabilityData.find(d => d.date === dateStr);

    if (dayData) {
      return dayData.available ? 'available' : 'booked';
    }

    // Default to available for future dates without data
    return 'available';
  };

  // Get day class name based on status
  const getDayClassName = (day: Date, status: string) => {
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const baseClasses = "flex items-center justify-center h-16 border border-white text-center transition-colors";

    if (!isCurrentMonth) {
      return `${baseClasses} text-gray-300 bg-gray-50`;
    }

    switch (status) {
      case 'available':
        return `${baseClasses} bg-green-200 text-gray-900 hover:bg-green-300 cursor-pointer`;
      case 'booked':
        return `${baseClasses} bg-orange-300 text-gray-900`;
      case 'unavailable':
        return `${baseClasses} bg-gray-200 text-gray-500`;
      case 'selected':
        return `${baseClasses} bg-green-300 text-gray-900 border-2 border-green-700`;
      default:
        return `${baseClasses} bg-white text-gray-900`;
    }
  };

  // Weekday headers
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-6">
      {/* Item Name */}
      <h2 className="text-2xl font-bold">{itemName}</h2>

      {/* Month Navigation */}
      <div className="flex items-center justify-between border-b pb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={previousMonth}
          className="h-10 w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h3 className="text-xl font-semibold">
          {format(currentMonth, 'MMMM yyyy', { locale: vi })}
        </h3>

        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          className="h-10 w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-sm font-semibold text-gray-700 border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const status = getDayStatus(day);
            return (
              <div
                key={index}
                className={getDayClassName(day, status)}
              >
                <span className="text-lg font-medium">
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-200 border border-gray-300 rounded"></div>
          <span className="text-sm font-medium">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-300 border border-gray-300 rounded"></div>
          <span className="text-sm font-medium text-red-600">ĐÃ HẾT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 border border-gray-300 rounded"></div>
          <span className="text-sm font-medium">Unavailable</span>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="text-gray-600">Đang tải...</div>
        </div>
      )}
    </div>
  );
}
