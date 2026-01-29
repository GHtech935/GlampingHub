import { useState, useEffect, useCallback, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { GlampingCartItem, MenuProductSelection } from '@/components/providers/GlampingCartProvider';
import { isPerNightMenuProducts } from '@/components/providers/GlampingCartProvider';
import type { AppliedVoucher } from '@/components/booking/VoucherInput';

interface CartItemFormState {
  dateRange: DateRange | undefined;
  parameterQuantities: Record<string, number>;
  menuProducts: Record<number, Record<string, MenuProductSelection>>; // Always per-night in form
  accommodationVoucher: AppliedVoucher | null;
}

interface UseCartItemFormStateReturn extends CartItemFormState {
  setDateRange: (dateRange: DateRange | undefined) => void;
  setParameterQuantities: (quantities: Record<string, number>) => void;
  setMenuProducts: (products: Record<number, Record<string, MenuProductSelection>>) => void;
  setAccommodationVoucher: (voucher: AppliedVoucher | null) => void;
  reset: () => void;
  isDirty: boolean;
  // Computed from parameters
  totalGuests: number;
}

/**
 * Migrate old flat menu products structure to per-night structure
 */
function migrateMenuProductsToPerNight(
  flatProducts: Record<string, MenuProductSelection>,
  nights: number
): Record<number, Record<string, MenuProductSelection>> {
  const perNight: Record<number, Record<string, MenuProductSelection>> = {};

  // Replicate flat selections to all nights
  for (let i = 0; i < nights; i++) {
    perNight[i] = { ...flatProducts };
  }

  return perNight;
}

/**
 * Hook for managing cart item form state
 * @param item - The cart item to edit (null if creating new)
 * @returns Form state and setters
 */
export function useCartItemFormState(item: GlampingCartItem | null): UseCartItemFormStateReturn {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [parameterQuantities, setParameterQuantities] = useState<Record<string, number>>({});
  const [menuProducts, setMenuProducts] = useState<Record<number, Record<string, MenuProductSelection>>>({});
  const [accommodationVoucher, setAccommodationVoucher] = useState<AppliedVoucher | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Calculate total guests from all parameters
  const totalGuests = useMemo(() => {
    return Object.values(parameterQuantities).reduce((sum, qty) => sum + qty, 0);
  }, [parameterQuantities]);

  // Initialize form with item data
  const initializeForm = useCallback(() => {
    if (item) {
      const itemDateRange = {
        from: new Date(item.checkIn),
        to: new Date(item.checkOut)
      };
      setDateRange(itemDateRange);
      setParameterQuantities(item.parameterQuantities || {});

      // Migrate menu products if needed
      const nights = differenceInDays(new Date(item.checkOut), new Date(item.checkIn));
      if (item.menuProducts) {
        // Check if it's using the old flat structure
        const isPerNight = isPerNightMenuProducts(item.menuProducts);
        if (isPerNight) {
          // Already per-night structure
          setMenuProducts(item.menuProducts as Record<number, Record<string, MenuProductSelection>>);
        } else {
          // Migrate from flat to per-night
          const migrated = migrateMenuProductsToPerNight(
            item.menuProducts as Record<string, MenuProductSelection>,
            nights
          );
          setMenuProducts(migrated);
        }
      } else {
        setMenuProducts({});
      }

      setAccommodationVoucher(item.accommodationVoucher as any || null);
      setIsDirty(false);
    }
  }, [item]);

  // Initialize on mount or when item changes
  useEffect(() => {
    initializeForm();
  }, [initializeForm]);

  // Track dirty state
  useEffect(() => {
    if (!item) {
      setIsDirty(false);
      return;
    }

    // Convert item's menu products to per-night for comparison
    let itemMenuProducts = item.menuProducts || {};
    if (!isPerNightMenuProducts(itemMenuProducts)) {
      const nights = differenceInDays(new Date(item.checkOut), new Date(item.checkIn));
      itemMenuProducts = migrateMenuProductsToPerNight(
        itemMenuProducts as Record<string, MenuProductSelection>,
        nights
      );
    }

    const hasChanges =
      dateRange?.from?.toISOString().split('T')[0] !== item.checkIn ||
      dateRange?.to?.toISOString().split('T')[0] !== item.checkOut ||
      JSON.stringify(parameterQuantities) !== JSON.stringify(item.parameterQuantities || {}) ||
      JSON.stringify(menuProducts) !== JSON.stringify(itemMenuProducts) ||
      JSON.stringify(accommodationVoucher) !== JSON.stringify(item.accommodationVoucher || null);

    setIsDirty(hasChanges);
  }, [dateRange, parameterQuantities, menuProducts, accommodationVoucher, item]);

  const reset = useCallback(() => {
    initializeForm();
  }, [initializeForm]);

  return {
    dateRange,
    parameterQuantities,
    menuProducts,
    accommodationVoucher,
    setDateRange,
    setParameterQuantities,
    setMenuProducts,
    setAccommodationVoucher,
    reset,
    isDirty,
    totalGuests
  };
}
