'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import type { Locale } from '@/lib/i18n-utils';

interface AddAdditionalCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  bookingId: string;
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Thêm chi phí phát sinh',
    description: 'Thêm các chi phí như hư hỏng, dịch vụ bổ sung, hoặc phí phát sinh khác.',
    name: 'Tên hạng mục',
    namePlaceholder: 'VD: Phí hư hỏng đồ vật, Dịch vụ giặt ủi...',
    quantity: 'Số lượng',
    unitPrice: 'Đơn giá',
    total: 'Thành tiền',
    notes: 'Ghi chú',
    notesPlaceholder: 'Mô tả chi tiết (tuỳ chọn)...',
    cancel: 'Huỷ',
    save: 'Thêm',
    saving: 'Đang lưu...',
    nameRequired: 'Vui lòng nhập tên hạng mục',
    priceRequired: 'Vui lòng nhập đơn giá',
    success: 'Đã thêm chi phí phát sinh',
    error: 'Không thể thêm chi phí phát sinh',
  },
  en: {
    title: 'Add Additional Cost',
    description: 'Add charges for damages, extra services, or other incidental costs.',
    name: 'Item Name',
    namePlaceholder: 'E.g., Damage fee, Laundry service...',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    notes: 'Notes',
    notesPlaceholder: 'Detailed description (optional)...',
    cancel: 'Cancel',
    save: 'Add',
    saving: 'Saving...',
    nameRequired: 'Please enter item name',
    priceRequired: 'Please enter unit price',
    success: 'Additional cost added',
    error: 'Failed to add additional cost',
  },
};

export function AddAdditionalCostModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  locale = 'vi',
}: AddAdditionalCostModalProps) {
  const t = texts[locale];

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const totalPrice = unitPrice !== undefined ? quantity * unitPrice : 0;

  const handleClose = () => {
    if (!saving) {
      setName('');
      setQuantity(1);
      setUnitPrice(undefined);
      setNotes('');
      onClose();
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error(t.nameRequired);
      return;
    }

    if (unitPrice === undefined || unitPrice < 0) {
      toast.error(t.priceRequired);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/additional-costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          quantity,
          unitPrice,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add additional cost');
      }

      toast.success(t.success);
      setName('');
      setQuantity(1);
      setUnitPrice(undefined);
      setNotes('');
      onSave();
    } catch (error) {
      console.error('Error adding additional cost:', error);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cost-name">{t.name} *</Label>
            <Input
              id="cost-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              disabled={saving}
            />
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-quantity">{t.quantity}</Label>
              <Input
                id="cost-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-unit-price">{t.unitPrice} *</Label>
              <CurrencyInput
                id="cost-unit-price"
                value={unitPrice}
                onValueChange={(val) => setUnitPrice(val)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-700">{t.total}</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="cost-notes">{t.notes}</Label>
            <Textarea
              id="cost-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
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
