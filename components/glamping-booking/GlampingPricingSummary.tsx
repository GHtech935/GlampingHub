"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
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
import type { GlampingCartItem } from "@/components/providers/GlampingCartProvider";
import { isPerNightMenuProducts } from "@/components/providers/GlampingCartProvider";

interface MenuProductForPricing {
  id: string;
  name: any; // Can be string or JSONB object
  price: number;
}

interface MenuProductSelection {
  quantity: number;
  price: number;
  name: string;
  voucher?: {
    code: string;
    id: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null;
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
    name: string | { vi?: string; en?: string };
    color_code?: string;
    quantity: number;
    counted_for_menu?: boolean;
  }>;
  menuProducts?: MenuProductForPricing[];
  menuProductSelections?: Record<string, MenuProductSelection>;
  // Multi-item cart mode props
  cartItems?: GlampingCartItem[];
  isCartMode?: boolean;
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
  cartItems = [],
  isCartMode = false,
}: GlampingPricingSummaryProps) {
  const [showNightlyBreakdown, setShowNightlyBreakdown] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItemExpansion = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

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

  // Calculate menu products total (with voucher discounts)
  // Note: This is only used for single-item mode. Cart mode uses item.pricingBreakdown.menuProductsCost
  const menuProductsTotal = Object.values(menuProductSelections).reduce((sum, selection) => {
    if (!selection) return sum; // Skip null/undefined
    const itemTotal = selection.price * selection.quantity;
    const discount = selection.voucher?.discountAmount || 0;
    return sum + itemTotal - discount;
  }, 0);

  // Get selected menu products with quantities for display
  const selectedMenuProducts = Object.entries(menuProductSelections)
    .filter(([_, selection]) => selection.quantity > 0)
    .map(([productId, selection]) => ({
      id: productId,
      name: selection.name,
      price: selection.price,
      quantity: selection.quantity,
      total: selection.price * selection.quantity,
      voucher: selection.voucher,
      finalTotal: (selection.price * selection.quantity) - (selection.voucher?.discountAmount || 0),
    }));

  if (!pricingData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-500">{labels.loading}</div>
      </div>
    );
  }

  // Cart mode: Use multi-item pricing structure
  const isMultiItem = isCartMode && cartItems && cartItems.length > 0;

  // Extract data from pricingData
  let accommodationCost = 0;
  let voucherDiscount = 0;
  let taxRate = 0;

  if (isMultiItem && pricingData.totals) {
    // Multi-item pricing structure
    accommodationCost = pricingData.totals.totalAccommodation || 0;
    voucherDiscount = pricingData.totals.voucherDiscount || 0;
    taxRate = pricingData.totals.taxRate || 0;
  } else {
    // Single-item pricing structure
    accommodationCost = pricingData.totals?.accommodationCost || 0;
    voucherDiscount = pricingData.totals?.voucherDiscount || 0;
    taxRate = pricingData.taxInfo?.rate || 0;
  }

  // Calculate totals differently for cart mode vs single-item mode
  let subtotal = 0;
  let subtotalAfterVoucher = 0;
  let grandTotal = 0;

  if (isMultiItem) {
    // Cart mode: Sum all cart items (vouchers already applied per item)
    subtotal = cartItems!.reduce((sum, item) => {
      const itemTotal = Number(item.pricingBreakdown?.subtotal || item.totalPrice || item.basePrice) || 0;
      return sum + itemTotal;
    }, 0);
    grandTotal = subtotal; // No additional discount
    subtotalAfterVoucher = grandTotal; // Same as grand total
  } else {
    // Single-item mode: Use pricing data
    subtotal = accommodationCost + menuProductsTotal;
    subtotalAfterVoucher = subtotal - voucherDiscount;
    grandTotal = subtotalAfterVoucher;
  }

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
          {/* Multi-item cart mode */}
          {isMultiItem ? (
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-900 mb-3">
                Chi tiết giá ({cartItems!.length} lều)
              </div>

              {/* Per-item breakdown */}
              {cartItems!.map((item, index) => {
                const isExpanded = expandedItems.has(index);
                const accommodationCost = Number(item.pricingBreakdown?.accommodationCost) || 0;
                const menuCost = Number(item.pricingBreakdown?.menuProductsCost) || 0;
                const accommodationDiscount = Number(item.accommodationVoucher?.discountAmount) || 0;
                const menuDiscount = Number(item.pricingBreakdown?.menuDiscount) || 0;
                const itemSubtotal = Number(item.pricingBreakdown?.subtotal || item.totalPrice || item.basePrice) || 0;

                return (
                  <div key={index} className="border-l-4 border-blue-500 bg-white rounded-lg shadow-sm">
                    <div className="p-4">
                      {/* Item header - clickable */}
                      <button
                        type="button"
                        onClick={() => toggleItemExpansion(index)}
                        className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">
                              {item.itemName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.checkIn} → {item.checkOut} ({item.nights} đêm)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-blue-600">
                            {formatCurrency(itemSubtotal)}
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pl-8 space-y-2 border-t pt-3">
                          {/* Accommodation */}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tiền lưu trú</span>
                            <span className="font-medium">
                              {formatCurrency(accommodationCost)}
                            </span>
                          </div>

                          {/* Parameters breakdown */}
                          {item.parameters && item.parameters.length > 0 && (
                            <div className="pl-4 space-y-1">
                              {item.parameters.map(param => (
                                <div key={param.id} className="flex justify-between text-xs text-gray-500">
                                  <span>
                                    <span
                                      className="inline-block w-3 h-3 rounded-full mr-1"
                                      style={{ backgroundColor: param.color_code || '#ccc' }}
                                    />
                                    {getLocalizedString(param.name, locale)} × {param.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Accommodation Voucher */}
                          {item.accommodationVoucher && (
                            <div className="flex justify-between text-sm text-green-600 font-medium">
                              <span>- Voucher lều ({item.accommodationVoucher.code})</span>
                              <span>-{formatCurrency(accommodationDiscount)}</span>
                            </div>
                          )}

                          {/* Menu Products with per-item vouchers */}
                          {item.menuProducts && Object.keys(item.menuProducts).length > 0 && (
                            <>
                              <div className="flex justify-between text-sm pt-2 border-t">
                                <span className="text-gray-600">Món ăn / Đồ uống</span>
                                <span className="font-medium">
                                  {formatCurrency(menuCost - menuDiscount)}
                                </span>
                              </div>
                              <div className="pl-4 space-y-2">
                                {/* Check if per-night or flat structure */}
                                {isPerNightMenuProducts(item.menuProducts) ? (
                                  // Per-night structure: { 0: {...}, 1: {...} }
                                  Object.entries(item.menuProducts).map(([nightIndex, nightSelections]) => {
                                    if (!nightSelections) return null;
                                    return Object.entries(nightSelections).map(([productId, selection]) => {
                                      if (!selection) return null;
                                      const itemTotal = selection.price * selection.quantity;
                                      const discount = selection.voucher?.discountAmount || 0;
                                      const finalPrice = itemTotal - discount;

                                      return (
                                        <div key={`${nightIndex}-${productId}`} className="space-y-1">
                                          <div className="flex justify-between text-xs text-gray-500">
                                            <span>{selection.name} × {selection.quantity}</span>
                                            <span>{formatCurrency(finalPrice)}</span>
                                          </div>
                                          {selection.voucher && (
                                            <div className="flex justify-between text-xs text-green-600 pl-3">
                                              <span>🎫 {selection.voucher.code}</span>
                                              <span>-{formatCurrency(discount)}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    });
                                  })
                                ) : (
                                  // Flat structure (old format): { productId: {...} }
                                  Object.entries(item.menuProducts).map(([productId, selection]) => {
                                    if (!selection || typeof selection !== 'object' || !selection.price) return null;
                                    const itemTotal = selection.price * selection.quantity;
                                    const discount = selection.voucher?.discountAmount || 0;
                                    const finalPrice = itemTotal - discount;

                                    return (
                                      <div key={productId} className="space-y-1">
                                        <div className="flex justify-between text-xs text-gray-500">
                                          <span>{selection.name} × {selection.quantity}</span>
                                          <span>{formatCurrency(finalPrice)}</span>
                                        </div>
                                        {selection.voucher && (
                                          <div className="flex justify-between text-xs text-green-600 pl-3">
                                            <span>🎫 {selection.voucher.code}</span>
                                            <span>-{formatCurrency(discount)}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </>
                          )}

                          {/* Item Subtotal */}
                          <div className="flex justify-between font-semibold border-t pt-2 text-blue-600">
                            <span>Tổng lều này</span>
                            <span>{formatCurrency(itemSubtotal)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single-item mode */
            <>
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
                            {getLocalizedString(param.name, locale)} x {param.quantity}
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
            </>
          )}

          {/* Menu Products Breakdown */}
          {selectedMenuProducts.length > 0 && (
            <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{labels.menuProductsCost}</span>
                <span className="font-medium">{formatCurrency(menuProductsTotal)}</span>
              </div>
              <div className="space-y-2 pl-4">
                {selectedMenuProducts.map((product) => (
                  <div key={product.id} className="space-y-1">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>
                        {product.name} x {product.quantity}
                      </span>
                      <span>{formatCurrency(product.finalTotal)}</span>
                    </div>
                    {product.voucher && (
                      <div className="flex justify-between items-center text-xs text-green-600 pl-3">
                        <span>🎫 {product.voucher.code}</span>
                        <span>-{formatCurrency(product.voucher.discountAmount)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Voucher Input Section - Only show in single-item mode */}
        {!isMultiItem && (
          <>
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
          </>
        )}

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
