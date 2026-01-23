"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import VoucherInput, { AppliedVoucher } from "@/components/booking/VoucherInput";
import NightlyBreakdown from "@/components/booking/NightlyBreakdown";

interface MenuProductForPricing {
  id: string;
  name: any; // Can be string or JSONB object
  price: number;
}

interface GlampingPricingSummaryProps {
  pricingData: any;
  locale: string;
  appliedVoucher?: AppliedVoucher | null;
  onVoucherApplied?: (voucher: AppliedVoucher) => void;
  onVoucherRemoved?: () => void;
  zoneId?: string;
  itemId?: string;
  checkIn?: string;
  checkOut?: string;
  basePrice?: number;
  parameters?: Array<{
    id: string;
    name: string;
    color_code?: string;
    quantity: number;
  }>;
  menuProducts?: MenuProductForPricing[];
  menuProductSelections?: Record<string, number>;
}

// Helper function to extract localized string from JSONB field
const getLocalizedString = (value: any, locale: string, fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale] || value.vi || value.en || fallback;
  }
  return fallback;
};

export default function GlampingPricingSummary({
  pricingData,
  locale,
  appliedVoucher,
  onVoucherApplied,
  onVoucherRemoved,
  zoneId,
  itemId,
  checkIn,
  checkOut,
  basePrice = 0,
  parameters = [],
  menuProducts = [],
  menuProductSelections = {},
}: GlampingPricingSummaryProps) {
  const [showNightlyBreakdown, setShowNightlyBreakdown] = useState(false);

  // i18n labels
  const labels = {
    loading: locale === 'vi' ? 'Đang tải...' : 'Loading...',
    totalCost: locale === 'vi' ? 'TỔNG CHI PHÍ' : 'TOTAL COST',
    accommodationCost: locale === 'vi' ? 'Chi phí lưu trú' : 'Accommodation cost',
    menuProductsCost: locale === 'vi' ? 'Món ăn / Đồ uống' : 'Food & Drinks',
    nightlyDetails: locale === 'vi' ? 'Chi tiết theo đêm' : 'Nightly breakdown',
    subtotal: locale === 'vi' ? 'Tạm tính' : 'Subtotal',
    discountCode: locale === 'vi' ? 'Mã giảm giá' : 'Discount code',
    totalAfterDiscount: locale === 'vi' ? 'Tổng sau giảm giá' : 'Total after discount',
    grandTotal: locale === 'vi' ? 'TỔNG CỘNG' : 'GRAND TOTAL',
    vatNote: locale === 'vi'
      ? 'Chưa bao gồm thuế VAT ({taxRate}%). Thuế sẽ được tính khi khách hàng yêu cầu xuất hóa đơn đỏ.'
      : 'VAT ({taxRate}%) not included. Tax will be calculated when customer requests a red invoice.',
  };

  // Calculate menu products total
  const menuProductsTotal = menuProducts.reduce((sum, product) => {
    const quantity = menuProductSelections[product.id] || 0;
    return sum + (product.price * quantity);
  }, 0);

  // Get selected menu products with quantities for display
  const selectedMenuProducts = menuProducts
    .filter(p => (menuProductSelections[p.id] || 0) > 0)
    .map(p => ({
      ...p,
      quantity: menuProductSelections[p.id] || 0,
      total: p.price * (menuProductSelections[p.id] || 0),
    }));

  if (!pricingData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-500">{labels.loading}</div>
      </div>
    );
  }

  // Extract data from pricingData
  const accommodationCost = pricingData.totals?.accommodationCost || 0;
  const voucherDiscount = pricingData.totals?.voucherDiscount || 0;
  const taxRate = pricingData.taxInfo?.rate || 0;

  // Calculate totals using simplified logic (including menu products)
  const subtotal = accommodationCost + menuProductsTotal;
  const subtotalAfterVoucher = subtotal - voucherDiscount;
  // Grand total WITHOUT VAT (customer only pays tax if requesting red invoice)
  const grandTotal = subtotalAfterVoucher;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-white px-6 py-3">
        <h2 className="text-lg font-semibold">
          {labels.totalCost}
        </h2>
      </div>

      <div className="p-6 space-y-4 border border-primary-green rounded-b-lg">
        {/* Breakdown */}
        <div className="space-y-3 pb-4 border-b-2 border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">{labels.accommodationCost}</span>

              {/* Info icon with nightly breakdown */}
              <Dialog open={showNightlyBreakdown} onOpenChange={setShowNightlyBreakdown}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-blue-50"
                  >
                    <Info className="h-4 w-4 text-blue-600" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{labels.nightlyDetails}</DialogTitle>
                  </DialogHeader>
                  {checkIn && checkOut && pricingData?.nightlyPricing && (
                    <NightlyBreakdown
                      checkIn={checkIn}
                      checkOut={checkOut}
                      basePrice={basePrice}
                      autoDiscounts={pricingData.autoDiscounts || []}
                      locale={locale}
                      nightlyPricing={pricingData.nightlyPricing}
                      displayAutoDiscounts={pricingData.autoDiscounts || []}
                      parameters={parameters}
                      parameterQuantities={pricingData.parameterQuantities}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>
            <span className="font-medium">{formatCurrency(accommodationCost)}</span>
          </div>

          {/* Parameters Breakdown */}
          {parameters && parameters.length > 0 && (
            <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">
                {locale === 'vi' ? 'Số lượng khách' : 'Guest Quantities'}
              </div>
              {parameters.map((param) => {
                const paramPrice = pricingData?.parameterPricing?.[param.id] || 0;
                return (
                  <div key={param.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      {param.color_code && (
                        <div
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: param.color_code }}
                        />
                      )}
                      <span className="text-gray-700">
                        {param.name} x {param.quantity}
                      </span>
                    </div>
                    <span className="font-medium text-gray-800">
                      {formatCurrency(paramPrice * param.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Menu Products Breakdown */}
          {selectedMenuProducts.length > 0 && (
            <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{labels.menuProductsCost}</span>
                <span className="font-medium">{formatCurrency(menuProductsTotal)}</span>
              </div>
              <div className="space-y-1 pl-4">
                {selectedMenuProducts.map((product) => (
                  <div key={product.id} className="flex justify-between items-center text-sm text-gray-600">
                    <span>
                      {getLocalizedString(product.name, locale, 'Product')} x {product.quantity}
                    </span>
                    <span>{formatCurrency(product.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Subtotal */}
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-semibold text-gray-900">{labels.subtotal}</span>
          <span className="font-bold text-lg">{formatCurrency(subtotal)}</span>
        </div>

        {/* Voucher Input Section */}
        <div className="py-3 border-b border-gray-200">
          <VoucherInput
            zoneId={zoneId}
            itemId={itemId}
            checkIn={checkIn}
            checkOut={checkOut}
            totalAmount={accommodationCost}
            customerId={undefined}
            locale={locale}
            validationEndpoint="/api/glamping/validate-voucher"
            onVoucherApplied={onVoucherApplied || (() => {})}
            onVoucherRemoved={onVoucherRemoved || (() => {})}
          />

          {/* Show applied voucher discount */}
          {voucherDiscount > 0 && appliedVoucher && (
            <div className="flex justify-between items-center mt-3 text-green-600">
              <span className="font-medium">
                {labels.discountCode} ({appliedVoucher.code})
              </span>
              <span className="font-semibold">
                -{formatCurrency(voucherDiscount)}
              </span>
            </div>
          )}
        </div>

        {/* Subtotal after voucher */}
        <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
          <span className="font-semibold text-gray-900">
            {labels.totalAfterDiscount}
          </span>
          <span className="font-bold text-lg">
            {formatCurrency(subtotalAfterVoucher)}
          </span>
        </div>

        {/* Grand Total - WITHOUT TAX */}
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xl text-gray-900">{labels.grandTotal}</span>
            <span className="font-bold text-2xl text-green-600">
              {formatCurrency(grandTotal)}
            </span>
          </div>
          {/* Tax info note */}
          <div className="mt-3 pt-2 border-t border-green-300">
            <p className="text-xs text-gray-600 text-center">
              ℹ️ {labels.vatNote.replace('{taxRate}', String(taxRate))}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
