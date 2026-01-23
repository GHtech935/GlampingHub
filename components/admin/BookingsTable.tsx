"use client";

import { useState, useEffect } from "react";
import { Eye, Mail, Phone, MapPin, Calendar, Users, Clock, Copy, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";
import { getStatusVariant, getStatusLabel, getPaymentStatusVariant, getPaymentStatusLabel, type BookingStatus, type PaymentStatus } from "@/lib/booking-status";
import { useTranslations } from "next-intl";

export interface Booking {
  id: string;
  bookingReference: string;
  guest: {
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    country: string;
  };
  campsite: {
    id: string;
    name: MultilingualText | string;
    slug: string;
  };
  pitch: {
    id: string;
    name: MultilingualText | string;
    slug: string;
  };
  dates: {
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  guests: {
    adults: number;
    children: number;
    infants: number;
    vehicles: number;
    dogs: number;
  };
  pricing: {
    accommodationCost: number;
    productsCost: number;
    totalAmount: number;
    depositPercentage: number;
    depositAmount: number;
    balanceAmount: number;
  };
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  confirmedAt?: string;
  paymentExpiresAt?: string;
  hasLatePayment?: boolean;
}

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  onViewDetails: (bookingId: string) => void;
  onCopyBooking: (bookingId: string) => void;
}

// Component to show countdown timer
function PaymentCountdown({ expiresAt, expiredText }: { expiresAt: string; expiredText: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const expiresDate = new Date(expiresAt);
      const now = new Date();
      const diff = expiresDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(expiredText);
        setIsExpired(true);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        setTimeLeft(`${hours}h ${remainingMins}m`);
      } else {
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
      setIsExpired(false);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt]);

  return (
    <div className={`flex items-center gap-1 text-xs mt-1 ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
      <Clock className="h-3 w-3" />
      <span className={isExpired ? 'font-semibold' : ''}>
        {timeLeft}
      </span>
    </div>
  );
}

export function BookingsTable({
  bookings,
  loading,
  onViewDetails,
  onCopyBooking,
}: BookingsTableProps) {
  const { locale } = useAdminLocale();
  const t = useTranslations('admin.bookingsTable');

  const renderStatusBadge = (status: BookingStatus, paymentStatus: PaymentStatus) => {
    const statusVariant = getStatusVariant(status);
    const statusLabel = getStatusLabel(status, locale);
    const paymentVariant = getPaymentStatusVariant(paymentStatus);
    const paymentLabel = getPaymentStatusLabel(paymentStatus, locale);

    return (
      <div className="flex flex-col gap-1">
        <Badge variant={statusVariant} className="text-xs">
          {statusLabel}
        </Badge>
        <Badge variant={paymentVariant} className="text-xs">
          {paymentLabel}
        </Badge>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{t('noBookings')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('bookingCode')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('customer')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('campsitePitch')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stayDates')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('guests')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('totalAmount')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bookings.map((booking) => {
              // Extract localized text for multilingual fields
              const campsiteName = getLocalizedText(booking.campsite.name, locale);
              const pitchName = getLocalizedText(booking.pitch.name, locale);

              return (
                <tr
                  key={booking.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Booking Reference */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900">
                        {booking.bookingReference}
                      </span>
                      {booking.hasLatePayment && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"
                          title={t('latePayment')}
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(booking.createdAt)}
                    </div>
                  </td>

                  {/* Guest Info */}
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.guest.fullName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {booking.guest.email}
                      </span>
                    </div>
                    {booking.guest.phone && (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {booking.guest.phone}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Campsite / Pitch */}
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {campsiteName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {pitchName}
                        </div>
                      </div>
                    </div>
                  </td>

                {/* Dates */}
                <td className="px-4 py-4">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-900">
                        {formatDate(booking.dates.checkIn)} -{" "}
                        {formatDate(booking.dates.checkOut)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {t('nights', { count: booking.dates.nights })}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Guests */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div className="text-sm text-gray-900">
                      {booking.guests.adults}A
                      {booking.guests.children > 0 &&
                        `, ${booking.guests.children}C`}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {renderStatusBadge(booking.status, booking.paymentStatus)}
                  {/* Show countdown for pending payment status */}
                  {booking.status === 'pending' && booking.paymentStatus === 'pending' && booking.paymentExpiresAt && (
                    <PaymentCountdown expiresAt={booking.paymentExpiresAt} expiredText={t('expired')} />
                  )}
                </td>

                {/* Total Amount */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(booking.pricing.totalAmount)}
                  </div>
                  {booking.paymentStatus === "deposit_paid" && (
                    <div className="text-xs text-gray-600">
                      {t('remaining', { amount: formatCurrency(booking.pricing.balanceAmount) })}
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(booking.id)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      {t('view')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCopyBooking(booking.id)}
                      className="flex items-center gap-2"
                      title={t('copyBooking')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
