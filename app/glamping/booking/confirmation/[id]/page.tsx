'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmationItemsList, TentData } from '@/components/glamping-booking/ConfirmationItemsList';
import { toast } from 'sonner';
import { Clock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface BookingData {
  success: boolean;
  booking: {
    id: string;
    booking_code: string;
    status: string;
    payment_status: string;
    check_in_date: string;
    check_out_date: string;
    subtotal_amount: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    deposit_due: number;
    balance_due: number;
    guests: { adults: number; children: number };
    total_guests: number;
    special_requirements: string;
    currency: string;
    accommodation: {
      item_name: any;
      zone_name: any;
      zone_id: string;
    };
    customer: {
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
      country: string;
      address_line1: string;
    };
  };
  tents: TentData[];
  parameters: Array<{
    label: string;
    booked_quantity: number;
    color_code: string;
  }>;
  menuProducts: Array<{
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    name: any;
    description: any;
    unit: any;
    image_url: string;
    category_name: any;
  }>;
  canEditMenu: boolean;
  hoursUntilCheckIn: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const t = useTranslations('glampingConfirmation');
  const locale = useLocale();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  const getPaymentStatusLabel = (status: string): { label: string; color: string } => {
    const colors: Record<string, string> = {
      pending: 'bg-orange-500 hover:bg-orange-600',
      deposit_paid: 'bg-blue-500 hover:bg-blue-600',
      fully_paid: 'bg-green-600 hover:bg-green-700',
      paid: 'bg-green-600 hover:bg-green-700',
    };

    const validStatuses = ['pending', 'deposit_paid', 'fully_paid', 'paid'];
    if (validStatuses.includes(status)) {
      return { label: t(`paymentStatus.${status}`), color: colors[status] || 'bg-gray-500' };
    }
    return { label: status, color: 'bg-gray-500' };
  };

  const getBookingStatusLabel = (status: string): { label: string; color: string } => {
    const colors: Record<string, string> = {
      pending: '',
      confirmed: 'bg-green-600 hover:bg-green-700',
      cancelled: 'bg-red-600 hover:bg-red-700',
      completed: 'bg-purple-600 hover:bg-purple-700',
    };

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (validStatuses.includes(status)) {
      return { label: t(`bookingStatus.${status}`), color: colors[status] || '' };
    }
    return { label: status, color: '' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Fetch booking details
  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/glamping/bookings/${bookingId}/details`);
      const data = await response.json();

      if (data.success) {
        setBooking(data);
      } else {
        toast.error(t('bookingNotFound'));
      }
    } catch (error) {
      toast.error(t('errorLoadingBooking'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !booking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-600">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('bookingNotFound')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const bookingStatus = getBookingStatusLabel(booking.booking.status);
  const paymentStatus = getPaymentStatusLabel(booking.booking.payment_status);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-gray-600 text-lg">#{booking.booking.booking_code}</p>
          <Badge
            variant={booking.booking.status === 'confirmed' ? 'default' : 'secondary'}
            className={bookingStatus.color}
          >
            {bookingStatus.label}
          </Badge>
          <Badge className={paymentStatus.color}>
            {paymentStatus.label}
          </Badge>
        </div>
      </div>

      {/* Edit Permission Alert */}
      {booking.canEditMenu ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t('canEditMenuAlert')}
          </AlertDescription>
        </Alert>
      ) : booking.booking.status === 'confirmed' && booking.booking.payment_status === 'pending' ? (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {t('payDepositToEditAlert')}
          </AlertDescription>
        </Alert>
      ) : booking.booking.status === 'confirmed' ? (
        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {t('cannotEditMenuDeadline')}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Guest Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('customerInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('fullName')}</p>
              <p className="font-medium">
                {booking.booking.customer.first_name} {booking.booking.customer.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('email')}</p>
              <p className="font-medium">{booking.booking.customer.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('phone')}</p>
              <p className="font-medium">{booking.booking.customer.phone || 'N/A'}</p>
            </div>
          </div>
          {booking.booking.special_requirements && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">{t('specialRequirements')}</p>
              <p className="font-medium">{booking.booking.special_requirements}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Tent Items List - NEW */}
      {booking.tents && booking.tents.length > 0 ? (
        <ConfirmationItemsList
          tents={booking.tents}
          bookingId={bookingId}
          canEditMenu={booking.canEditMenu}
          onMenuUpdated={fetchBookingDetails}
        />
      ) : (
        /* Fallback: Old single accommodation view for legacy bookings */
        <Card>
          <CardHeader>
            <CardTitle>{t('accommodationDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t('zone')}</p>
                <p className="font-medium">
                  {typeof booking.booking.accommodation?.zone_name === 'object'
                    ? booking.booking.accommodation.zone_name[locale] || booking.booking.accommodation.zone_name.vi || booking.booking.accommodation.zone_name.en
                    : booking.booking.accommodation?.zone_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('accommodationType')}</p>
                <p className="font-medium">
                  {typeof booking.booking.accommodation?.item_name === 'object'
                    ? booking.booking.accommodation.item_name[locale] || booking.booking.accommodation.item_name.vi || booking.booking.accommodation.item_name.en
                    : booking.booking.accommodation?.item_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('checkIn')}</p>
                <p className="font-medium">{formatDate(booking.booking.check_in_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('checkOut')}</p>
                <p className="font-medium">{formatDate(booking.booking.check_out_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('paymentSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>{t('subtotal')}</span>
            <span>{formatCurrency(booking.booking.subtotal_amount)}</span>
          </div>
          {booking.booking.tax_amount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('tax')}</span>
              <span>{formatCurrency(booking.booking.tax_amount)}</span>
            </div>
          )}
          {booking.booking.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t('discount')}</span>
              <span>-{formatCurrency(booking.booking.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>{t('total')}</span>
            <span className="text-purple-600">{formatCurrency(booking.booking.total_amount)}</span>
          </div>
          {booking.booking.deposit_due > 0 && booking.booking.deposit_due !== booking.booking.total_amount && (
            <div className="flex justify-between text-blue-600">
              <span>{t('deposit')}</span>
              <span>{formatCurrency(booking.booking.deposit_due)}</span>
            </div>
          )}
          {booking.booking.balance_due > 0 && (
            <div className="flex justify-between text-orange-600 font-medium">
              <span>{t('balanceDue')}</span>
              <span>{formatCurrency(booking.booking.balance_due)}</span>
            </div>
          )}
          <div className="pt-2">
            <Badge className={paymentStatus.color}>
              {paymentStatus.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
