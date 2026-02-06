"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Locale, MultilingualText } from "@/lib/i18n-utils";
import { GlampingDateRangePickerWithCalendar } from "@/components/admin/GlampingDateRangePickerWithCalendar";
import VoucherInput, { type AppliedVoucher } from "@/components/booking/VoucherInput";

interface GlampingParameter {
  id: string;
  parameter_id: string;
  name: MultilingualText | string;
  color_code: string;
  controls_inventory: boolean;
  sets_pricing: boolean;
  min_quantity?: number;
  max_quantity?: number;
  counted_for_menu?: boolean;
}

export interface GlampingTentFormSectionsProps {
  // Context
  mode: 'add' | 'edit';
  zoneId: string;
  itemId: string;
  bookingId?: string; // For Edit mode (exclude from availability)
  locale?: Locale;
  disabled?: boolean;

  // Section 2: Dates & Parameters
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  parameters: GlampingParameter[];
  parameterQuantities: Record<string, number>;
  onQuantitiesChange: (quantities: Record<string, number>) => void;
  loadingParameters?: boolean;
  parameterPricing: Record<string, number>;
  parameterPricingModes: Record<string, 'per_person' | 'per_group'>;
  pricingLoading?: boolean;

  // Section 3: Voucher
  accommodationVoucher: AppliedVoucher | null;
  onVoucherApplied: (voucher: AppliedVoucher) => void;
  onVoucherRemoved: () => void;
  accommodationCost: number;

  // Section 4: Special Requests
  specialRequests: string;
  onSpecialRequestsChange: (value: string) => void;

  // Pricing Summary
  nights: number;
  totalAfterVoucher: number;

  // Edit-only: Subtotal Override
  showSubtotalOverride?: boolean;
  subtotalOverride?: number | undefined;
  onSubtotalOverrideChange?: (value: number | undefined) => void;
  onToggleSubtotalOverride?: () => void;
  calculatedSubtotal?: number;
}

const texts = {
  vi: {
    selectDatesAndParams: 'Chọn Ngày & Số lượng khách',
    voucher: 'Voucher lưu trú',
    specialRequests: 'Yêu cầu đặc biệt',
    specialRequestsPlaceholder: 'Nhập yêu cầu đặc biệt (nếu có)...',
    pricingSummary: 'Tổng tiền lều',
    accommodation: 'Lưu trú',
    voucherDiscount: 'Giảm giá voucher',
    total: 'Tổng cộng',
    nights: 'đêm',
    subtotalOverride: 'Ghi đè tạm tính',
    removeOverride: 'Bỏ ghi đè',
    subtotalOverrideHint: 'Để trống để tự tính',
  },
  en: {
    selectDatesAndParams: 'Select Dates & Guests',
    voucher: 'Accommodation Voucher',
    specialRequests: 'Special Requests',
    specialRequestsPlaceholder: 'Enter special requests (optional)...',
    pricingSummary: 'Tent Total',
    accommodation: 'Accommodation',
    voucherDiscount: 'Voucher discount',
    total: 'Total',
    nights: 'nights',
    subtotalOverride: 'Subtotal Override',
    removeOverride: 'Remove override',
    subtotalOverrideHint: 'Leave empty for auto-calc',
  },
};

export function GlampingTentFormSections(props: GlampingTentFormSectionsProps) {
  const {
    mode,
    zoneId,
    itemId,
    bookingId,
    locale = 'vi',
    disabled = false,
    dateRange,
    onDateRangeChange,
    parameters,
    parameterQuantities,
    onQuantitiesChange,
    loadingParameters,
    parameterPricing,
    parameterPricingModes,
    pricingLoading,
    accommodationVoucher,
    onVoucherApplied,
    onVoucherRemoved,
    accommodationCost,
    specialRequests,
    onSpecialRequestsChange,
    nights,
    totalAfterVoucher,
    showSubtotalOverride,
    subtotalOverride,
    onSubtotalOverrideChange,
    onToggleSubtotalOverride,
    calculatedSubtotal,
  } = props;

  const t = texts[locale];

  return (
    <div className="space-y-6">
      {/* Section 2: Dates & Parameters */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">2</span>
          {t.selectDatesAndParams}
          <span className="text-red-500">*</span>
        </h3>
        <GlampingDateRangePickerWithCalendar
          itemId={itemId}
          excludeBookingId={mode === 'edit' ? bookingId : undefined}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          locale={locale}
          disabled={disabled}
          parameters={parameters}
          parameterQuantities={parameterQuantities}
          onQuantitiesChange={onQuantitiesChange}
          loadingParameters={loadingParameters}
          overrideParameterPricing={parameterPricing}
          overrideParameterPricingModes={parameterPricingModes}
          pricingLoading={pricingLoading}
          allowPastDates
        />
      </div>

      {/* Section 3: Voucher */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">3</span>
          {t.voucher}
        </h3>
        <VoucherInput
          zoneId={zoneId}
          itemId={itemId}
          checkIn={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined}
          checkOut={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined}
          totalAmount={accommodationCost}
          locale={locale}
          validationEndpoint="/api/glamping/validate-voucher"
          applicationType="accommodation"
          appliedVoucher={accommodationVoucher}
          onVoucherApplied={onVoucherApplied}
          onVoucherRemoved={onVoucherRemoved}
        />
      </div>

      {/* Section 4: Special Requests */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">4</span>
          {t.specialRequests}
        </h3>
        <Textarea
          value={specialRequests}
          onChange={(e) => onSpecialRequestsChange(e.target.value)}
          placeholder={t.specialRequestsPlaceholder}
          rows={3}
          disabled={disabled}
        />
      </div>

      {/* Edit-only: Subtotal Override */}
      {mode === 'edit' && (
        <div>
          {showSubtotalOverride ? (
            <div>
              <div className="flex items-center justify-between">
                <Label>{t.subtotalOverride}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onToggleSubtotalOverride?.();
                    onSubtotalOverrideChange?.(undefined);
                  }}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-red-600"
                >
                  <X className="h-3 w-3 mr-1" />
                  {t.removeOverride}
                </Button>
              </div>
              <CurrencyInput
                value={subtotalOverride}
                onValueChange={(val) => onSubtotalOverrideChange?.(val)}
                placeholder={t.subtotalOverrideHint}
                className="mt-1"
              />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSubtotalOverride}
              className="w-full text-gray-500"
            >
              {t.subtotalOverride}
            </Button>
          )}
        </div>
      )}

      {/* Pricing Summary Card */}
      {accommodationCost !== undefined && parameters.length > 0 && Object.values(parameterQuantities).some(q => q > 0) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-3">{t.pricingSummary}</h4>
            <div className="space-y-1.5 text-sm">
              {/* Accommodation */}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {t.accommodation} ({nights} {t.nights})
                </span>
                <span className="font-medium">
                  {accommodationCost === 0 ? (
                    <span className="text-green-600">{locale === 'vi' ? 'Miễn phí' : 'Free'}</span>
                  ) : (
                    formatCurrency(accommodationCost)
                  )}
                </span>
              </div>

              {/* Voucher discount */}
              {accommodationVoucher && accommodationVoucher.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t.voucherDiscount} ({accommodationVoucher.code})</span>
                  <span>-{formatCurrency(accommodationVoucher.discountAmount)}</span>
                </div>
              )}

              {/* Total */}
              <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between font-bold text-base">
                <span>{t.total}</span>
                <span className="text-blue-700">
                  {totalAfterVoucher === 0 ? (
                    <span className="text-green-600">{locale === 'vi' ? 'Miễn phí' : 'Free'}</span>
                  ) : (
                    formatCurrency(totalAfterVoucher)
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
