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
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { type Locale } from '@/lib/i18n-utils';

interface AddPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { amount: number; paymentMethod: string; notes: string }) => void;
  remainingBalance: number;
  locale?: Locale;
  isLoading?: boolean;
}

export function AddPaymentDialog({
  isOpen,
  onClose,
  onConfirm,
  remainingBalance,
  locale = 'vi',
  isLoading = false,
}: AddPaymentDialogProps) {
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState('');

  const texts = {
    vi: {
      title: 'Thêm thanh toán',
      amount: 'Số tiền',
      amountPlaceholder: 'Nhập số tiền...',
      paymentMethod: 'Phương thức',
      cash: 'Tiền mặt',
      bankTransfer: 'Chuyển khoản',
      notes: 'Ghi chú',
      notesPlaceholder: 'Nhập ghi chú (không bắt buộc)...',
      remainingBalance: 'Số tiền còn lại',
      cancel: 'Huỷ',
      add: 'Thêm thanh toán',
      adding: 'Đang thêm...',
      invalidAmount: 'Số tiền phải lớn hơn 0',
      exceedsBalance: 'Số tiền này sẽ vượt quá tổng bill của booking',
    },
    en: {
      title: 'Add Payment',
      amount: 'Amount',
      amountPlaceholder: 'Enter amount...',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      bankTransfer: 'Bank Transfer',
      notes: 'Notes',
      notesPlaceholder: 'Enter notes (optional)...',
      remainingBalance: 'Remaining Balance',
      cancel: 'Cancel',
      add: 'Add Payment',
      adding: 'Adding...',
      invalidAmount: 'Amount must be greater than 0',
      exceedsBalance: 'This amount will exceed the booking total',
    },
  };

  const t = texts[locale];

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setAmount(undefined);
      setPaymentMethod('cash');
      setNotes('');
    }
  }, [isOpen]);

  const numericAmount = amount || 0;
  const isValidAmount = numericAmount > 0;
  const exceedsBalance = remainingBalance > 0 && numericAmount > remainingBalance;
  const canSubmit = isValidAmount && !exceedsBalance;

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
            <Plus className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Remaining Balance Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-blue-700">{t.remainingBalance}:</span>
              <span className="font-bold text-blue-900">
                {formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t.amount} <span className="text-destructive">*</span></Label>
            <CurrencyInput
              id="payment-amount"
              value={amount}
              onValueChange={setAmount}
              placeholder={t.amountPlaceholder}
              className={`text-right text-lg font-medium ${exceedsBalance ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {amount !== undefined && !isValidAmount && (
              <p className="text-xs text-destructive">{t.invalidAmount}</p>
            )}
            {amount !== undefined && isValidAmount && exceedsBalance && (
              <p className="text-xs text-destructive">{t.exceedsBalance}</p>
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
            <Label htmlFor="payment-notes">{t.notes}</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Summary */}
          {isValidAmount && (
            <div className={`p-4 rounded-lg ${exceedsBalance ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center font-medium">
                <span>{locale === 'vi' ? 'Số tiền thanh toán:' : 'Payment amount:'}</span>
                <span className={`text-lg ${exceedsBalance ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(numericAmount)}
                </span>
              </div>
              {exceedsBalance && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-red-200">
                  <span className="text-sm text-red-600">
                    {locale === 'vi' ? 'Vượt quá:' : 'Exceeds by:'}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    +{formatCurrency(numericAmount - remainingBalance)}
                  </span>
                </div>
              )}
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
            {isLoading ? t.adding : t.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
