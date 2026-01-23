"use client";

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, ChevronLeft, ChevronRight, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalendarDate {
  date: string;
  status: 'available' | 'booked' | 'blocked' | 'maintenance';
  price: number | null;
  notes: string | null;
  booking: {
    id: string;
    reference: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    adults: number;
    children: number;
    check_in_date: string;
    check_out_date: string;
    status: string;
    payment_status: string;
    is_check_in_day: boolean;
    is_check_out_day: boolean;
  } | null;
}

interface Pitch {
  pitch_id: string;
  pitch_name: string;
  pitch_slug: string;
  max_guests: number;
  ground_type: string;
  campsite_id: string;
  campsite_name: string;
  dates: Record<string, CalendarDate>;
}

interface CalendarGridProps {
  pitches: Pitch[];
  dates: string[];
  onDateClick: (pitch: Pitch, date: string, dateData: CalendarDate) => void;
  onDateRangeSelect?: (pitch: Pitch, startDate: string, endDate: string) => void;
}

export function CalendarGrid({
  pitches,
  dates,
  onDateClick,
  onDateRangeSelect
}: CalendarGridProps) {
  const t = useTranslations('admin.calendarPage');
  const [selectedRange, setSelectedRange] = useState<{
    pitchId: string;
    startDate: string;
    endDate: string | null;
  } | null>(null);

  // Helper to extract pitch name from JSONB or string
  const getPitchName = (name: any): string => {
    if (typeof name === 'string') return name;
    if (typeof name === 'object' && name !== null) {
      return name.vi || name.en || 'Unknown';
    }
    return 'Unknown';
  };

  // Helper to extract ground type from JSONB or string
  const getGroundType = (type: any): string => {
    if (typeof type === 'string') return type;
    if (typeof type === 'object' && type !== null) {
      return type.vi || type.en || 'Unknown';
    }
    return 'Unknown';
  };

  // Get status color - only 2 colors: green (available) and blue (booked)
  const getStatusColor = (status: string, dateData?: CalendarDate) => {
    // All booked states use the same blue color
    if (dateData?.booking) {
      return 'bg-blue-500'; // Đã đặt - xanh nước biển
    }

    switch (status) {
      case 'available':
        return 'bg-green-500'; // Còn trống - xanh lá
      case 'booked':
        return 'bg-blue-500'; // Đã đặt - xanh nước biển
      case 'blocked':
        return 'bg-gray-700';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  // Get status text
  const getStatusText = (status: string, dateData?: CalendarDate) => {
    if (dateData?.booking?.is_check_in_day) {
      return t('status.checkIn');
    }
    if (dateData?.booking?.is_check_out_day) {
      return t('status.checkOut');
    }

    switch (status) {
      case 'available':
        return t('status.available');
      case 'booked':
        return t('status.booked');
      case 'blocked':
        return t('status.blocked');
      case 'maintenance':
        return t('status.maintenance');
      default:
        return 'N/A';
    }
  };

  // Format date for display - parse YYYY-MM-DD string directly to avoid timezone issues
  const formatDateHeader = (dateStr: string) => {
    // Parse date string directly without timezone conversion
    const [year, month, dayNum] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, dayNum);
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = t(`modal.dayShortNames.${dayKeys[date.getDay()]}`);
    return (
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-gray-600">{day}</span>
        <span className="text-sm font-semibold">{`${dayNum}/${month}`}</span>
      </div>
    );
  };

  // Handle cell click
  const handleCellClick = (pitch: Pitch, date: string, dateData: CalendarDate) => {
    onDateClick(pitch, date, dateData);
  };

  // Handle cell mouse down for range selection
  const handleCellMouseDown = (pitchId: string, date: string) => {
    setSelectedRange({ pitchId, startDate: date, endDate: null });
  };

  // Handle cell mouse enter for range selection
  const handleCellMouseEnter = (pitchId: string, date: string) => {
    if (selectedRange && selectedRange.pitchId === pitchId) {
      setSelectedRange({ ...selectedRange, endDate: date });
    }
  };

  // Handle mouse up for range selection
  const handleMouseUp = () => {
    if (selectedRange && selectedRange.endDate) {
      const pitch = pitches.find(p => p.pitch_id === selectedRange.pitchId);
      if (pitch && onDateRangeSelect) {
        onDateRangeSelect(pitch, selectedRange.startDate, selectedRange.endDate);
      }
    }
    setSelectedRange(null);
  };

  // Check if date is in selected range
  const isInSelectedRange = (pitchId: string, date: string) => {
    if (!selectedRange || selectedRange.pitchId !== pitchId || !selectedRange.endDate) {
      return false;
    }
    const start = new Date(selectedRange.startDate);
    const end = new Date(selectedRange.endDate);
    const current = new Date(date);
    return current.getTime() >= Math.min(start.getTime(), end.getTime()) &&
           current.getTime() <= Math.max(start.getTime(), end.getTime());
  };

  // Check booking position (start, middle, end, single)
  const getBookingPosition = (dateData: CalendarDate | undefined): 'start' | 'middle' | 'end' | 'single' | null => {
    if (!dateData?.booking) return null;

    const isStart = dateData.booking.is_check_in_day;
    const isEnd = dateData.booking.is_check_out_day;

    if (isStart && isEnd) return 'single';
    if (isStart) return 'start';
    if (isEnd) return 'end';
    return 'middle';
  };

  // Get today's date string for comparison
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Calendar grid */}
      <div className="overflow-x-auto" onMouseUp={handleMouseUp}>
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-r bg-gray-50 sticky left-0 z-20 min-w-[200px]">
                {t('grid.pitch')}
              </th>
              {dates.map((date) => {
                const isToday = date === todayString;
                return (
                  <th
                    key={date}
                    className={cn(
                      "px-2 py-2 text-center border-b border-r min-w-[80px]",
                      isToday && "bg-blue-100"
                    )}
                  >
                    {formatDateHeader(date)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pitches.map((pitch) => (
              <tr key={pitch.pitch_id} className="border-b hover:bg-gray-50">
                {/* Pitch name column - sticky */}
                <td className="px-3 py-2 border-r bg-white sticky left-0 z-10">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{getPitchName(pitch.pitch_name)}</div>
                    <div className="text-xs text-gray-500">{pitch.campsite_name}</div>
                  </div>
                </td>

                {/* Date cells */}
                {dates.map((date) => {
                  const dateData = pitch.dates[date];
                  const status = dateData?.status || 'available';
                  const isSelected = isInSelectedRange(pitch.pitch_id, date);
                  const bookingPosition = getBookingPosition(dateData);
                  const isToday = date === todayString;

                  // Determine rounded class based on booking position
                  const roundedClass = bookingPosition === 'start' ? 'rounded-l'
                    : bookingPosition === 'end' ? 'rounded-r'
                    : bookingPosition === 'middle' ? ''
                    : 'rounded'; // single or no booking

                  // Hide right border for booking cells that are not the end
                  const hideBorder = bookingPosition === 'start' || bookingPosition === 'middle';

                  return (
                    <td
                      key={date}
                      className={cn(
                        "py-1 cursor-pointer relative group",
                        dateData?.booking ? "px-0" : "px-1",
                        hideBorder ? "" : "border-r",
                        isSelected && "bg-blue-100",
                        isToday && "bg-blue-100"
                      )}
                      onClick={() => dateData && handleCellClick(pitch, date, dateData)}
                      onMouseDown={() => handleCellMouseDown(pitch.pitch_id, date)}
                      onMouseEnter={() => handleCellMouseEnter(pitch.pitch_id, date)}
                    >
                      <div className="flex flex-col items-center">
                        {/* Status indicator with price inside */}
                        <div
                          className={cn(
                            "w-full h-10 flex flex-col items-center justify-center",
                            roundedClass,
                            getStatusColor(status, dateData)
                          )}
                          title={getStatusText(status, dateData)}
                        >
                          {dateData?.booking ? (
                            // Only show booking info on start cell, spanning across all booking days
                            (bookingPosition === 'start' || bookingPosition === 'single') ? (
                              (() => {
                                const checkIn = new Date(dateData.booking.check_in_date);
                                const checkOut = new Date(dateData.booking.check_out_date);
                                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                                const spanWidth = nights * 80;
                                return (
                                  <span
                                    className="absolute left-0 top-1/2 -translate-y-1/2 text-white font-medium truncate px-2 z-10 pointer-events-none"
                                    style={{ width: `${spanWidth}px`, fontSize: '10px' }}
                                  >
                                    {dateData.booking.reference} - {dateData.booking.guest_name}
                                  </span>
                                );
                              })()
                            ) : null
                          ) : null}

                          {/* Notes indicator */}
                          {dateData?.notes && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full" />
                          )}
                        </div>

                      </div>

                      {/* Hover tooltip */}
                      <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-30">
                        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          {getStatusText(status, dateData)}
                          {dateData?.booking && (
                            <>
                              <br />
                              {dateData.booking.guest_name}
                              <br />
                              {dateData.booking.reference}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend - only 2 colors */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700">{t('status.available')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700">{t('status.booked')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
