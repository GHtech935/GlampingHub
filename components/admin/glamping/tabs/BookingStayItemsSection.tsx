'use client';

import React from 'react';
import { Package, Calendar, Users, DollarSign, Moon } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ItemBadge, useItemColor } from '../shared';
import type { BookingPeriod } from '../types';
import { getUniqueTentCount } from '@/lib/glamping-utils';

interface BookingStayItemsSectionProps {
  bookingPeriods: BookingPeriod[];
  locale: string;
  bookingCheckIn?: string;
  bookingCheckOut?: string;
}

export function BookingStayItemsSection({
  bookingPeriods,
  locale,
  bookingCheckIn,
  bookingCheckOut,
}: BookingStayItemsSectionProps) {
  const { getColorForItem } = useItemColor();

  // Check if we have multiple periods for the same tent
  const uniqueTentCount = getUniqueTentCount(bookingPeriods);
  const isMultiPeriod = bookingPeriods.length > uniqueTentCount;

  if (bookingPeriods.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Package className="h-5 w-5" />
          {locale === 'vi' ? 'Phòng/Lều đặt' : 'Booked Rooms/Tents'}
        </h3>
        <p className="text-gray-500 text-sm">
          {locale === 'vi' ? 'Không có sản phẩm' : 'No items'}
        </p>
      </div>
    );
  }

  // Single period - simpler display without item numbers
  if (bookingPeriods.length === 1) {
    const period = bookingPeriods[0];
    const checkIn = period.checkInDate || bookingCheckIn;
    const checkOut = period.checkOutDate || bookingCheckOut;
    const nights = period.totalNights;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Package className="h-5 w-5" />
          {locale === 'vi' ? 'Phòng/Lều đặt' : 'Booked Room/Tent'}
        </h3>

        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div>
            <p className="font-semibold text-base">{period.itemName || '-'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {checkIn && checkOut && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-600">{locale === 'vi' ? 'Ngày' : 'Dates'}</p>
                  <p className="font-medium">
                    {formatDate(checkIn)} - {formatDate(checkOut)}
                  </p>
                </div>
              </div>
            )}

            {nights > 0 && (
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-600">{locale === 'vi' ? 'Số đêm' : 'Nights'}</p>
                  <p className="font-medium">{nights}</p>
                </div>
              </div>
            )}

            {period.parameterGroups && period.parameterGroups.length > 0 && (() => {
              const periodGuests = period.parameterGroups.reduce((sum, pg) => sum + (pg.quantity || 0), 0);
              const guestsDisplay = period.parameterGroups
                .filter(pg => pg.quantity > 0)
                .map(pg => `${pg.quantity} ${pg.parameterName}`)
                .join(', ');
              return periodGuests > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-600">{locale === 'vi' ? 'Khách' : 'Guests'}</p>
                    <p className="font-medium">{guestsDisplay}</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-600">{locale === 'vi' ? 'Tổng giá' : 'Total Price'}</p>
                <p className="font-medium">
                  <span className="text-blue-600">{formatCurrency(period.totalPrice)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Parameter Breakdown */}
          {period.parameterGroups.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">{locale === 'vi' ? 'Chi tiết tham số' : 'Parameter Details'}</p>
              <div className="space-y-1">
                {period.parameterGroups.map((param) => (
                  <div key={param.parameterId} className="flex justify-between text-sm">
                    <span className="text-gray-700">{param.parameterName}</span>
                    <span className="text-gray-600">
                      {formatCurrency(param.unitPrice)} × {param.quantity} = {formatCurrency(param.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {period.specialRequests && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">{locale === 'vi' ? 'Yêu cầu đặc biệt' : 'Special Requests'}</p>
              <p className="text-sm text-gray-700 italic mt-1">{period.specialRequests}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Multiple periods - always-visible display
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Package className="h-5 w-5" />
        {isMultiPeriod
          ? (locale === 'vi' ? 'Chi tiết các khoảng đặt' : 'Booking Periods Details')
          : (locale === 'vi' ? 'Chi tiết các lều đã đặt' : 'Booked Tents/Rooms Details')}
      </h3>

      <div className="space-y-3">
        {bookingPeriods.map((period, index) => {
          const colorScheme = getColorForItem(index);
          const checkIn = period.checkInDate || bookingCheckIn;
          const checkOut = period.checkOutDate || bookingCheckOut;
          const nights = period.totalNights;
          const periodKey = `${period.itemId}|${period.checkInDate}|${period.checkOutDate}`;

          return (
            <div
              key={periodKey}
              className={cn(
                'border rounded-lg overflow-hidden',
                colorScheme.bg,
                colorScheme.border,
                'border-l-4'
              )}
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-3">
                <ItemBadge
                  itemIndex={index}
                  colorScheme={colorScheme}
                  size="md"
                  label={`${locale === 'vi' ? 'Lều' : 'Tent'} ${index + 1}`}
                />
                <div className="flex-1">
                  <p className="font-semibold">{period.itemName || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">{formatCurrency(period.totalPrice)}</p>
                </div>
              </div>

              {/* Content - always visible */}
              <div className="px-4 pb-4 space-y-3">
                {/* Dates */}
                {checkIn && checkOut && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        {locale === 'vi' ? 'Ngày nhận - trả' : 'Check-in - Check-out'}
                      </p>
                      <p className="font-medium">
                        {formatDate(checkIn)} - {formatDate(checkOut)}
                        {nights > 0 && (
                          <span className="text-gray-600 ml-2">
                            ({nights} {locale === 'vi' ? 'đêm' : 'nights'})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Guests */}
                {period.parameterGroups && period.parameterGroups.some(pg => pg.quantity > 0) && (
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        {locale === 'vi' ? 'Số khách' : 'Guests'}
                      </p>
                      <p className="font-medium">
                        {period.parameterGroups.filter(pg => pg.quantity > 0).map(pg => `${pg.parameterName}: ${pg.quantity}`).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Parameter Breakdown */}
                {period.parameterGroups.length > 0 && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">
                        {locale === 'vi' ? 'Chi tiết tham số' : 'Parameter Breakdown'}
                      </p>
                      <div className="space-y-1.5">
                        {period.parameterGroups.map((param) => (
                          <div key={param.parameterId} className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="text-xs">
                                {param.parameterName}
                              </Badge>
                            </div>
                            <div className="text-right text-sm">
                              <p className="text-gray-700">
                                {formatCurrency(param.unitPrice)} × {param.quantity}
                                {nights > 0 && ` × ${nights} ${locale === 'vi' ? 'đêm' : 'nights'}`}
                              </p>
                              <p className="font-medium text-blue-600">
                                {formatCurrency(param.totalPrice)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-sm font-medium">{locale === 'vi' ? 'Tổng' : 'Total'}:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(period.totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Special Requests */}
                {period.specialRequests && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{locale === 'vi' ? 'Yêu cầu đặc biệt' : 'Special Requests'}</p>
                    <p className="text-sm text-gray-700 italic mt-1">{period.specialRequests}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
