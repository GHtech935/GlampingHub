'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface ItemParameter {
  id: string;
  name: string;
  color_code: string;
  min_quantity: number;
  max_quantity: number;
}

interface ItemBookingSummaryPanelProps {
  basePrice: number;
  extraAdultPrice: number;
  extraChildPrice: number;
  maxGuests: number;
  parameters: ItemParameter[];
  selectedStart?: string | null;
  selectedEnd?: string | null;
  itemId: string;
  zoneId: string;
  zoneName: string;
  itemName: string;
  locale: 'vi' | 'en';
}

export function ItemBookingSummaryPanel({
  basePrice,
  extraAdultPrice,
  extraChildPrice,
  maxGuests,
  parameters,
  selectedStart,
  selectedEnd,
  itemId,
  zoneId,
  zoneName,
  itemName,
  locale,
}: ItemBookingSummaryPanelProps) {
  // State for parameter quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // State for pricing per parameter (event-based)
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const nights = selectedStart && selectedEnd
    ? Math.ceil((new Date(selectedEnd).getTime() - new Date(selectedStart).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  // Translations
  const t = {
    yourBooking: locale === 'vi' ? 'Đặt lều của bạn' : 'Your Booking',
    basedOnNights: locale === 'vi' ? 'Dựa trên' : 'Based on',
    nights: locale === 'vi' ? 'đêm' : 'nights',
    total: locale === 'vi' ? 'Tổng cộng' : 'Total',
    bookNow: locale === 'vi' ? 'Đặt ngay' : 'Book Now',
    selectDates: locale === 'vi' ? 'Chọn ngày để xem giá' : 'Select dates to see pricing',
  };

  // Initialize quantities with min_quantity for each parameter
  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    parameters.forEach((param) => {
      initialQuantities[param.id] = param.min_quantity || 0;
    });
    setQuantities(initialQuantities);
  }, [parameters]);

  // Fetch event-based pricing when dates are selected
  useEffect(() => {
    const fetchEventBasedPricing = async () => {
      if (!selectedStart || !selectedEnd) {
        setPricing({});
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/glamping/items/${itemId}/availability?startDate=${selectedStart}&months=1`
        );

        if (!response.ok) throw new Error('Failed to fetch pricing');

        const data = await response.json();
        const calendar = data.calendar || [];

        // Aggregate pricing from all days in range
        const pricingPerParameter: Record<string, number> = {};

        calendar.forEach((day: any) => {
          if (day.date >= selectedStart && day.date < selectedEnd && day.pricing) {
            Object.entries(day.pricing).forEach(([paramId, price]) => {
              if (!pricingPerParameter[paramId]) {
                pricingPerParameter[paramId] = 0;
              }
              pricingPerParameter[paramId] += Number(price);
            });
          }
        });

        setPricing(pricingPerParameter);
      } catch (error) {
        console.error('Error fetching pricing:', error);
        setPricing({});
      } finally {
        setLoading(false);
      }
    };

    fetchEventBasedPricing();
  }, [itemId, selectedStart, selectedEnd]);

  // Calculate total
  const calculateTotal = () => {
    let total = 0;
    parameters.forEach((param) => {
      const qty = quantities[param.id] || 0;
      const price = pricing[param.id] || 0; // This is already sum of all nights
      total += qty * price;
    });
    return total;
  };

  const total = calculateTotal();
  const hasValidSelection = selectedStart && selectedEnd && nights > 0;

  // Build booking URL
  const buildBookingUrl = () => {
    const params = new URLSearchParams({
      itemId,
      zoneName,
      itemName,
      checkIn: selectedStart || '',
      checkOut: selectedEnd || '',
      basePrice: total.toString(),
      adults: '2',
      children: '0',
    });

    // Add quantities for each parameter
    Object.entries(quantities).forEach(([paramId, qty]) => {
      params.set(paramId, qty.toString());
    });

    return `/glamping/booking/form?${params.toString()}`;
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="pb-4 border-b">
          <h2 className="text-xl font-semibold">{t.yourBooking}</h2>
          {hasValidSelection && (
            <p className="text-sm text-gray-600 mt-1">
              {t.basedOnNights} {nights} {t.nights}
            </p>
          )}
        </div>

        {/* Parameters List */}
        {parameters.length > 0 && (
          <div className="space-y-4">
            {parameters.map((param) => {
              const qty = quantities[param.id] || 0;
              const paramPrice = pricing[param.id] || 0;
              const paramTotal = qty * paramPrice;

              return (
                <div key={param.id} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{param.name}</div>
                    {hasValidSelection && paramPrice > 0 && (
                      <div className="text-xs text-gray-500">
                        {formatCurrency(paramPrice)}/khách ({nights} {t.nights})
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={param.min_quantity}
                      max={param.max_quantity}
                      value={qty}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 0;
                        setQuantities((prev) => ({
                          ...prev,
                          [param.id]: Math.min(Math.max(newQty, param.min_quantity), param.max_quantity),
                        }));
                      }}
                      className="w-16 px-2 py-1 border rounded text-center text-sm"
                    />
                    {hasValidSelection && (
                      <div className="text-sm font-medium w-24 text-right">
                        {formatCurrency(paramTotal)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Parameters Message */}
        {parameters.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            {t.selectDates}
          </div>
        )}

        {/* Pricing Summary */}
        {hasValidSelection && total > 0 && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{t.total}</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        )}

        {/* Show message if no dates selected */}
        {!hasValidSelection && (
          <div className="text-center py-4 text-sm text-gray-500">
            {t.selectDates}
          </div>
        )}

        {/* Book Now Button */}
        {hasValidSelection && total > 0 && !loading ? (
          <Button asChild className="w-full" size="lg">
            <Link href={buildBookingUrl()}>
              {t.bookNow}
            </Link>
          </Button>
        ) : (
          <Button
            className="w-full"
            size="lg"
            disabled
          >
            {loading ? 'Đang tải...' : t.bookNow}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
