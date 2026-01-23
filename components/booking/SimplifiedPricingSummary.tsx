import React from 'react';
import { AppliedVoucher } from './VoucherInput';

interface SimplifiedPricingSummaryProps {
  pricingData?: any;
  locale?: string;
  appliedVoucher?: AppliedVoucher | null;
  onVoucherApplied?: (voucher: AppliedVoucher) => void;
  onVoucherRemoved?: () => void;
  campsiteId?: string;
  checkIn?: string;
  checkOut?: string;
  productVoucherDiscounts?: number;
  subtotal?: number;
  discount?: number;
  total?: number;
  currency?: string;
}

/**
 * SimplifiedPricingSummary component
 * Displays a simple pricing breakdown
 */
export default function SimplifiedPricingSummary({
  pricingData,
  locale = 'vi',
  appliedVoucher,
  onVoucherApplied,
  onVoucherRemoved,
  campsiteId,
  checkIn,
  checkOut,
  productVoucherDiscounts = 0,
  subtotal,
  discount = 0,
  total,
  currency = 'VND'
}: SimplifiedPricingSummaryProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Extract pricing from pricingData if provided
  const displaySubtotal = subtotal ?? pricingData?.subtotal;
  const displayTotal = total ?? pricingData?.total ?? pricingData?.finalAmount;
  const displayDiscount = discount || pricingData?.discount || 0;

  return (
    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
      {displaySubtotal !== undefined && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">{formatPrice(displaySubtotal)}</span>
        </div>
      )}

      {displayDiscount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Discount:</span>
          <span className="font-medium text-green-600">-{formatPrice(displayDiscount)}</span>
        </div>
      )}

      {productVoucherDiscounts > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Product Discounts:</span>
          <span className="font-medium text-green-600">-{formatPrice(productVoucherDiscounts)}</span>
        </div>
      )}

      {appliedVoucher && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Voucher ({appliedVoucher.code}):</span>
          <span className="font-medium text-green-600">
            -{formatPrice(appliedVoucher.discountAmount || 0)}
          </span>
        </div>
      )}

      {displayTotal !== undefined && (
        <div className="flex justify-between text-base font-semibold pt-2 border-t">
          <span>Total:</span>
          <span>{formatPrice(displayTotal)}</span>
        </div>
      )}
    </div>
  );
}
