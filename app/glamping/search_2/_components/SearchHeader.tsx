"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface SearchHeaderProps {
  dateRange: {
    checkIn: Date | null;
    checkOut: Date | null;
  };
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function SearchHeader({ dateRange, viewMode, onViewModeChange }: SearchHeaderProps) {
  const formatDateRange = () => {
    if (!dateRange.checkIn || !dateRange.checkOut) {
      return "Chọn ngày để tìm kiếm";
    }

    const checkInStr = format(dateRange.checkIn, 'EEE d MMM', { locale: vi });
    const checkOutStr = format(dateRange.checkOut, 'EEE d MMM, yyyy', { locale: vi });

    return `New Booking: ${checkInStr} - ${checkOutStr}`;
  };

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Date Range Display */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {formatDateRange()}
        </h1>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 mr-2">View:</span>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
        >
          <LayoutGrid className="w-4 h-4 mr-1" />
          Chi tiết
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('list')}
        >
          <List className="w-4 h-4 mr-1" />
          List
        </Button>
      </div>
    </div>
  );
}
