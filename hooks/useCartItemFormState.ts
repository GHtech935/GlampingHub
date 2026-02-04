import { useState, useEffect, useCallback, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { GlampingCartItem, MenuProductSelection, AddonSelection } from '@/components/providers/GlampingCartProvider';
import { isPerNightMenuProducts } from '@/components/providers/GlampingCartProvider';
import type { AppliedVoucher } from '@/components/booking/VoucherInput';

interface CartItemFormState {
  dateRange: DateRange | undefined;
  parameterQuantities: Record<string, number>;
  menuProducts: Record<number, Record<string, MenuProductSelection>>; // Always per-night in form
  accommodationVoucher: AppliedVoucher | null;
  addonSelections: Record<string, AddonSelection>;
}

interface UseCartItemFormStateReturn extends CartItemFormState {
  setDateRange: (dateRange: DateRange | undefined) => void;
  setParameterQuantities: (quantities: Record<string, number>) => void;
  setMenuProducts: (products: Record<number, Record<string, MenuProductSelection>>) => void;
  setAccommodationVoucher: (voucher: AppliedVoucher | null) => void;
  setAddonSelections: (selections: Record<string, AddonSelection>) => void;
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
  const [addonSelections, setAddonSelections] = useState<Record<string, AddonSelection>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Calculate total guests from all parameters
  const totalGuests = useMemo(() => {
    return Object.values(parameterQuantities).reduce((sum, qty) => sum + qty, 0);
  }, [parameterQuantities]);

  // Initialize form with item data
  // Uses functional setState to avoid creating new references when values haven't changed
  const initializeForm = useCallback(() => {
    if (item) {
      const newFrom = new Date(item.checkIn);
      const newTo = new Date(item.checkOut);

      setDateRange(prev => {
        if (prev?.from?.getTime() === newFrom.getTime() && prev?.to?.getTime() === newTo.getTime()) {
          return prev; // Same dates, keep same reference to avoid triggering pricing re-fetch
        }
        return { from: newFrom, to: newTo };
      });

      const newParamQty = item.parameterQuantities || {};
      setParameterQuantities(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newParamQty)) {
          return prev;
        }
        return newParamQty;
      });

      // Migrate menu products if needed
      const nights = differenceInDays(new Date(item.checkOut), new Date(item.checkIn));
      let newMenuProducts: Record<number, Record<string, MenuProductSelection>>;
      if (item.menuProducts) {
        const isPerNight = isPerNightMenuProducts(item.menuProducts);
        if (isPerNight) {
          newMenuProducts = item.menuProducts as Record<number, Record<string, MenuProductSelection>>;
        } else {
          newMenuProducts = migrateMenuProductsToPerNight(
            item.menuProducts as Record<string, MenuProductSelection>,
            nights
          );
        }
      } else {
        newMenuProducts = {};
      }
      setMenuProducts(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newMenuProducts)) {
          return prev;
        }
        return newMenuProducts;
      });

      const newVoucher = item.accommodationVoucher as any || null;
      setAccommodationVoucher(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newVoucher)) {
          return prev;
        }
        return newVoucher;
      });

      const newAddonSelections = item.addonSelections || {};
      setAddonSelections(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newAddonSelections)) {
          return prev;
        }
        return newAddonSelections;
      });

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
      JSON.stringify(accommodationVoucher) !== JSON.stringify(item.accommodationVoucher || null) ||
      JSON.stringify(addonSelections) !== JSON.stringify(item.addonSelections || {});

    setIsDirty(hasChanges);
  }, [dateRange, parameterQuantities, menuProducts, accommodationVoucher, addonSelections, item]);

  const reset = useCallback(() => {
    initializeForm();
  }, [initializeForm]);

  return {
    dateRange,
    parameterQuantities,
    menuProducts,
    accommodationVoucher,
    addonSelections,
    setDateRange,
    setParameterQuantities,
    setMenuProducts,
    setAccommodationVoucher,
    setAddonSelections,
    reset,
    isDirty,
    totalGuests
  };
}
