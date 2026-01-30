'use client';

import React from 'react';
import { Users, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ItemBadge, useItemColor } from '../shared';
import type { BookingPeriod } from '../types';
import { getUniqueTentCount } from '@/lib/glamping-utils';

interface GuestDistributionCardProps {
  bookingPeriods: BookingPeriod[];
  locale: string;
}

// Helper to calculate total guests from parameterGroups
function getTotalGuestsFromParams(period: BookingPeriod): number {
  if (!period.parameterGroups || period.parameterGroups.length === 0) return 0;
  return period.parameterGroups.reduce((sum, pg) => sum + (pg.quantity || 0), 0);
}

export function GuestDistributionCard({
  bookingPeriods,
  locale,
}: GuestDistributionCardProps) {
  const { getColorForItem } = useItemColor();

  // Filter periods that have guest information
  const periodsWithGuests = bookingPeriods.filter(period => getTotalGuestsFromParams(period) > 0);

  // If no periods have guest info, don't render
  if (periodsWithGuests.length === 0) {
    return null;
  }

  // Check if we have multiple periods for the same tent
  const uniqueTentCount = getUniqueTentCount(bookingPeriods);
  const isMultiPeriod = bookingPeriods.length > uniqueTentCount;

  // Format dates for display
  const formatDateRange = (checkIn: string, checkOut: string) => {
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      return `${start.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${end.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      })}`;
    } catch {
      return `${checkIn} - ${checkOut}`;
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5" />
        {isMultiPeriod
          ? (locale === 'vi' ? 'Phân bổ khách theo khoảng đặt' : 'Guest Distribution by Booking Period')
          : (locale === 'vi' ? 'Phân bổ khách theo lều' : 'Guest Distribution by Tent')}
      </h3>

      <div className="space-y-3">
        {bookingPeriods.map((period, index) => {
          const colorScheme = getColorForItem(index);
          const specialRequests = period.specialRequests;
          const periodKey = `${period.itemId}|${period.checkInDate}|${period.checkOutDate}`;
          const periodTotalGuests = getTotalGuestsFromParams(period);

          // Skip periods without guest info
          if (periodTotalGuests === 0) {
            return null;
          }

          return (
            <div
              key={periodKey}
              className={cn(
                'p-3 rounded-lg border-l-4',
                colorScheme.bg,
                colorScheme.border
              )}
            >
              <div className="flex items-start gap-3">
                <ItemBadge
                  itemIndex={index}
                  colorScheme={colorScheme}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{period.itemName}</p>
                    {isMultiPeriod && period.checkInDate && period.checkOutDate && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateRange(period.checkInDate, period.checkOutDate)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{periodTotalGuests}</span>
                      <span className="text-gray-600">
                        {locale === 'vi' ? 'khách' : 'guests'}:
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700 flex-wrap">
                      {period.parameterGroups && period.parameterGroups.length > 0 && (
                        period.parameterGroups.filter(pg => pg.quantity > 0).map((pg) => (
                          <span key={pg.parameterId}>
                            {pg.parameterName}: {pg.quantity}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {!isMultiPeriod && period.checkInDate && period.checkOutDate && (
                    <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateRange(period.checkInDate, period.checkOutDate)}
                      <span className="ml-1">
                        ({period.totalNights} {locale === 'vi' ? 'đêm' : 'nights'})
                      </span>
                    </div>
                  )}

                  {specialRequests && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        {locale === 'vi' ? '📝 Yêu cầu' : '📝 Requests'}:
                      </p>
                      <p className="text-sm text-gray-700 italic mt-0.5">
                        {specialRequests}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Summary */}
      <div className="mt-4 pt-3 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {locale === 'vi' ? 'Tổng cộng' : 'Total'}:
          </span>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="font-semibold">
              {periodsWithGuests.reduce((sum, period) => sum + getTotalGuestsFromParams(period), 0)}{' '}
              {locale === 'vi' ? 'khách' : 'guests'}
            </span>
            <span className="text-gray-500">
              (
              {(() => {
                // Aggregate parameters across all periods
                const paramTotals: Record<string, { name: string; total: number }> = {};
                periodsWithGuests.forEach(period => {
                  if (period.parameterGroups) {
                    period.parameterGroups.forEach(pg => {
                      if (pg.quantity > 0) {
                        if (!paramTotals[pg.parameterId]) {
                          paramTotals[pg.parameterId] = { name: pg.parameterName, total: 0 };
                        }
                        paramTotals[pg.parameterId].total += pg.quantity;
                      }
                    });
                  }
                });
                return Object.values(paramTotals)
                  .map(p => `${p.total} ${p.name}`)
                  .join(', ');
              })()}
              )
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
