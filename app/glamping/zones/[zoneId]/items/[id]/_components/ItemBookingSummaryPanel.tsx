'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useGlampingCart } from '@/components/providers/GlampingCartProvider';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Eye, Loader2 } from 'lucide-react';

interface ItemParameter {
  id: string;
  name: string | { vi?: string; en?: string };
  color_code: string;
  min_quantity: number;
  max_quantity: number;
  counted_for_menu?: boolean;
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
  itemSku?: string;
  itemImageUrl?: string;
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
  itemSku,
  itemImageUrl,
  locale,
}: ItemBookingSummaryPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart, cartCount, cart } = useGlampingCart();

  // State for parameter quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // State for calculated pricing from API (with group/tiered pricing)
  const [calculatedPricing, setCalculatedPricing] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

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
    addToCart: locale === 'vi' ? 'Thêm vào giỏ' : 'Add to Cart',
    viewCart: locale === 'vi' ? 'Xem giỏ hàng' : 'View Cart',
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

  // Debounced pricing calculation when dates or quantities change
  useEffect(() => {
    if (!selectedStart || !selectedEnd || !itemId || parameters.length === 0 || Object.keys(quantities).length === 0) {
      setCalculatedPricing(null);
      return;
    }

    // Show loading immediately when inputs change
    setPricingLoading(true);

    // Debounce to avoid calling API too frequently
    const timeoutId = setTimeout(() => {
      fetchCalculatedPricing();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [selectedStart, selectedEnd, itemId, quantities]);

  const fetchCalculatedPricing = async () => {
    setPricingLoading(true);
    try {
      const params = new URLSearchParams({
        itemId,
        checkIn: selectedStart!,
        checkOut: selectedEnd!,
        adults: adults.toString(),
        children: children.toString(),
      });

      // Add parameter quantities with prefix param_
      // Use Math.max(qty, 1) so API always returns unit prices even for qty=0 params
      Object.entries(quantities).forEach(([paramId, quantity]) => {
        params.append(`param_${paramId}`, Math.max(quantity, 1).toString());
      });

      const response = await fetch(`/api/glamping/booking/calculate-pricing?${params}`);

      if (!response.ok) {
        throw new Error('Failed to calculate pricing');
      }

      const data = await response.json();
      setCalculatedPricing(data);
    } catch (error) {
      console.error('Error calculating pricing:', error);
      setCalculatedPricing(null);
      toast({
        title: 'Lỗi',
        description: 'Không thể tính giá. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setPricingLoading(false);
    }
  };

  // Calculate total using API response (with group/tiered pricing and pricing_mode)
  const calculateTotal = () => {
    if (!calculatedPricing) return 0;

    // Use totals.accommodationCost from API - it's already calculated correctly with pricing_mode
    // This ensures per_group prices are NOT multiplied by quantity
    return calculatedPricing.totals?.accommodationCost || 0;
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

  // Add to cart handler
  const handleAddToCart = () => {
    if (!selectedStart || !selectedEnd || !hasValidSelection) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn ngày nhận phòng và trả phòng',
        variant: 'destructive'
      });
      return;
    }

    // Build parameter details array
    const parameterDetails = parameters
      .filter(param => quantities[param.id] > 0)
      .map(param => {
        // Extract name from multilingual object if present
        let name = '';
        if (typeof param.name === 'object' && param.name !== null) {
          name = param.name.vi || param.name.en || '';
        } else {
          name = param.name || '';
        }

        return {
          id: param.id,
          name,
          color_code: param.color_code,
          quantity: quantities[param.id],
          counted_for_menu: param.counted_for_menu || false
        };
      });

    // Create cart item
    const cartItem = {
      id: `${itemId}-${Date.now()}`, // Unique cart item ID
      itemId,
      itemName,
      itemSku: itemSku || '',
      zoneId,
      zoneName: { vi: zoneName, en: zoneName },
      checkIn: selectedStart,
      checkOut: selectedEnd,
      nights,
      adults,
      children,
      parameterQuantities: quantities,
      parameters: parameterDetails,
      menuProducts: {}, // Empty initially, can be added later
      basePrice: total,
      totalPrice: total,
      itemImageUrl,
      addedAt: Date.now(),
      // Store nightly breakdown and pricing metadata
      nightlyPricing: calculatedPricing?.nightlyPricing || [],
      pricingMetadata: {
        parameterPricing: calculatedPricing?.parameterPricing || {},
        appliedEvents: calculatedPricing?.appliedEvents || []
      }
    };

    const result = addToCart(cartItem);

    if (result.success) {
      toast({
        title: 'Đã thêm vào giỏ',
        description: `${itemName} đã được thêm vào giỏ hàng`,
      });
    } else {
      toast({
        title: 'Không thể thêm vào giỏ',
        description: result.error || 'Đã có lỗi xảy ra',
        variant: 'destructive'
      });
    }
  };

  const handleViewCart = () => {
    router.push('/glamping/booking/form?from=cart');
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

              // Get price per unit from calculated pricing (already has group discount applied)
              const pricePerUnitAllNights = calculatedPricing?.parameterPricing?.[param.id] || 0;
              const pricingMode = calculatedPricing?.parameterPricingModes?.[param.id] || 'per_person';
              const isPerGroup = pricingMode === 'per_group';

              // Calculate param total based on pricing_mode
              // per_group: fixed price (not multiplied by quantity)
              // per_person: price × quantity
              const paramTotal = isPerGroup ? pricePerUnitAllNights : pricePerUnitAllNights * qty;

              // Extract name from multilingual object
              const paramName = typeof param.name === 'object' && param.name !== null
                ? (param.name.vi || param.name.en || '')
                : (param.name || '');

              return (
                <div key={param.id} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{paramName}</div>
                    {hasValidSelection && pricingLoading ? (
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Đang tải giá...</span>
                      </div>
                    ) : hasValidSelection && pricePerUnitAllNights > 0 ? (
                      <div className="text-xs text-gray-500">
                        {formatCurrency(pricePerUnitAllNights)}/{isPerGroup ? 'nhóm' : 'khách'} ({nights} {t.nights})
                      </div>
                    ) : null}
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
                      disabled={pricingLoading}
                    />

                    {hasValidSelection && pricingLoading ? (
                      <div className="text-sm w-24 text-right">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-auto" />
                      </div>
                    ) : hasValidSelection && pricePerUnitAllNights > 0 ? (
                      <div className="text-sm font-medium w-24 text-right">
                        {formatCurrency(paramTotal)}
                      </div>
                    ) : null}
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
        {hasValidSelection && (total > 0 || pricingLoading) && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{t.total}</span>
              {pricingLoading ? (
                <span className="text-xl text-gray-400 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang tính...
                </span>
              ) : (
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(total)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Show message if no dates selected */}
        {!hasValidSelection && (
          <div className="text-center py-4 text-sm text-gray-500">
            {t.selectDates}
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-2">
          {hasValidSelection && total > 0 && !loading && !pricingLoading && calculatedPricing ? (
            <Button
              onClick={() => {
                // Check if same item + dates already in cart
                const alreadyInCart = cart?.items.some(
                  ci => ci.itemId === itemId && ci.checkIn === selectedStart && ci.checkOut === selectedEnd
                );
                if (alreadyInCart) {
                  router.push('/glamping/booking/form?from=cart');
                  return;
                }
                handleAddToCart();
                router.push('/glamping/booking/form?from=cart');
              }}
              className="w-full"
              size="lg"
            >
              {locale === 'vi' ? 'Đặt lều' : 'Book Tent'}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled
            >
              {pricingLoading ? 'Đang tính giá...' : loading ? 'Đang tải...' : (locale === 'vi' ? 'Đặt lều' : 'Book Tent')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
