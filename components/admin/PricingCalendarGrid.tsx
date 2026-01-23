"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, List, Tent, Truck, Bus, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useTranslations } from "next-intl";

// Pitch type configuration with icons
const pitchTypeConfig: Record<string, { icon: React.ReactNode }> = {
  tent: { icon: <Tent className="w-4 h-4" /> },
  roof_tent: { icon: <Tent className="w-4 h-4" /> },
  trailer_tent: { icon: <Tent className="w-4 h-4" /> },
  campervan: { icon: <Truck className="w-4 h-4" /> },
  motorhome: { icon: <Truck className="w-4 h-4" /> },
  touring_caravan: { icon: <Bus className="w-4 h-4" /> },
};

// Pitch type display order
const pitchTypeOrder: string[] = [
  'tent',
  'roof_tent',
  'trailer_tent',
  'campervan',
  'motorhome',
  'touring_caravan',
];

// Sort pitch types by predefined order
const sortPitchTypes = (types: string[]): string[] => {
  return [...types].sort((a, b) => {
    const indexA = pitchTypeOrder.indexOf(a);
    const indexB = pitchTypeOrder.indexOf(b);
    // If not found in order, put at the end
    const orderA = indexA === -1 ? 999 : indexA;
    const orderB = indexB === -1 ? 999 : indexB;
    return orderA - orderB;
  });
};

// NEW SCHEMA V2: pricesByType is now just Record<string, number>
// Shared fields (minStay, extraAdultPrice, extraChildPrice) are at CalendarDay level
interface CalendarDay {
  date: string;
  // Shared fields (same for all pitch types)
  minStay: number;
  extraAdultPrice: number;
  extraChildPrice: number;
  // Per-type prices (only price varies)
  pricesByType: Record<string, number>;
  // Shared status (same for all pitch types)
  status: string;
  // Availability
  arrivalAllowed: boolean | null;
  departureAllowed: boolean | null;
  notes: string | null;
}

interface PricingCalendarGridProps {
  pitchId: string;
  pitchName: string;
  pitchTypes: string[];
  calendarData: CalendarDay[];
  fromDate: string;
  toDate: string;
  onDateRangeChange: (from: string, to: string) => void;
  onPriceChange?: (date: string, pitchType: string, price: number) => void;
  onOpenUpdateModal?: () => void;
}


export function PricingCalendarGrid({
  pitchId,
  pitchName,
  pitchTypes,
  calendarData,
  fromDate,
  toDate,
  onDateRangeChange,
  onPriceChange,
  onOpenUpdateModal,
}: PricingCalendarGridProps) {
  const t = useTranslations('admin.pricingPage');
  const tPitchTypes = useTranslations('pitch.types');
  // Track editing cell as "date|pitchType"
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number | undefined>(undefined);

  // Helper to extract pitch name from JSONB or string
  const getPitchName = (name: any): string => {
    if (typeof name === 'string') return name;
    if (typeof name === 'object' && name !== null) {
      return name.vi || name.en || 'Unknown';
    }
    return 'Unknown';
  };

  // Get weekday short name
  const getWeekdayShort = (dayIndex: number): string => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return t(`weekdays.${days[dayIndex]}`);
  };

  // Get weekday full name
  const getWeekdayFull = (dayIndex: number): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return t(`weekdays.${days[dayIndex]}`);
  };

  // Format date for display (e.g., "Fr 07-11")
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayShort = getWeekdayShort(date.getDay());
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return (
      <div className="text-center">
        <div className="text-xs font-medium">{dayShort}</div>
        <div className="text-xs text-gray-600">
          {day}-{month}
        </div>
      </div>
    );
  };

  // Navigate to previous period
  const handlePrevious = () => {
    const from = new Date(fromDate);
    from.setDate(from.getDate() - 30);
    const to = new Date(toDate);
    to.setDate(to.getDate() - 30);
    onDateRangeChange(
      from.toISOString().split("T")[0],
      to.toISOString().split("T")[0]
    );
  };

  // Navigate to next period
  const handleNext = () => {
    const from = new Date(fromDate);
    from.setDate(from.getDate() + 30);
    const to = new Date(toDate);
    to.setDate(to.getDate() + 30);
    onDateRangeChange(
      from.toISOString().split("T")[0],
      to.toISOString().split("T")[0]
    );
  };

  // Helper function to check if date is in the past
  const isPastDate = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Helper function to check if date has a booking (shared status)
  const isBookedDate = (dateStr: string): boolean => {
    const day = calendarData.find(d => d.date === dateStr);
    return day?.status === 'booked';
  };

  // Helper function to check if date is editable (shared status)
  const isDateEditable = (dateStr: string): boolean => {
    return !isPastDate(dateStr) && !isBookedDate(dateStr);
  };

  // Handle inline price editing - now includes pitchType
  const handlePriceClick = (date: string, pitchType: string, currentPrice: number) => {
    // Không cho edit ngày trong quá khứ hoặc đã có booking
    if (!isDateEditable(date)) {
      return;
    }
    setEditingCell(`${date}|${pitchType}`);
    setTempPrice(currentPrice);
  };

  const handlePriceSave = (date: string, pitchType: string) => {
    // CurrencyInput already returns number | undefined
    if (tempPrice !== undefined && tempPrice >= 0 && onPriceChange) {
      onPriceChange(date, pitchType, tempPrice);
    }
    setEditingCell(null);
  };

  const handlePriceKeyDown = (
    e: React.KeyboardEvent,
    date: string,
    pitchType: string
  ) => {
    if (e.key === "Enter") {
      handlePriceSave(date, pitchType);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // Calculate nights based on date range (same as modal)
  const calculateNights = () => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const nights = calculateNights();

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onOpenUpdateModal && (
            <Button onClick={onOpenUpdateModal} className="bg-primary hover:bg-primary/90">
              {t('updatePrices').toUpperCase()}
            </Button>
          )}
          <div className="flex items-center gap-2 border rounded-lg px-3 h-9">
            <span className="text-sm text-gray-600">{t('from')} - {getWeekdayFull(new Date(fromDate).getDay())}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onDateRangeChange(e.target.value, toDate)}
              className="text-sm font-medium border-0 focus:ring-0 py-0 bg-transparent"
            />
            <span className="mx-2">→</span>
            <span className="text-sm text-gray-600">{t('until')} - {getWeekdayFull(new Date(toDate).getDay())}</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onDateRangeChange(fromDate, e.target.value)}
              className="text-sm font-medium border-0 focus:ring-0 py-0 bg-transparent"
            />
          </div>
          <div className="text-sm font-medium italic">{nights} {nights === 1 ? t('night') : t('nights')}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 sticky left-0 bg-gray-50 z-10">
                {getPitchName(pitchName)}
              </th>
              {calendarData.map((day) => (
                <th
                  key={day.date}
                  className="px-2 py-2 text-center border-l min-w-[60px]"
                >
                  {formatDateHeader(day.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price rows - one row per pitch type */}
            {sortPitchTypes(pitchTypes).map((pitchType, typeIndex) => (
              <React.Fragment key={pitchType}>
              <tr className={`border-b hover:bg-gray-50 ${typeIndex === 0 ? 'bg-primary/5' : ''}`}>
                <td className="px-4 py-2 text-sm font-medium sticky left-0 bg-white z-10">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary">
                      {pitchTypeConfig[pitchType]?.icon || pitchType.charAt(0).toUpperCase()}
                    </span>
                    <span>{tPitchTypes(pitchType)}</span>
                  </div>
                </td>
                {calendarData.map((day) => {
                  const isPast = isPastDate(day.date);
                  const isBooked = day.status === 'booked';
                  const canEdit = !isPast && !isBooked && !!onPriceChange;
                  const cellKey = `${day.date}|${pitchType}`;
                  // NEW: pricesByType is now just a number
                  const price = day.pricesByType[pitchType] || 0;

                  // Determine tooltip message
                  const getTooltip = () => {
                    if (!onPriceChange) return t('viewOnly');
                    if (isPast) return t('cannotEditPastDate');
                    if (isBooked) return t('cannotEditBookedDate');
                    return undefined;
                  };

                  return (
                    <td
                      key={cellKey}
                      className={`px-2 py-2 text-center border-l ${
                        !canEdit ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:bg-primary/10'
                      }`}
                      onClick={canEdit ? () => handlePriceClick(day.date, pitchType, price) : undefined}
                      title={getTooltip()}
                    >
                      {editingCell === cellKey ? (
                        <CurrencyInput
                          value={tempPrice}
                          onValueChange={setTempPrice}
                          onBlur={() => handlePriceSave(day.date, pitchType)}
                          onKeyDown={(e) => handlePriceKeyDown(e, day.date, pitchType)}
                          className="w-full text-center text-sm border rounded px-1 py-0.5 h-8"
                          minValue={0}
                          placeholder="0"
                        />
                      ) : (
                        <span className={`text-sm font-medium ${!canEdit ? 'text-gray-400' : ''} ${price === 0 ? 'text-red-400' : ''}`}>
                          {price.toLocaleString('vi-VN', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          })}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
              </React.Fragment>
            ))}

            {/* Shared status row - after all price rows */}
            <tr className="border-b">
              <td className="px-4 py-2 text-sm text-gray-600 sticky left-0 bg-white z-10">
                <div className="flex items-center gap-1">
                  {t('availability')}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                            <span className="text-sm">Còn trống</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-800 rounded-sm"></div>
                            <span className="text-sm">Đã đặt</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
                            <span className="text-sm">Bị chặn</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </td>
              {calendarData.map((day) => {
                const status = day.status || 'available';
                return (
                  <td key={`${day.date}-status`} className="px-0 py-2">
                    <div
                      className={`h-4 w-full ${
                        status === 'available' ? 'bg-green-500'
                        : status === 'booked' ? 'bg-blue-800'
                        : status === 'blocked' ? 'bg-orange-500'
                        : 'bg-gray-300'
                      }`}
                      title={status}
                    />
                  </td>
                );
              })}
            </tr>

            {/* Arrival allowed row */}
            <tr className="border-b hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium sticky left-0 bg-white z-10">
                {t('arrivalAllowed')}
              </td>
              {calendarData.map((day) => (
                <td
                  key={day.date}
                  className="px-2 py-2 text-center border-l"
                >
                  {day.arrivalAllowed === true && (
                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                  )}
                  {day.arrivalAllowed === false && (
                    <X className="h-4 w-4 text-red-500 mx-auto" />
                  )}
                </td>
              ))}
            </tr>

            {/* Departure allowed row */}
            <tr className="border-b hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium sticky left-0 bg-white z-10">
                {t('departureAllowed')}
              </td>
              {calendarData.map((day) => (
                <td
                  key={day.date}
                  className="px-2 py-2 text-center border-l"
                >
                  {day.departureAllowed === true && (
                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                  )}
                  {day.departureAllowed === false && (
                    <X className="h-4 w-4 text-red-500 mx-auto" />
                  )}
                </td>
              ))}
            </tr>

            {/* Extra person - Children - NEW: now at CalendarDay level (shared) */}
            <tr className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium sticky left-0 bg-white z-10">
                <div>{t('extraPerson')}</div>
                <div className="text-xs text-gray-500 pl-4">{t('children')}</div>
              </td>
              {calendarData.map((day) => (
                <td
                  key={day.date}
                  className="px-2 py-2 text-center text-sm border-l"
                >
                  {day.extraChildPrice ? day.extraChildPrice.toLocaleString('vi-VN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }) : ""}
                </td>
              ))}
            </tr>

            {/* Extra person - Adults - NEW: now at CalendarDay level (shared) */}
            <tr className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium sticky left-0 bg-white z-10">
                <div className="text-xs text-gray-500 pl-4">{t('adults')}</div>
              </td>
              {calendarData.map((day) => (
                <td
                  key={day.date}
                  className="px-2 py-2 text-center text-sm border-l"
                >
                  {day.extraAdultPrice ? day.extraAdultPrice.toLocaleString('vi-VN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }) : ""}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
