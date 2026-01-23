"use client";

import { useState } from "react";
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
  onVoucherApplied,
  onVoucherRemoved,
}: VoucherInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);

  // i18n labels
  const labels = {
    title: locale === 'vi' ? 'Mã giảm giá' : 'Discount code',
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="font-mono">
                      {appliedVoucher.code}
                    </Badge>
                    <span className="font-semibold text-green-900">
                      {appliedVoucher.name}
                    </span>
                  </div>
                  {appliedVoucher.description && (
                    <p className="text-sm text-green-700 mt-1">
                      {appliedVoucher.description}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemoveVoucher}
                className="flex-shrink-0 ml-2"
              >
                <X className="h-4 w-4" />
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
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleApplyVoucher}
              disabled={loading || !code.trim()}
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
