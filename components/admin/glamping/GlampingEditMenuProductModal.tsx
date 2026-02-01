"use client";

import { useState, useEffect } from "react";
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
import type { ProductEditData } from "./types";

interface GlampingEditMenuProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product: ProductEditData;
  locale?: Locale;
}

/** Normalize any date string/ISO timestamp to YYYY-MM-DD for <input type="date"> */
function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const texts = {
  vi: {
    title: 'Chỉnh sửa sản phẩm',
    category: 'Danh mục',
    product: 'Sản phẩm',
    quantity: 'Số lượng',
    unitPrice: 'Đơn giá',
    totalPrice: 'Thành tiền',
    servingDate: 'Ngày phục vụ',
    subtotalOverride: 'Ghi đè thành tiền',
    subtotalOverrideHint: 'Để trống để tự tính',
    voucher: 'Mã voucher',
    voucherApply: 'Áp dụng',
    voucherRemove: 'Xoá voucher',
    voucherPlaceholder: 'Nhập mã voucher',
    save: 'Lưu thay đổi',
    cancel: 'Huỷ',
    saving: 'Đang lưu...',
    saveSuccess: 'Đã cập nhật sản phẩm',
    saveFailed: 'Không thể cập nhật',
    calculatedTotal: 'Tổng tính',
    discount: 'Giảm giá',
  },
  en: {
    title: 'Edit Menu Product',
    category: 'Category',
    product: 'Product',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    totalPrice: 'Total Price',
    servingDate: 'Serving Date',
    subtotalOverride: 'Total Override',
    subtotalOverrideHint: 'Leave empty for auto-calc',
    voucher: 'Voucher Code',
    voucherApply: 'Apply',
    voucherRemove: 'Remove',
    voucherPlaceholder: 'Enter voucher code',
    save: 'Save Changes',
    cancel: 'Cancel',
    saving: 'Saving...',
    saveSuccess: 'Product updated',
    saveFailed: 'Failed to update',
    calculatedTotal: 'Calculated Total',
    discount: 'Discount',
  },
};

export function GlampingEditMenuProductModal({
  isOpen,
  onClose,
  onSave,
  product,
  locale = 'vi',
}: GlampingEditMenuProductModalProps) {
  const t = texts[locale];

  const [quantity, setQuantity] = useState(product.quantity);
  const [unitPrice, setUnitPrice] = useState<number>(product.unitPrice);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [servingDate, setServingDate] = useState(() => toDateInputValue(product.servingDate));
  const [subtotalOverride, setSubtotalOverride] = useState<number | undefined>(undefined);
  const [showSubtotalOverride, setShowSubtotalOverride] = useState(false);
  const [voucherCode, setVoucherCode] = useState<string | null>(product.voucherCode || null);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [voucherRemoved, setVoucherRemoved] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(product.discountAmount || 0);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch the original product price from the menu item
  useEffect(() => {
    const fetchProductPrice = async () => {
      setLoadingPrice(true);
      try {
        const response = await fetch(`/api/admin/glamping/menu/${product.menuItemId}`);
        if (response.ok) {
          const data = await response.json();
          const price = parseFloat(data.menuItem?.price || data.price || '0');
          setOriginalPrice(price);
          setUnitPrice(price);
        }
      } catch (error) {
        console.error('Failed to fetch product price:', error);
        // Fallback to the existing unit price
        setOriginalPrice(product.unitPrice);
      } finally {
        setLoadingPrice(false);
      }
    };

    if (isOpen) {
      fetchProductPrice();
    }
  }, [isOpen, product.menuItemId, product.unitPrice]);

  const calculatedTotal = quantity * unitPrice;
  const effectiveTotal = subtotalOverride !== undefined ? subtotalOverride : calculatedTotal;

  const hasAppliedVoucher = voucherCode !== null && voucherCode !== '';

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
          totalAmount: calculatedTotal,
          itemId: product.menuItemId,
          applicationType: 'menu_only',
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
        quantity,
        unitPrice,
        servingDate: servingDate || null,
      };

      if (subtotalOverride !== undefined) {
        body.subtotalOverride = subtotalOverride;
      }

      // Handle voucher changes
      const originalVoucher = product.voucherCode || null;
      if (voucherCode !== originalVoucher) {
        body.voucherCode = voucherCode;
        body.discountAmount = discountAmount;
      }

      const res = await fetch(
        `/api/admin/glamping/bookings/${product.bookingId}/menu-products/${product.id}`,
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
      console.error('Save product failed:', error);
      toast.error(error.message || t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info (read-only) */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t.category}</span>
              <span className="font-medium text-gray-900">{product.categoryName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t.product}</span>
              <span className="font-medium text-gray-900">{product.productName}</span>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label>{t.quantity}</Label>
            <Input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              className="mt-1"
            />
          </div>

          {/* Unit Price - Read Only */}
          <div>
            <Label>{t.unitPrice}</Label>
            <div className="mt-1 flex items-center h-10 px-3 rounded-md border border-gray-200 bg-gray-50">
              {loadingPrice ? (
                <span className="text-gray-400 text-sm">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</span>
              ) : (
                <span className="font-medium text-gray-900">{formatCurrency(unitPrice)}</span>
              )}
              <span className="ml-auto text-xs text-gray-500">VND</span>
            </div>
          </div>

          {/* Serving Date */}
          <div>
            <Label>{t.servingDate}</Label>
            <Input
              type="date"
              value={servingDate}
              onChange={(e) => setServingDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Calculated total */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.calculatedTotal}</span>
              <span className="font-medium">{formatCurrency(calculatedTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">{t.discount}</span>
                <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
          </div>

          {/* Subtotal override — hidden by default, toggle button to show */}
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

          {/* Voucher — green badge if applied, input if not */}
          <div>
            <Label>{t.voucher}</Label>
            {hasAppliedVoucher ? (
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
