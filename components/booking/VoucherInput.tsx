"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ticket, X, CheckCircle2, AlertCircle } from "lucide-react";

interface VoucherInputProps {
  // Booking details for validation
  campsiteId?: string;
  pitchTypeId?: string;
  checkIn?: string;
  checkOut?: string;
  productIds?: string[];
  totalAmount: number;
  customerId?: string;
  locale?: string;

  // Glamping-specific props
  zoneId?: string;
  itemId?: string;
  validationEndpoint?: string; // Optional custom endpoint (default: /api/booking/validate-voucher)
  applicationType?: 'accommodation' | 'menu_only' | 'common_item' | 'all'; // Filter vouchers by type
  appliedVoucher?: AppliedVoucher | null; // Controlled component support
  disabled?: boolean; // Disable input during loading or when invalid state

  // Callbacks
  onVoucherApplied: (voucherData: AppliedVoucher) => void;
  onVoucherRemoved: () => void;
}

export interface AppliedVoucher {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  isStackable: boolean;
}

export default function VoucherInput({
  campsiteId,
  pitchTypeId,
  checkIn,
  checkOut,
  productIds = [],
  totalAmount,
  customerId,
  locale = 'vi',
  zoneId,
  itemId,
  validationEndpoint = "/api/booking/validate-voucher",
  applicationType = 'all',
  appliedVoucher: controlledAppliedVoucher,
  disabled = false,
  onVoucherApplied,
  onVoucherRemoved,
}: VoucherInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [internalAppliedVoucher, setInternalAppliedVoucher] = useState<AppliedVoucher | null>(null);

  // Use controlled or internal state
  const appliedVoucher = controlledAppliedVoucher !== undefined ? controlledAppliedVoucher : internalAppliedVoucher;
  const setAppliedVoucher = controlledAppliedVoucher !== undefined ?
    (voucher: AppliedVoucher | null) => { if (voucher) onVoucherApplied(voucher); else onVoucherRemoved(); } :
    setInternalAppliedVoucher;

  // Sync internal state when appliedVoucher changes
  useEffect(() => {
    if (appliedVoucher) {
      setCode("");
      setError("");
    }
  }, [appliedVoucher]);

  // i18n labels
  const getTitleByType = () => {
    if (applicationType === 'menu_only') {
      return locale === 'vi' ? 'Mã giảm giá' : 'Discount code';
    } else if (applicationType === 'accommodation') {
      return locale === 'vi' ? 'Mã giảm giá cho Lều' : 'Discount code for Tent';
    } else if (applicationType === 'common_item') {
      return locale === 'vi' ? 'Mã giảm giá' : 'Discount code';
    }
    return locale === 'vi' ? 'Mã giảm giá' : 'Discount code';
  };

  const labels = {
    title: getTitleByType(),
    placeholder: locale === 'vi' ? 'Nhập mã voucher' : 'Enter voucher code',
    apply: locale === 'vi' ? 'Áp dụng' : 'Apply',
    checking: locale === 'vi' ? 'Đang kiểm tra...' : 'Checking...',
    discount: locale === 'vi' ? 'Giảm giá' : 'Discount',
    pleaseEnterCode: locale === 'vi' ? 'Vui lòng nhập mã voucher' : 'Please enter a voucher code',
    cannotApply: locale === 'vi' ? 'Không thể áp dụng voucher' : 'Cannot apply voucher',
    errorValidating: locale === 'vi' ? 'Đã xảy ra lỗi khi xác thực voucher' : 'Error validating voucher',
  };

  const handleApplyVoucher = async () => {
    if (!code.trim()) {
      setError(labels.pleaseEnterCode);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(validationEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim(),
          // Camping-specific params
          campsiteId,
          pitchTypeId,
          productIds,
          // Glamping-specific params
          zoneId,
          itemId,
          applicationType,
          // Common params
          checkIn,
          checkOut,
          totalAmount,
          customerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || labels.cannotApply);
        return;
      }

      if (data.valid) {
        const voucherData: AppliedVoucher = {
          id: data.voucher.id,
          code: data.voucher.code,
          name: data.voucher.name,
          description: data.voucher.description,
          discountType: data.voucher.discountType,
          discountValue: data.voucher.discountValue,
          discountAmount: data.discountAmount,
          isStackable: data.voucher.isStackable,
        };

        setAppliedVoucher(voucherData);
        onVoucherApplied(voucherData);
        setCode("");
      }
    } catch (error) {
      console.error("Error validating voucher:", error);
      setError(labels.errorValidating);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setError("");
    onVoucherRemoved();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApplyVoucher();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-gray-900">{labels.title}</h3>
      </div>

      {/* Applied Voucher Display */}
      {appliedVoucher ? (
        <>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              {/* Left side: Icon + Info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                      {labels.discount}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono font-bold text-base px-3 py-1 bg-white border-green-600 text-green-700 shadow-sm"
                    >
                      {appliedVoucher.code}
                    </Badge>
                  </div>
                  <p className="text-sm text-green-700 font-medium">
                    {appliedVoucher.discountType === 'percentage'
                      ? `Giảm ${appliedVoucher.discountValue}%`
                      : `Giảm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(appliedVoucher.discountValue)}`
                    }
                  </p>
                  {appliedVoucher.name && (
                    <p className="text-xs text-green-600 truncate">
                      {appliedVoucher.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Right side: Remove button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemoveVoucher}
                className="flex-shrink-0 hover:bg-red-100 hover:text-red-600 transition-colors"
                title="Xóa voucher"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Voucher Input */}
          <div className="flex gap-2">
            <Input
              placeholder={labels.placeholder}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={handleKeyDown}
              disabled={loading || disabled}
              className="flex-1"
            />
            <Button
              onClick={handleApplyVoucher}
              disabled={loading || !code.trim() || disabled}
              className="flex-shrink-0"
            >
              {loading ? labels.checking : labels.apply}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
