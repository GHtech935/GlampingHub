import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { differenceInDays } from 'date-fns';
import { useGlampingCart, type GlampingCartItem, type MenuProductSelection, type AddonSelection } from '@/components/providers/GlampingCartProvider';
import type { DateRange } from 'react-day-picker';
import type { AppliedVoucher } from '@/components/booking/VoucherInput';
import type { MenuProduct } from '@/components/glamping-booking/GlampingMenuProductsSelector';

interface CartItemFormState {
  dateRange: DateRange | undefined;
  parameterQuantities: Record<string, number>;
  menuProducts: Record<number, Record<string, MenuProductSelection>>; // Per-night structure
  accommodationVoucher: AppliedVoucher | null;
  addonSelections?: Record<string, AddonSelection>;
  totalGuests: number;
  isDirty?: boolean;
}

interface UseCartItemSaveParams {
  cartItemId: string;
  item: GlampingCartItem | null;
  formState: CartItemFormState;
  pricingData: any;
  menuProductsData: MenuProduct[];
  parametersData?: any[]; // Add parameters data
  autoSave?: boolean; // Enable auto-save mode
}

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseCartItemSaveReturn {
  handleSave: () => Promise<void>;
  isSaving: boolean;
  error: Error | null;
  menuProductsTotal: number;
  menuDiscountAmount: number;
  autoSaveStatus: AutoSaveStatus;
}

const AUTO_SAVE_DELAY = 500; // 500ms debounce

/**
 * Hook for saving cart item changes with optional auto-save
 * @param params - Save parameters
 * @returns Save handler, saving state, error, and auto-save status
 */
export function useCartItemSave({
  cartItemId,
  item,
  formState,
  pricingData,
  menuProductsData,
  parametersData = [],
  autoSave = false
}: UseCartItemSaveParams): UseCartItemSaveReturn {
  const { updateCartItem } = useGlampingCart();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate menu products total (base price before discounts) - sum across all nights
  const menuProductsTotal = useMemo(() => {
    return Object.values(formState.menuProducts).reduce((sum, nightSelections) => {
      if (!nightSelections) return sum; // Skip null/undefined nights
      return sum + Object.values(nightSelections).reduce(
        (nightSum, selection) => {
          if (!selection) return nightSum; // Skip null/undefined selections
          return nightSum + (selection.price * selection.quantity);
        },
        0
      );
    }, 0);
  }, [formState.menuProducts]);

  // Calculate total menu discount (sum of all per-item vouchers) - sum across all nights
  const menuDiscountAmount = useMemo(() => {
    return Object.values(formState.menuProducts).reduce((sum, nightSelections) => {
      if (!nightSelections) return sum; // Skip null/undefined nights
      return sum + Object.values(nightSelections).reduce(
        (nightSum, selection) => {
          if (!selection) return nightSum; // Skip null/undefined selections
          return nightSum + (selection.voucher?.discountAmount || 0);
        },
        0
      );
    }, 0);
  }, [formState.menuProducts]);

  // Calculate total add-on cost (sum of all selected addon totalPrices)
  const addonsTotalCost = useMemo(() => {
    if (!formState.addonSelections) return 0;
    return Object.values(formState.addonSelections).reduce((sum, sel) => {
      if (!sel || !sel.selected) return sum;
      return sum + (sel.totalPrice || 0);
    }, 0);
  }, [formState.addonSelections]);

  // Calculate total add-on voucher discount
  const addonsDiscountAmount = useMemo(() => {
    if (!formState.addonSelections) return 0;
    return Object.values(formState.addonSelections).reduce((sum, sel) => {
      if (!sel || !sel.selected) return sum;
      return sum + (sel.voucher?.discountAmount || 0);
    }, 0);
  }, [formState.addonSelections]);

  // Core save logic without toast (for auto-save)
  const performSave = useCallback(async (silent: boolean = false) => {
    if (!item || !formState.dateRange?.from || !formState.dateRange?.to) {
      if (!silent) {
        setError(new Error('Vui lòng chọn ngày nhận phòng và trả phòng'));
      }
      return;
    }

    setIsSaving(true);
    if (autoSave) {
      setAutoSaveStatus('saving');
    }
    setError(null);

    try {
      const nights = differenceInDays(formState.dateRange.to, formState.dateRange.from);
      const checkIn = formState.dateRange.from.toISOString().split('T')[0];
      const checkOut = formState.dateRange.to.toISOString().split('T')[0];

      // Build updated parameter details
      const parameters = Object.entries(formState.parameterQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([paramId, quantity]) => {
          // First try to get from parametersData (full data with multilingual names)
          const paramData = parametersData.find(p => p.parameter_id === paramId || p.id === paramId);
          const existingParam = item.parameters?.find(p => p.id === paramId);

          // Extract name from multilingual object if present
          let name = '';
          if (paramData?.name) {
            if (typeof paramData.name === 'object' && paramData.name !== null) {
              name = paramData.name.vi || paramData.name.en || '';
            } else {
              name = paramData.name || '';
            }
          } else if (existingParam?.name) {
            if (typeof existingParam.name === 'object' && existingParam.name !== null) {
              name = existingParam.name.vi || existingParam.name.en || '';
            } else {
              name = existingParam.name || '';
            }
          }

          return {
            id: paramId,
            name,
            color_code: paramData?.color_code || existingParam?.color_code,
            quantity,
            counted_for_menu: paramData?.counted_for_menu || existingParam?.counted_for_menu || false
          };
        });

      // Build menu products details from all nights (for backward compatibility with old display)
      // Aggregate quantities across nights
      const menuProductsAggregated: Record<string, { name: string; price: number; quantity: number }> = {};
      Object.values(formState.menuProducts).forEach((nightSelections) => {
        Object.entries(nightSelections).forEach(([id, selection]) => {
          if (selection.quantity > 0) {
            if (!menuProductsAggregated[id]) {
              menuProductsAggregated[id] = {
                name: selection.name,
                price: selection.price,
                quantity: 0
              };
            }
            menuProductsAggregated[id].quantity += selection.quantity;
          }
        });
      });

      const menuProductsDetails = Object.entries(menuProductsAggregated).map(([id, data]) => ({
        id,
        name: data.name,
        price: data.price,
        quantity: data.quantity
      }));

      // Calculate pricing breakdown
      const accommodationCost = Number(pricingData?.totals?.accommodationCost) || 0;
      const accommodationDiscount = Number(formState.accommodationVoucher?.discountAmount) || 0;
      const menuProductsCost = Number(menuProductsTotal) || 0;
      const menuDiscount = Number(menuDiscountAmount) || 0;
      const addonsCost = Number(addonsTotalCost) || 0;
      const addonsDiscount = Number(addonsDiscountAmount) || 0;
      const subtotal = accommodationCost - accommodationDiscount
                     + menuProductsCost - menuDiscount
                     + addonsCost - addonsDiscount;

      updateCartItem(cartItemId, {
        checkIn,
        checkOut,
        nights,
        // Use totalGuests for both adults and children (all parameters are guests)
        adults: formState.totalGuests,
        children: 0,
        parameterQuantities: formState.parameterQuantities,
        parameters,
        menuProducts: formState.menuProducts, // Now includes per-item vouchers
        menuProductsDetails,
        addonSelections: formState.addonSelections || {},
        accommodationVoucher: formState.accommodationVoucher as any || null,
        pricingBreakdown: {
          accommodationCost,
          menuProductsCost,
          accommodationDiscount,
          menuDiscount,
          addonsCost,
          addonsDiscount,
          subtotal
        },
        totalPrice: subtotal
      });

      if (autoSave) {
        setAutoSaveStatus('saved');
        // Clear "saved" status after 2 seconds
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current);
        }
        savedTimeoutRef.current = setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 2000);
      }
    } catch (err) {
      console.error('Error updating cart item:', err);
      setError(err as Error);
      if (autoSave) {
        setAutoSaveStatus('error');
      }
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [item, formState, pricingData, menuProductsTotal, menuDiscountAmount, addonsTotalCost, addonsDiscountAmount, cartItemId, updateCartItem, parametersData, autoSave]);

  // Public handleSave function (for manual save)
  const handleSave = useCallback(async () => {
    await performSave(false);
  }, [performSave]);

  // Auto-save effect: debounce and save when form state changes
  useEffect(() => {
    if (!autoSave || !formState.isDirty) {
      return;
    }

    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      performSave(true);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [autoSave, formState, performSave]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  return {
    handleSave,
    isSaving,
    error,
    menuProductsTotal,
    menuDiscountAmount,
    autoSaveStatus
  };
}
