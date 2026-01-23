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

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  createdAt: string;
}

interface DeletePaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  payment: Payment;
  locale?: Locale;
  isLoading?: boolean;
}

export function DeletePaymentDialog({
  isOpen,
  onClose,
  onConfirm,
  payment,
  locale = 'vi',
  isLoading = false,
}: DeletePaymentDialogProps) {
  const [reason, setReason] = useState('');

  const texts = {
    vi: {
      title: 'Xoá thanh toán',
      amount: 'Số tiền',
      method: 'Phương thức',
      date: 'Ngày tạo',
      cash: 'Tiền mặt',
      bankTransfer: 'Chuyển khoản',
      reasonLabel: 'Lý do xoá',
      reasonPlaceholder: 'Nhập lý do xoá thanh toán...',
      reasonRequired: 'Vui lòng nhập lý do',
      warning: 'Thanh toán này sẽ bị xoá và không thể khôi phục. Thông tin sẽ được ghi vào lịch sử booking.',
      cancel: 'Đóng',
      confirm: 'Xác nhận xoá',
      confirming: 'Đang xoá...',
    },
    en: {
      title: 'Delete Payment',
      amount: 'Amount',
      method: 'Method',
      date: 'Created',
      cash: 'Cash',
      bankTransfer: 'Bank Transfer',
      reasonLabel: 'Deletion Reason',
      reasonPlaceholder: 'Enter reason for deletion...',
      reasonRequired: 'Please enter a reason',
      warning: 'This payment will be deleted and cannot be restored. Change will be logged to booking history.',
      cancel: 'Close',
      confirm: 'Confirm Delete',
      confirming: 'Deleting...',
    },
  };

  const t = texts[locale];

  const getMethodLabel = (method: string) => {
    if (method === 'cash') return t.cash;
    if (method === 'bank_transfer') return t.bankTransfer;
    return method;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
          {/* Payment Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{t.amount}:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(payment.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.method}:</span>
              <span>{getMethodLabel(payment.paymentMethod)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.date}:</span>
              <span className="text-sm">{formatDate(payment.createdAt)}</span>
            </div>
          </div>

          {/* Reason Textarea */}
          <div className="space-y-2">
            <Label htmlFor="delete-reason" className="text-sm font-medium">
              {t.reasonLabel} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
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
            <p className="text-sm text-amber-800">{t.warning}</p>
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
