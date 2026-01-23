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
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { type Locale } from '@/lib/i18n-utils';

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  notes?: string;
}

interface EditPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { amount: number; paymentMethod: string; notes: string }) => void;
  payment: Payment;
  maxAllowedAmount: number; // payment.amount + remainingBalance
  locale?: Locale;
  isLoading?: boolean;
}

export function EditPaymentDialog({
  isOpen,
  onClose,
  onConfirm,
  payment,
  maxAllowedAmount,
  locale = 'vi',
  isLoading = false,
}: EditPaymentDialogProps) {
  const [amount, setAmount] = useState<number | undefined>(payment.amount);
  const [paymentMethod, setPaymentMethod] = useState<string>(payment.paymentMethod);
  const [notes, setNotes] = useState(payment.notes || '');

  const texts = {
    vi: {
      title: 'Sửa thanh toán',
      currentAmount: 'Số tiền hiện tại',
      newAmount: 'Số tiền mới',
      paymentMethod: 'Phương thức',
      cash: 'Tiền mặt',
      bankTransfer: 'Chuyển khoản',
      notes: 'Ghi chú',
      notesPlaceholder: 'Nhập ghi chú (không bắt buộc)...',
      difference: 'Chênh lệch',
      cancel: 'Huỷ',
      save: 'Lưu',
      saving: 'Đang lưu...',
      invalidAmount: 'Số tiền phải lớn hơn 0',
      exceedsMax: 'Số tiền này sẽ vượt quá tổng bill của booking',
      maxAllowed: 'Tối đa cho phép',
      remainingBalance: 'Số tiền còn lại',
    },
    en: {
      title: 'Edit Payment',
      currentAmount: 'Current Amount',
      newAmount: 'New Amount',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      bankTransfer: 'Bank Transfer',
      notes: 'Notes',
      notesPlaceholder: 'Enter notes (optional)...',
      difference: 'Difference',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      invalidAmount: 'Amount must be greater than 0',
      exceedsMax: 'This amount will exceed the booking total',
      maxAllowed: 'Maximum allowed',
      remainingBalance: 'Remaining balance',
    },
  };

  const t = texts[locale];

  // Reset form when payment changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      setAmount(payment.amount);
      setPaymentMethod(payment.paymentMethod);
      setNotes(payment.notes || '');
    }
  }, [isOpen, payment]);

  const numericAmount = amount || 0;
  const isValidAmount = numericAmount > 0;
  const exceedsMax = maxAllowedAmount > 0 && numericAmount > maxAllowedAmount;
  const difference = numericAmount - payment.amount;
  const hasChanges = numericAmount !== payment.amount || paymentMethod !== payment.paymentMethod || notes !== (payment.notes || '');
  const canSubmit = isValidAmount && hasChanges && !exceedsMax;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm({
      amount: numericAmount,
      paymentMethod,
      notes: notes.trim(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Remaining Balance Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-blue-700">{t.remainingBalance}:</span>
              <span className="font-bold text-blue-900">
                {formatCurrency(Math.max(0, maxAllowedAmount - payment.amount))}
              </span>
            </div>
          </div>

          {/* Current Amount */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t.currentAmount}:</span>
              <span className="font-medium">{formatCurrency(payment.amount)}</span>
            </div>
          </div>

          {/* New Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-payment-amount">{t.newAmount} <span className="text-destructive">*</span></Label>
            <CurrencyInput
              id="edit-payment-amount"
              value={amount}
              onValueChange={setAmount}
              className={`text-right text-lg font-medium ${exceedsMax ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {amount !== undefined && !isValidAmount && (
              <p className="text-xs text-destructive">{t.invalidAmount}</p>
            )}
            {amount !== undefined && isValidAmount && exceedsMax && (
              <p className="text-xs text-destructive">{t.exceedsMax}</p>
            )}
          </div>

          {/* Payment Method Select */}
          <div className="space-y-2">
            <Label>{t.paymentMethod}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t.cash}</SelectItem>
                <SelectItem value="bank_transfer">{t.bankTransfer}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes Textarea */}
          <div className="space-y-2">
            <Label htmlFor="edit-payment-notes">{t.notes}</Label>
            <Textarea
              id="edit-payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Difference */}
          {difference !== 0 && isValidAmount && (
            <div className={`p-4 rounded-lg ${exceedsMax ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t.difference}:</span>
                <span className={`font-medium ${exceedsMax ? 'text-red-600' : difference >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? t.saving : t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
