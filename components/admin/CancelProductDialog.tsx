'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { type Locale } from '@/lib/i18n-utils';

interface CancelProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  product: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
  paymentStatus?: string;
  locale?: Locale;
  isLoading?: boolean;
}

export function CancelProductDialog({
  isOpen,
  onClose,
  onConfirm,
  product,
  paymentStatus = 'pending',
  locale = 'vi',
  isLoading = false,
}: CancelProductDialogProps) {
  const [reason, setReason] = useState('');

  // Check if this will be a hard delete (pending) or soft delete (paid)
  const isHardDelete = paymentStatus === 'pending';

  const texts = {
    vi: {
      title: isHardDelete ? 'Xoá sản phẩm' : 'Huỷ sản phẩm',
      productName: 'Sản phẩm',
      quantity: 'Số lượng',
      amount: 'Thành tiền',
      reasonLabel: 'Lý do',
      reasonPlaceholder: isHardDelete ? 'Nhập lý do xoá sản phẩm...' : 'Nhập lý do huỷ sản phẩm...',
      reasonRequired: 'Vui lòng nhập lý do',
      warningHardDelete: 'Sản phẩm sẽ được XOÁ HOÀN TOÀN khỏi đơn đặt (do chưa thanh toán). Thông tin vẫn được ghi vào lịch sử booking.',
      warningSoftDelete: 'Sản phẩm sẽ được đánh dấu là ĐÃ HUỶ và hiển thị gạch ngang (do đã thanh toán). Thông tin được ghi vào lịch sử.',
      cancel: 'Đóng',
      confirm: isHardDelete ? 'Xác nhận xoá' : 'Xác nhận huỷ',
      confirming: 'Đang xử lý...',
    },
    en: {
      title: isHardDelete ? 'Remove Product' : 'Cancel Product',
      productName: 'Product',
      quantity: 'Quantity',
      amount: 'Amount',
      reasonLabel: 'Reason',
      reasonPlaceholder: isHardDelete ? 'Enter reason for removal...' : 'Enter cancellation reason...',
      reasonRequired: 'Please enter a reason',
      warningHardDelete: 'Product will be COMPLETELY REMOVED from the booking (unpaid). Change will be logged to booking history.',
      warningSoftDelete: 'Product will be marked as CANCELLED and shown with strikethrough (paid). Change will be logged to history.',
      cancel: 'Close',
      confirm: isHardDelete ? 'Confirm Remove' : 'Confirm Cancel',
      confirming: 'Processing...',
    },
  };

  const t = texts[locale];
  const warningText = isHardDelete ? t.warningHardDelete : t.warningSoftDelete;

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{t.productName}:</span>
              <span className="font-medium">{product.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.quantity}:</span>
              <span>{product.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.amount}:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(product.unitPrice * product.quantity)}
              </span>
            </div>
          </div>

          {/* Reason Textarea */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              {t.reasonLabel} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder}
              rows={3}
              className="resize-none"
            />
            {reason.trim() === '' && (
              <p className="text-xs text-muted-foreground">{t.reasonRequired}</p>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">{warningText}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? t.confirming : t.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
