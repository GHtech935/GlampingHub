"use client";

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Check, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { GlampingDateRangePickerWithCalendar } from '@/components/admin/GlampingDateRangePickerWithCalendar';
import { GlampingMenuProductsSelector } from '@/components/glamping-booking/GlampingMenuProductsSelector';
import VoucherInput from '@/components/booking/VoucherInput';
import { useCartItemFormState } from '@/hooks/useCartItemFormState';
import { useMenuProductsData } from '@/hooks/useMenuProductsData';
import { useCartItemPricing } from '@/hooks/useCartItemPricing';
import { useCartItemSave, type AutoSaveStatus } from '@/hooks/useCartItemSave';
import { useGlampingParameters } from '@/hooks/useGlampingParameters';
import type { GlampingCartItem } from '@/components/providers/GlampingCartProvider';

interface CartItemInlineEditFormProps {
  item: GlampingCartItem;
  isOpen: boolean;
}

// Auto-save status indicator component
function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Đang lưu...</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Check className="h-3 w-3" />
        <span>Đã lưu</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600">
        <span>Lỗi khi lưu</span>
      </div>
    );
  }

  return null;
}

export function CartItemInlineEditForm({
  item,
  isOpen
}: CartItemInlineEditFormProps) {
  const [isBookingInfoExpanded, setIsBookingInfoExpanded] = useState(false);

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
  const { isSaving, menuProductsTotal, menuDiscountAmount, autoSaveStatus } = useCartItemSave({
    cartItemId: item.id,
    item,
    formState: { ...formState, isDirty: formState.isDirty },
    pricingData,
    menuProductsData: menuProducts,
    parametersData: parameters,
    autoSave: true
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

  // Fix menu product prices from API data if they got corrupted in cart
  // This handles cases where old data saved with discounted prices instead of original prices
  React.useEffect(() => {
    if (!menuProducts || menuProducts.length === 0) return;
    if (Object.keys(formState.menuProducts).length === 0) return;

    let needsFix = false;
    const fixedMenuProducts = { ...formState.menuProducts };

    // Create a map of product prices from API
    const productPriceMap: Record<string, number> = {};
    menuProducts.forEach(product => {
      productPriceMap[product.id] = product.price;
    });

    // Check each night's selections and fix prices if needed
    Object.entries(fixedMenuProducts).forEach(([nightIndex, nightSelections]) => {
      if (!nightSelections) return;

      Object.entries(nightSelections).forEach(([productId, selection]) => {
        if (!selection) return;

        const correctPrice = productPriceMap[productId];
        if (correctPrice !== undefined && selection.price !== correctPrice) {
          // Price is wrong, fix it
          needsFix = true;
          (fixedMenuProducts as any)[nightIndex][productId] = {
            ...selection,
            price: correctPrice
          };
        }
      });
    });

    // Update form state if prices were fixed
    if (needsFix) {
      console.log('[CartItemInlineEditForm] Fixed corrupted menu product prices');
      formState.setMenuProducts(fixedMenuProducts);
    }
  }, [menuProducts, formState.menuProducts, formState.setMenuProducts]);

  if (!isOpen) {
    return null;
  }

  // Format date for display
  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) return '--';
    return format(date, 'dd/MM/yyyy', { locale: vi });
  };

  // Get parameter name helper
  const getParamName = (param: any) => {
    if (!param) return '';
    if (typeof param.name === 'object' && param.name !== null) {
      return param.name.vi || param.name.en || '';
    }
    return param.name || '';
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 mt-4">
      <div className="flex items-center justify-between">
        <AutoSaveIndicator status={autoSaveStatus} />
      </div>

      {/* Booking Info Section - Collapsible */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Summary Header - Always visible */}
        <div
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsBookingInfoExpanded(!isBookingInfoExpanded)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-gray-800">Thông tin đặt phòng</h4>
                <Badge variant="secondary" className="text-xs">
                  {nights} đêm
                </Badge>
              </div>

              {/* Dates */}
              <div className="text-sm text-gray-600 mb-2">
                <span>Check-in: </span>
                <strong>{formatDisplayDate(formState.dateRange?.from)}</strong>
                <span className="mx-2">→</span>
                <span>Check-out: </span>
                <strong>{formatDisplayDate(formState.dateRange?.to)}</strong>
              </div>

              {/* Parameters Summary */}
              {parameters && parameters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parameters.map((param) => {
                    const quantity = formState.parameterQuantities[param.id] || formState.parameterQuantities[param.parameter_id] || 0;
                    if (quantity === 0) return null;

                    return (
                      <Badge
                        key={param.id || param.parameter_id}
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: param.color_code || undefined,
                          color: param.color_code || undefined
                        }}
                      >
                        {getParamName(param)}: {quantity}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Accommodation Price */}
              {pricingData?.totals?.accommodationCost && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">Tiền lều: </span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(pricingData.totals.accommodationCost)}
                  </span>
                </div>
              )}
            </div>

            {/* Edit Button */}
            <Button
              type="button"
              variant={isBookingInfoExpanded ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              {isBookingInfoExpanded ? 'Đóng' : 'Sửa'}
              {isBookingInfoExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Collapsible Content - Date Picker & Parameters */}
        <Collapsible open={isBookingInfoExpanded}>
          <CollapsibleContent>
            <div className="p-4 pt-0 border-t border-gray-200">
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
                overrideParameterPricingModes={pricingData?.parameterPricingModes}
                overrideNightlyPricing={pricingData?.nightlyPricing}
                pricingLoading={pricingLoading || (formState.dateRange?.from && formState.dateRange?.to && !pricingData)}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
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

    </div>
  );
}
