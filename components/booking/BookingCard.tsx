'use client';

import Link from 'next/link';
import { Calendar, Users, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  getBookingStatusLabel,
  getBookingStatusVariant,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  type BookingStatus,
  type PaymentStatus
} from '@/lib/booking-status';
import { getLocalizedText, type MultilingualText } from '@/lib/i18n-utils';

interface BookingCardProps {
  booking: {
    id: string;
    bookingCode: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    adults: number;
    children: number;
    totalGuests: number;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    totalAmount: number;
    depositDue: number;
    balanceDue: number;
    zoneName: MultilingualText | string | null;
    zoneId: string | null;
    itemName: MultilingualText | string | null;
  };
  locale: 'vi' | 'en';
  translations: {
    viewDetails: string;
    balanceDue: string;
    nights: string;
    guests: string;
  };
}

export function BookingCard({ booking, locale, translations }: BookingCardProps) {
  const statusLabel = getBookingStatusLabel(booking.status, locale);
  const statusVariant = getBookingStatusVariant(booking.status);
  const paymentLabel = getPaymentStatusLabel(booking.paymentStatus, locale);
  const paymentVariant = getPaymentStatusVariant(booking.paymentStatus);

  const zoneName = booking.zoneName
    ? (typeof booking.zoneName === 'string'
      ? booking.zoneName
      : getLocalizedText(booking.zoneName, locale))
    : '';

  const itemName = booking.itemName
    ? (typeof booking.itemName === 'string'
      ? booking.itemName
      : getLocalizedText(booking.itemName, locale))
    : '';

  // Format guests string
  const guestsText = booking.children > 0
    ? `${booking.adults} ${locale === 'vi' ? 'người lớn' : 'adults'}, ${booking.children} ${locale === 'vi' ? 'trẻ em' : 'children'}`
    : `${booking.adults} ${locale === 'vi' ? 'người lớn' : 'adults'}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left side - Booking info */}
          <div className="flex-1 space-y-3">
            {/* Booking code and status */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground">
                #{booking.bookingCode}
              </span>
              <Badge variant={statusVariant}>
                {statusLabel}
              </Badge>
              <Badge variant={paymentVariant}>
                {paymentLabel}
              </Badge>
            </div>

            {/* Zone and item */}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{zoneName || 'Unknown Zone'}</p>
                <p className="text-sm text-muted-foreground">{itemName || 'Unknown Item'}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>
                {formatDate(booking.checkInDate, 'dd MMM')} → {formatDate(booking.checkOutDate, 'dd MMM yyyy')}
              </span>
              <span className="text-muted-foreground">
                ({booking.nights} {locale === 'vi' ? 'đêm' : 'nights'})
              </span>
            </div>

            {/* Guests */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>{guestsText}</span>
            </div>
          </div>

          {/* Right side - Pricing and action */}
          <div className="flex flex-col items-end gap-3 sm:min-w-[160px]">
            {/* Total amount */}
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(booking.totalAmount)}
              </p>
              {booking.balanceDue > 0 && (
                <p className="text-sm text-orange-600">
                  {translations.balanceDue}: {formatCurrency(booking.balanceDue)}
                </p>
              )}
            </div>

            {/* View details button */}
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href={`/glamping/booking/confirmation/${booking.id}`}>
                {translations.viewDetails}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
