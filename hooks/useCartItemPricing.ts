import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface UseCartItemPricingParams {
  itemId: string | null;
  dateRange: DateRange | undefined;
  parameterQuantities: Record<string, number>;
  accommodationVoucher: any | null;
}

interface UseCartItemPricingReturn {
  pricingData: any;
  pricingLoading: boolean;
  error: Error | null;
}

/**
 * Hook for real-time pricing calculation with debouncing
 * @param params - Pricing parameters
 * @returns Pricing data, loading state, and error
 */
export function useCartItemPricing({
  itemId,
  dateRange,
  parameterQuantities,
  accommodationVoucher
}: UseCartItemPricingParams): UseCartItemPricingReturn {
  const [pricingData, setPricingData] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!itemId || !dateRange?.from || !dateRange?.to) {
      setPricingData(null);
      return;
    }

    const fetchPricing = async () => {
      setPricingLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          itemId,
          checkIn: format(dateRange.from!, 'yyyy-MM-dd'),
          checkOut: format(dateRange.to!, 'yyyy-MM-dd'),
        });

        // Add parameters
        Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
          if (quantity > 0) {
            params.append(`param_${paramId}`, quantity.toString());
          }
        });

        // Add accommodation voucher
        if (accommodationVoucher) {
          params.append('discountCode', accommodationVoucher.code);
        }

        console.log('[useCartItemPricing] Fetching pricing with params:', Object.fromEntries(params.entries()));
        console.log('[useCartItemPricing] Parameter quantities:', parameterQuantities);

        const response = await fetch(`/api/glamping/booking/calculate-pricing?${params}`);
        const data = await response.json();

        if (response.ok) {
          console.log('[useCartItemPricing] API Response:', data);
          console.log('[useCartItemPricing] Parameter Pricing:', data.parameterPricing);
          console.log('[useCartItemPricing] Accommodation Cost:', data.totals?.accommodationCost);
          console.log('[useCartItemPricing] Nightly Pricing:', data.nightlyPricing);
          setPricingData(data);
        } else {
          throw new Error(data.error || 'Failed to fetch pricing');
        }
      } catch (err) {
        console.error('Error fetching pricing:', err);
        setError(err as Error);
      } finally {
        setPricingLoading(false);
      }
    };

    // Debounce for 500ms
    const timer = setTimeout(fetchPricing, 500);
    return () => clearTimeout(timer);
  }, [dateRange, parameterQuantities, accommodationVoucher, itemId]);

  return { pricingData, pricingLoading, error };
}
