import { useState, useCallback, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useGlampingCart, type GlampingCartItem, type MenuProductSelection } from '@/components/providers/GlampingCartProvider';
import type { DateRange } from 'react-day-picker';
import type { AppliedVoucher } from '@/components/booking/VoucherInput';
import type { MenuProduct } from '@/components/glamping-booking/GlampingMenuProductsSelector';

interface CartItemFormState {
  dateRange: DateRange | undefined;
  parameterQuantities: Record<string, number>;
  menuProducts: Record<number, Record<string, MenuProductSelection>>; // Per-night structure
  accommodationVoucher: AppliedVoucher | null;
  totalGuests: number;
}

interface UseCartItemSaveParams {
  cartItemId: string;
  item: GlampingCartItem | null;
  formState: CartItemFormState;
  pricingData: any;
  menuProductsData: MenuProduct[];
  parametersData?: any[]; // Add parameters data
}

interface UseCartItemSaveReturn {
  handleSave: () => Promise<void>;
  isSaving: boolean;
  error: Error | null;
  menuProductsTotal: number;
  menuDiscountAmount: number;
}

/**
 * Hook for saving cart item changes
 * @param params - Save parameters
 * @returns Save handler, saving state, and error
 */
export function useCartItemSave({
  cartItemId,
  item,
  formState,
  pricingData,
  menuProductsData,
  parametersData = []
}: UseCartItemSaveParams): UseCartItemSaveReturn {
  const { updateCartItem } = useGlampingCart();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

  const handleSave = useCallback(async () => {
    if (!item || !formState.dateRange?.from || !formState.dateRange?.to) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn ngày nhận phòng và trả phòng',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
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
      const subtotal = accommodationCost - accommodationDiscount + menuProductsCost - menuDiscount;

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
        accommodationVoucher: formState.accommodationVoucher as any || null,
        pricingBreakdown: {
          accommodationCost,
          menuProductsCost,
          accommodationDiscount,
          menuDiscount,
          subtotal
        },
        totalPrice: subtotal
      });

      toast({
        title: 'Đã cập nhật',
        description: 'Thông tin lều đã được cập nhật thành công',
      });
    } catch (err) {
      console.error('Error updating cart item:', err);
      setError(err as Error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật thông tin lều',
        variant: 'destructive'
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [item, formState, pricingData, menuProductsData, menuProductsTotal, menuDiscountAmount, cartItemId, updateCartItem, toast]);

  return {
    handleSave,
    isSaving,
    error,
    menuProductsTotal,
    menuDiscountAmount
  };
}
