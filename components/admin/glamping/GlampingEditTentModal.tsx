"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { CheckCircle2, X, Loader2 } from "lucide-react";
import type { Locale } from "@/lib/i18n-utils";
import type { TentEditData } from "./types";

interface GlampingEditTentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  tent: TentEditData;
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Chỉnh sửa lều',
    checkIn: 'Ngày check-in',
    checkOut: 'Ngày check-out',
    parameters: 'Thông số giá',
    paramName: 'Loại',
    paramQty: 'SL',
    paramPrice: 'Đơn giá',
    subtotal: 'Tạm tính',
    subtotalOverride: 'Ghi đè tạm tính',
    subtotalOverrideHint: 'Để trống để tự tính',
    voucher: 'Mã voucher',
    voucherApply: 'Áp dụng',
    voucherRemove: 'Xoá voucher',
    voucherPlaceholder: 'Nhập mã voucher',
    voucherApplied: 'Đã áp dụng',
    save: 'Lưu thay đổi',
    cancel: 'Huỷ',
    saving: 'Đang lưu...',
    saveSuccess: 'Đã cập nhật lều',
    saveFailed: 'Không thể cập nhật',
    nights: 'đêm',
    calculatedTotal: 'Tổng tính',
    discount: 'Giảm giá',
    pricingError: 'Không thể tải giá. Vui lòng thử lại.',
  },
  en: {
    title: 'Edit Tent',
    checkIn: 'Check-in Date',
    checkOut: 'Check-out Date',
    parameters: 'Pricing Parameters',
    paramName: 'Type',
    paramQty: 'Qty',
    paramPrice: 'Unit Price',
    subtotal: 'Subtotal',
    subtotalOverride: 'Subtotal Override',
    subtotalOverrideHint: 'Leave empty for auto-calc',
    voucher: 'Voucher Code',
    voucherApply: 'Apply',
    voucherRemove: 'Remove',
    voucherPlaceholder: 'Enter voucher code',
    voucherApplied: 'Applied',
    save: 'Save Changes',
    cancel: 'Cancel',
    saving: 'Saving...',
    saveSuccess: 'Tent updated',
    saveFailed: 'Failed to update',
    nights: 'nights',
    calculatedTotal: 'Calculated Total',
    discount: 'Discount',
    pricingError: 'Failed to load pricing. Please try again.',
  },
};

/** Normalize any date string/ISO timestamp to YYYY-MM-DD for <input type="date"> */
function toDateInputValue(dateStr: string): string {
  if (!dateStr) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // ISO or other format — extract the date part
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function GlampingEditTentModal({
  isOpen,
  onClose,
  onSave,
  tent,
  locale = 'vi',
}: GlampingEditTentModalProps) {
  const t = texts[locale];

  const [checkInDate, setCheckInDate] = useState(() => toDateInputValue(tent.checkInDate));
  const [checkOutDate, setCheckOutDate] = useState(() => toDateInputValue(tent.checkOutDate));
  const [parameters, setParameters] = useState(
    tent.parameters.map(p => ({ ...p }))
  );
  const [subtotalOverride, setSubtotalOverride] = useState<number | undefined>(undefined);
  const [showSubtotalOverride, setShowSubtotalOverride] = useState(false);
  const [voucherCode, setVoucherCode] = useState<string | null>(tent.voucherCode || null);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [voucherRemoved, setVoucherRemoved] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(tent.discountAmount || 0);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pricing state fetched from API
  const [parameterPricing, setParameterPricing] = useState<Record<string, number>>(() => {
    // Initialize from existing data: unitPrice * nights = total per unit for all nights
    const initial: Record<string, number> = {};
    const nights = Math.max(1, Math.round(
      (new Date(tent.checkOutDate).getTime() - new Date(tent.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    ));
    tent.parameters.forEach(p => {
      initial[p.parameterId] = p.unitPrice * nights;
    });
    return initial;
  });
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate nights
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate subtotal from API-fetched parameterPricing
  // parameterPricing[paramId] = total price per unit for ALL nights
  const calculatedSubtotal = parameters.reduce(
    (sum, p) => sum + p.quantity * (parameterPricing[p.parameterId] || 0),
    0
  );

  const effectiveSubtotal = subtotalOverride !== undefined ? subtotalOverride : calculatedSubtotal;

  // Fetch pricing from API
  const fetchPricing = useCallback(async () => {
    if (!checkInDate || !checkOutDate || !tent.itemId) return;

    const checkInD = new Date(checkInDate);
    const checkOutD = new Date(checkOutDate);
    if (checkOutD <= checkInD) return;

    setLoadingPricing(true);
    setPricingError(null);

    try {
      const params = new URLSearchParams({
        itemId: tent.itemId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
      });

      parameters.forEach(p => {
        params.set(`param_${p.parameterId}`, String(p.quantity));
      });

      const res = await fetch(`/api/glamping/booking/calculate-pricing?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch pricing');
      }

      const data = await res.json();
      if (data.parameterPricing) {
        setParameterPricing(data.parameterPricing);
      }
    } catch (error) {
      console.error('Fetch pricing failed:', error);
      setPricingError(t.pricingError);
    } finally {
      setLoadingPricing(false);
    }
  }, [checkInDate, checkOutDate, tent.itemId, parameters, t.pricingError]);

  // Debounced fetch when dates or quantities change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPricing();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchPricing]);

  const updateParameterQuantity = (index: number, value: number) => {
    setParameters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: value };
      return updated;
    });
  };

  const handleRemoveVoucher = () => {
    setVoucherCode(null);
    setVoucherRemoved(true);
    setDiscountAmount(0);
  };

  const handleApplyVoucher = async () => {
    const code = newVoucherCode.trim();
    if (!code) return;

    setValidatingVoucher(true);
    try {
      const res = await fetch('/api/glamping/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          totalAmount: calculatedSubtotal,
          itemId: tent.itemId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          applicationType: 'accommodation',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || (locale === 'vi' ? 'Mã voucher không hợp lệ' : 'Invalid voucher code'));
        return;
      }

      setVoucherCode(code);
      setNewVoucherCode('');
      setVoucherRemoved(false);
      setDiscountAmount(data.discountAmount || 0);
    } catch (error) {
      toast.error(locale === 'vi' ? 'Không thể xác thực voucher' : 'Failed to validate voucher');
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const body: any = {
        checkInDate,
        checkOutDate,
        parameters: parameters.map(p => ({
          parameterId: p.parameterId,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
        })),
      };

      if (subtotalOverride !== undefined) {
        body.subtotalOverride = subtotalOverride;
      }

      // Handle voucher changes
      const originalVoucher = tent.voucherCode || null;
      if (voucherCode !== originalVoucher) {
        body.voucherCode = voucherCode;
        body.discountAmount = discountAmount;
      }

      const res = await fetch(
        `/api/admin/glamping/bookings/${tent.bookingId}/tents/${tent.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      toast.success(t.saveSuccess);
      onSave();
    } catch (error: any) {
      console.error('Save tent failed:', error);
      toast.error(error.message || t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  // Determine if a voucher is currently applied (original voucher exists and not removed)
  const hasAppliedVoucher = voucherCode !== null && voucherCode !== '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t.title}: {tent.itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t.checkIn}</Label>
              <Input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t.checkOut}</Label>
              <Input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {nights} {t.nights}
          </div>

          {/* Parameters */}
          {parameters.length > 0 && (
            <div>
              <Label className="mb-2 block">{t.parameters}</Label>
              {pricingError && (
                <p className="text-xs text-red-600 mb-2">{pricingError}</p>
              )}
              <div className="space-y-2">
                {parameters.map((param, idx) => {
                  const pricePerUnit = parameterPricing[param.parameterId] || 0;
                  const rowTotal = param.quantity * pricePerUnit;
                  return (
                    <div key={param.parameterId} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
                        {param.parameterName}
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={param.quantity}
                          onChange={(e) => updateParameterQuantity(idx, parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-sm text-center"
                        />
                        <span className="text-xs text-gray-400">×</span>
                        <span className="text-sm text-gray-700 w-28 text-right tabular-nums">
                          {loadingPricing ? '...' : formatCurrency(pricePerUnit)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 w-24 text-right">
                        = {loadingPricing ? '...' : formatCurrency(rowTotal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calculated total */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.calculatedTotal}</span>
              <span className="font-medium flex items-center gap-2">
                {loadingPricing && (
                  <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                )}
                {formatCurrency(calculatedSubtotal)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">{t.discount}</span>
                <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
          </div>

          {/* Subtotal override */}
          {showSubtotalOverride ? (
            <div>
              <div className="flex items-center justify-between">
                <Label>{t.subtotalOverride}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSubtotalOverride(false);
                    setSubtotalOverride(undefined);
                  }}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-red-600"
                >
                  <X className="h-3 w-3 mr-1" />
                  {locale === 'vi' ? 'Bỏ ghi đè' : 'Remove override'}
                </Button>
              </div>
              <CurrencyInput
                value={subtotalOverride}
                onValueChange={(val) => setSubtotalOverride(val)}
                placeholder={t.subtotalOverrideHint}
                className="mt-1"
              />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubtotalOverride(true)}
              className="w-full text-gray-500"
            >
              {t.subtotalOverride}
            </Button>
          )}

          {/* Voucher */}
          <div>
            <Label>{t.voucher}</Label>
            {hasAppliedVoucher ? (
              /* State A: Voucher applied — green badge with remove button */
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <Badge variant="outline" className="font-mono">
                    {voucherCode}
                  </Badge>
                  {discountAmount > 0 && (
                    <span className="text-sm text-green-700">
                      (-{formatCurrency(discountAmount)})
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveVoucher}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              /* State B: No voucher — input + apply button */
              <div className="flex gap-2 mt-1">
                <Input
                  value={newVoucherCode}
                  onChange={(e) => setNewVoucherCode(e.target.value)}
                  placeholder={t.voucherPlaceholder}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyVoucher();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyVoucher}
                  disabled={!newVoucherCode.trim() || validatingVoucher}
                >
                  {validatingVoucher ? <Loader2 className="h-4 w-4 animate-spin" /> : t.voucherApply}
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {t.saving}
              </>
            ) : (
              t.save
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
