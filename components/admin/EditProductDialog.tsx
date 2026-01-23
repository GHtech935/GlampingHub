'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { type Locale } from '@/lib/i18n-utils';

interface EditProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  product: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    originalUnitPrice: number;
    totalPrice: number;
    discount: {
      amount: number;
    } | null;
  };
  locale?: Locale;
  isLoading?: boolean;
}

export function EditProductDialog({
  isOpen,
  onClose,
  onConfirm,
  product,
  locale = 'vi',
  isLoading = false,
}: EditProductDialogProps) {
  const [quantity, setQuantity] = useState(product.quantity);

  const texts = {
    vi: {
      title: 'Sửa số lượng',
      productName: 'Sản phẩm',
      currentQuantity: 'Số lượng hiện tại',
      newQuantity: 'Số lượng mới',
      unitPrice: 'Đơn giá',
      oldTotal: 'Thành tiền cũ',
      newTotal: 'Thành tiền mới',
      difference: 'Chênh lệch',
      cancel: 'Huỷ',
      save: 'Lưu',
      saving: 'Đang lưu...',
    },
    en: {
      title: 'Edit Quantity',
      productName: 'Product',
      currentQuantity: 'Current Quantity',
      newQuantity: 'New Quantity',
      unitPrice: 'Unit Price',
      oldTotal: 'Old Total',
      newTotal: 'New Total',
      difference: 'Difference',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
    },
  };

  const t = texts[locale];

  // Reset quantity when product changes
  useEffect(() => {
    setQuantity(product.quantity);
  }, [product.quantity, isOpen]);

  const oldTotal = product.unitPrice * product.quantity;
  const newTotal = product.unitPrice * quantity;
  const difference = newTotal - oldTotal;

  const handleConfirm = () => {
    if (quantity < 1 || quantity === product.quantity) return;
    onConfirm(quantity);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Name */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-sm">{t.productName}</Label>
            <p className="font-medium">{product.productName}</p>
          </div>

          {/* Current Quantity */}
          <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
            <span className="text-gray-600">{t.currentQuantity}:</span>
            <span className="font-medium">{product.quantity}</span>
          </div>

          {/* New Quantity Input */}
          <div className="space-y-2">
            <Label>{t.newQuantity}</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-center text-lg font-medium"
            />
          </div>

          {/* Price Comparison */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.unitPrice}:</span>
              <span>{formatCurrency(product.unitPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.oldTotal}:</span>
              <span>{formatCurrency(oldTotal)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>{t.newTotal}:</span>
              <span className="text-lg">{formatCurrency(newTotal)}</span>
            </div>
            {quantity !== product.quantity && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">{t.difference}:</span>
                <span className={difference >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={quantity < 1 || quantity === product.quantity || isLoading}
          >
            {isLoading ? t.saving : t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
