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

interface AdditionalCostData {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
  notes?: string | null;
}

interface GlampingEditAdditionalCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  cost: AdditionalCostData;
  bookingId: string;
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Chỉnh sửa chi phí phát sinh',
    description: 'Cập nhật thông tin chi phí phát sinh.',
    name: 'Tên hạng mục',
    namePlaceholder: 'VD: Phí hư hỏng đồ vật, Dịch vụ giặt ủi...',
    quantity: 'Số lượng',
    unitPrice: 'Đơn giá',
    total: 'Thành tiền',
    notes: 'Ghi chú',
    notesPlaceholder: 'Mô tả chi tiết (tuỳ chọn)...',
    cancel: 'Huỷ',
    save: 'Lưu',
    saving: 'Đang lưu...',
    nameRequired: 'Vui lòng nhập tên hạng mục',
    priceRequired: 'Vui lòng nhập đơn giá',
    success: 'Đã cập nhật chi phí phát sinh',
    error: 'Không thể cập nhật chi phí phát sinh',
  },
  en: {
    title: 'Edit Additional Cost',
    description: 'Update additional cost information.',
    name: 'Item Name',
    namePlaceholder: 'E.g., Damage fee, Laundry service...',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    notes: 'Notes',
    notesPlaceholder: 'Detailed description (optional)...',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    nameRequired: 'Please enter item name',
    priceRequired: 'Please enter unit price',
    success: 'Additional cost updated',
    error: 'Failed to update additional cost',
  },
};

export function GlampingEditAdditionalCostModal({
  isOpen,
  onClose,
  onSave,
  cost,
  bookingId,
  locale = 'vi',
}: GlampingEditAdditionalCostModalProps) {
  const t = texts[locale];

  const [name, setName] = useState(cost.name);
  const [quantity, setQuantity] = useState(cost.quantity);
  const [unitPrice, setUnitPrice] = useState<number>(cost.unitPrice);
  const [notes, setNotes] = useState(cost.notes || '');
  const [saving, setSaving] = useState(false);

  const totalPrice = quantity * unitPrice;

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error(t.nameRequired);
      return;
    }

    if (unitPrice < 0) {
      toast.error(t.priceRequired);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/additional-costs/${cost.id}`, {
        method: 'PUT',
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
        throw new Error(data.error || 'Failed to update additional cost');
      }

      toast.success(t.success);
      onSave();
    } catch (error) {
      console.error('Error updating additional cost:', error);
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
            <Label htmlFor="edit-cost-name">{t.name} *</Label>
            <Input
              id="edit-cost-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              disabled={saving}
            />
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cost-quantity">{t.quantity}</Label>
              <Input
                id="edit-cost-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cost-unit-price">{t.unitPrice} *</Label>
              <CurrencyInput
                id="edit-cost-unit-price"
                value={unitPrice}
                onValueChange={(val) => setUnitPrice(val ?? 0)}
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
            <Label htmlFor="edit-cost-notes">{t.notes}</Label>
            <Textarea
              id="edit-cost-notes"
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
