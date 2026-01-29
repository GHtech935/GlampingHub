"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { GlampingDateRangePickerWithCalendar } from '@/components/admin/GlampingDateRangePickerWithCalendar';
import { GlampingMenuProductsSelector } from '@/components/glamping-booking/GlampingMenuProductsSelector';
import VoucherInput from '@/components/booking/VoucherInput';
import { useCartItemFormState } from '@/hooks/useCartItemFormState';
import { useMenuProductsData } from '@/hooks/useMenuProductsData';
import { useCartItemPricing } from '@/hooks/useCartItemPricing';
import { useCartItemSave } from '@/hooks/useCartItemSave';
import { useGlampingParameters } from '@/hooks/useGlampingParameters';
import type { GlampingCartItem } from '@/components/providers/GlampingCartProvider';

interface CartItemInlineEditFormProps {
  item: GlampingCartItem;
  onSave: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function CartItemInlineEditForm({
  item,
  onSave,
  onCancel,
  isOpen
}: CartItemInlineEditFormProps) {
  // Use custom hooks
  const formState = useCartItemFormState(item);
  // Fetch all available parameters for the item
  const { parameters, loading: parametersLoading } = useGlampingParameters(item.itemId);
  const { menuProducts, loading: menuLoading } = useMenuProductsData(item.itemId);
  const { pricingData, pricingLoading } = useCartItemPricing({
    itemId: item.itemId,
    dateRange: formState.dateRange,
    parameterQuantities: formState.parameterQuantities,
    accommodationVoucher: formState.accommodationVoucher
  });
  const { handleSave, isSaving, menuProductsTotal, menuDiscountAmount } = useCartItemSave({
    cartItemId: item.id,
    item,
    formState,
    pricingData,
    menuProductsData: menuProducts,
    parametersData: parameters
  });

  // Calculate number of nights
  const nights = React.useMemo(() => {
    if (!formState.dateRange?.from || !formState.dateRange?.to) return 0;
    return differenceInDays(formState.dateRange.to, formState.dateRange.from);
  }, [formState.dateRange]);

  // Calculate total counted guests from parameters
  const totalCountedGuests = React.useMemo(() => {
    if (!parameters || parameters.length === 0) return 0;

    return Object.entries(formState.parameterQuantities).reduce((total, [paramId, quantity]) => {
      const param = parameters.find(p => p.id === paramId || p.parameter_id === paramId);
      if (param && param.counted_for_menu) {
        return total + (quantity || 0);
      }
      return total;
    }, 0);
  }, [formState.parameterQuantities, parameters]);

  // Handle save with callback
  const handleSaveClick = async () => {
    try {
      await handleSave();
      onSave();
    } catch (error) {
      // Error already handled by hook
    }
  };

  // Handle cancel with dirty check
  const handleCancelClick = () => {
    if (formState.isDirty) {
      if (confirm('Bỏ các thay đổi chưa lưu?')) {
        formState.reset();
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-blue-900">Đang chỉnh sửa</h4>
        {formState.isDirty && (
          <span className="text-xs text-orange-600 font-medium">Có thay đổi chưa lưu</span>
        )}
      </div>

      {/* Date Range & Parameters (Integrated Calendar) */}
      <div>
        <GlampingDateRangePickerWithCalendar
          itemId={item.itemId}
          dateRange={formState.dateRange}
          onDateRangeChange={formState.setDateRange}
          locale="vi"
          parameters={parameters}
          parameterQuantities={formState.parameterQuantities}
          onQuantitiesChange={formState.setParameterQuantities}
          loadingParameters={parametersLoading}
          overrideParameterPricing={pricingData?.parameterPricing}
        />
      </div>

      {/* Menu Products */}
      {menuLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Đang tải món ăn...</span>
        </div>
      ) : menuProducts.length > 0 ? (
        <div>
          <Label className="mb-2 block text-base font-semibold">Món ăn & đồ uống</Label>
          <GlampingMenuProductsSelector
            menuProducts={menuProducts}
            nightlySelections={formState.menuProducts}
            onChange={formState.setMenuProducts}
            locale="vi"
            totalCountedGuests={totalCountedGuests}
            nights={nights}
            checkInDate={formState.dateRange?.from}
          />
        </div>
      ) : null}

      {/* Accommodation Voucher */}
      <div>
        <VoucherInput
          zoneId={item.zoneId}
          itemId={item.itemId}
          checkIn={formState.dateRange?.from ? format(formState.dateRange.from, 'yyyy-MM-dd') : undefined}
          checkOut={formState.dateRange?.to ? format(formState.dateRange.to, 'yyyy-MM-dd') : undefined}
          totalAmount={pricingData?.totals?.accommodationCost || 0}
          applicationType="accommodation"
          appliedVoucher={formState.accommodationVoucher}
          onVoucherApplied={formState.setAccommodationVoucher}
          onVoucherRemoved={() => formState.setAccommodationVoucher(null)}
          validationEndpoint="/api/glamping/validate-voucher"
          locale="vi"
        />
      </div>

      {/* Pricing Preview */}
      <Card className="bg-white border-blue-200">
        <CardContent className="pt-6">
          {pricingLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Đang tính giá...</span>
            </div>
          ) : pricingData ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tiền lều</span>
                <span className="font-semibold">
                  {formatCurrency(pricingData.totals?.accommodationCost || 0)}
                </span>
              </div>

              {formState.accommodationVoucher && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>- Voucher lều ({formState.accommodationVoucher.code})</span>
                  <span>-{formatCurrency(formState.accommodationVoucher.discountAmount)}</span>
                </div>
              )}

              {menuProductsTotal > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Món ăn</span>
                    <span className="font-semibold">
                      {formatCurrency(menuProductsTotal)}
                    </span>
                  </div>
                  {menuDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>- Voucher món ăn</span>
                      <span>-{formatCurrency(menuDiscountAmount)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-blue-600">
                  {formatCurrency(
                    (pricingData.totals?.accommodationCost || 0) -
                    (formState.accommodationVoucher?.discountAmount || 0) +
                    menuProductsTotal -
                    menuDiscountAmount
                  )}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">Chọn ngày và thông tin để xem giá</p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancelClick}
          disabled={isSaving}
        >
          Hủy
        </Button>
        <Button
          type="button"
          onClick={handleSaveClick}
          disabled={isSaving || pricingLoading}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Đang lưu...
            </>
          ) : (
            'Lưu thay đổi'
          )}
        </Button>
      </div>
    </div>
  );
}
