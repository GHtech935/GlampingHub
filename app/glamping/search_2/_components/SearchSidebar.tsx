"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface SearchSidebarProps {
  dateRange: {
    checkIn: Date | null;
    checkOut: Date | null;
  };
  onDateRangeChange: (range: { checkIn: Date | null; checkOut: Date | null }) => void;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
}

export function SearchSidebar({
  dateRange,
  onDateRangeChange,
  currentMonth,
  onMonthChange
}: SearchSidebarProps) {
  return (
    <div className="h-full bg-white p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tìm kiếm</h2>
      </div>

      {/* Check-in Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Check-in:
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.checkIn ? (
                format(dateRange.checkIn, 'dd/MM/yyyy', { locale: vi })
              ) : (
                <span className="text-gray-500">Chọn ngày</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.checkIn || undefined}
              onSelect={(date) =>
                onDateRangeChange({ ...dateRange, checkIn: date || null })
              }
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Check-out Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Check-out:
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.checkOut ? (
                format(dateRange.checkOut, 'dd/MM/yyyy', { locale: vi })
              ) : (
                <span className="text-gray-500">Chọn ngày</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.checkOut || undefined}
              onSelect={(date) =>
                onDateRangeChange({ ...dateRange, checkOut: date || null })
              }
              disabled={(date) => {
                const today = new Date(new Date().setHours(0, 0, 0, 0));
                if (date < today) return true;
                if (dateRange.checkIn && date <= dateRange.checkIn) return true;
                return false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Inline Calendar */}
      <div className="border-t pt-6">
        <div className="scale-90 origin-top-left -ml-2">
          <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={onMonthChange}
            className="w-full"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>
      </div>
    </div>
  );
}
