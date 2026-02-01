'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2 } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { BookingCard } from '@/components/booking/BookingCard';
import { useAuth } from '@/hooks/useAuth';
import { useClientLocale } from '@/components/providers/ClientI18nProvider';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { type BookingStatus, type PaymentStatus } from '@/lib/booking-status';
import { type MultilingualText } from '@/lib/i18n-utils';

interface Booking {
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
}

type TabFilter = 'upcoming' | 'past' | 'cancelled';

export default function BookingsPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated, isCustomer } = useAuth();
  const { locale } = useClientLocale();
  const t = useTranslations('myBookings');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isCustomer) {
        router.push('/login?returnUrl=/bookings');
        return;
      }
      fetchBookings(activeTab);
    }
  }, [authLoading, isAuthenticated, isCustomer, router, activeTab]);

  const fetchBookings = async (filter: TabFilter) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/customer/bookings?filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabFilter);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Container className="py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Container>
    );
  }

  // Get empty message based on active tab
  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'upcoming':
        return t('noUpcoming');
      case 'past':
        return t('noPast');
      case 'cancelled':
        return t('noCancelled');
      default:
        return t('noBookings');
    }
  };

  return (
    <Container className="py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">{t('upcoming')}</TabsTrigger>
            <TabsTrigger value="past">{t('past')}</TabsTrigger>
            <TabsTrigger value="cancelled">{t('cancelled')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          /* Empty state */
          <div className="border rounded-lg p-12 text-center bg-white">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{getEmptyMessage()}</h2>
            <p className="text-muted-foreground mb-6">
              {t('noBookingsDesc')}
            </p>
            {activeTab === 'upcoming' && (
              <Button onClick={() => router.push('/glamping/search')}>
                {t('exploreNow')}
              </Button>
            )}
          </div>
        ) : (
          /* Bookings list */
          <>
            <p className="text-muted-foreground mb-4">
              {bookings.length} {t('totalBookings')}
            </p>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  locale={locale as 'vi' | 'en'}
                  translations={{
                    viewDetails: t('viewDetails'),
                    balanceDue: t('balanceDue'),
                    nights: t('nights'),
                    guests: t('guests'),
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Container>
  );
}
