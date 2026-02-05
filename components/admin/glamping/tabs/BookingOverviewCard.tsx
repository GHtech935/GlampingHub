'use client';

import React from 'react';
import { Home, Users, Moon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useItemColor } from '../shared';
import type { BookingPeriod } from '../types';
import {
  getUniqueTentCount,
  getTotalNightsAcrossPeriods,
} from '@/lib/glamping-utils';

interface BookingOverviewCardProps {
  bookingPeriods: BookingPeriod[];
  totalGuests: number;
  locale: string;
  bookingCheckIn?: string;
  bookingCheckOut?: string;
  commonItemNames?: string[];
  additionalCostNames?: string[];
}

export function BookingOverviewCard({
  bookingPeriods,
  totalGuests,
  locale,
  bookingCheckIn,
  bookingCheckOut,
  commonItemNames,
  additionalCostNames,
}: BookingOverviewCardProps) {
  const { getColorForItem } = useItemColor();

  // Calculate unique tent count (distinct item_ids)
  const uniqueTentCount = getUniqueTentCount(bookingPeriods);

  // Calculate total nights across all periods
  const totalNights = getTotalNightsAcrossPeriods(bookingPeriods);

  // Get night range per period
  const nightsRange = bookingPeriods.map(period => period.totalNights).filter(n => n > 0);
  const minNights = nightsRange.length > 0 ? Math.min(...nightsRange) : 0;
  const maxNights = nightsRange.length > 0 ? Math.max(...nightsRange) : 0;

  // Display logic based on periods
  const isSinglePeriodPerTent = bookingPeriods.length === uniqueTentCount;
  const nightsDisplay = minNights === maxNights
    ? `${minNights}`
    : `${minNights}-${maxNights}`;

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4">
        {locale === 'vi' ? 'Tổng quan booking' : 'Booking Overview'}
      </h3>

      {/* Booking Periods List */}
      {bookingPeriods.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {isSinglePeriodPerTent
              ? (locale === 'vi' ? 'Các lều đã đặt:' : 'Booked tents:')
              : (locale === 'vi' ? 'Các khoảng đặt:' : 'Booking periods:')}
          </p>
          <div className="space-y-1.5">
            {bookingPeriods.map((period, index) => {
              const colorScheme = getColorForItem(index);
              const periodKey = `${period.itemId}|${period.checkInDate}|${period.checkOutDate}`;

              // Format dates for display
              const formatDate = (dateStr: string) => {
                try {
                  const date = new Date(dateStr);
                  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  });
                } catch {
                  return dateStr;
                }
              };

              return (
                <div
                  key={periodKey}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', colorScheme.dot)} />
                  <span className="font-medium">
                    {isSinglePeriodPerTent
                      ? `${locale === 'vi' ? 'Lều' : 'Tent'} ${index + 1}:`
                      : `${locale === 'vi' ? 'Khoảng' : 'Period'} ${index + 1}:`}
                  </span>
                  <span className="text-gray-700">{period.itemName}</span>
                  {period.checkInDate && period.checkOutDate && (
                    <span className="text-gray-500 text-xs">
                      · {formatDate(period.checkInDate)} - {formatDate(period.checkOutDate)}
                    </span>
                  )}
                  {period.totalNights > 0 && (
                    <span className="text-gray-500 text-xs">
                      · {period.totalNights} {locale === 'vi' ? 'đêm' : 'nights'}
                    </span>
                  )}
                  {period.parameterGroups && period.parameterGroups.length > 0 && (() => {
                    const periodGuests = period.parameterGroups.reduce((sum, pg) => sum + (pg.quantity || 0), 0);
                    return periodGuests > 0 && (
                      <span className="text-gray-500 text-xs">
                        · {periodGuests} {locale === 'vi' ? 'khách' : 'guests'}
                      </span>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Common Items (Item chung) */}
      {commonItemNames && commonItemNames.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {locale === 'vi' ? 'Item chung:' : 'Common items:'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {commonItemNames.map((name, index) => (
              <span key={index} className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional Costs (Chi phí phát sinh) */}
      {additionalCostNames && additionalCostNames.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {locale === 'vi' ? 'Chi phí phát sinh:' : 'Additional costs:'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {additionalCostNames.map((name, index) => (
              <span key={index} className="text-sm text-gray-600 bg-orange-50 px-2 py-0.5 rounded">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
