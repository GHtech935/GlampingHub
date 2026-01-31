'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import type { Locale } from '@/lib/i18n-utils';
import { Loader2, Minus, Plus, UtensilsCrossed, FileEdit, ChevronDown, ChevronUp } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  imageUrl: string | null;
  maxQuantity: number | null;
  categoryId: string | null;
  categoryName: string | null;
}

interface TentWithMenuItems {
  tentId: string;
  tentName: string;
  itemId: string;
  menuItems: MenuItem[];
}

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
    // New keys for tabs
    tabFood: 'Chọn món ăn',
    tabCustom: 'Tự nhập',
    noMenuItems: 'Không có món ăn nào được cấu hình cho các lều trong booking này',
    selectedSummary: '{count} món - {total}',
    tentSection: 'Lều: {name}',
    loadingMenu: 'Đang tải danh sách món ăn...',
    selectAtLeastOne: 'Vui lòng chọn ít nhất 1 món ăn',
    addingItems: 'Đang thêm {count} món...',
    successMultiple: 'Đã thêm {count} món ăn',
    errorMultiple: 'Không thể thêm một số món ăn',
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
    // New keys for tabs
    tabFood: 'Select food',
    tabCustom: 'Custom entry',
    noMenuItems: 'No menu items configured for tents in this booking',
    selectedSummary: '{count} items - {total}',
    tentSection: 'Tent: {name}',
    loadingMenu: 'Loading menu items...',
    selectAtLeastOne: 'Please select at least 1 item',
    addingItems: 'Adding {count} items...',
    successMultiple: '{count} items added',
    errorMultiple: 'Failed to add some items',
  },
};

type TabType = 'food' | 'custom';

export function AddAdditionalCostModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  locale = 'vi',
}: AddAdditionalCostModalProps) {
  const t = texts[locale];

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('food');

  // Food tab state
  const [tentsWithMenu, setTentsWithMenu] = useState<TentWithMenuItems[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; menuItem: MenuItem; tentName: string }>>(new Map());
  const [expandedTents, setExpandedTents] = useState<Set<string>>(new Set());

  // Custom tab state (existing)
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Shared state
  const [saving, setSaving] = useState(false);

  const totalPrice = unitPrice !== undefined ? quantity * unitPrice : 0;

  // Calculate selected items summary
  const selectedCount = Array.from(selectedItems.values()).reduce((sum, item) => sum + item.quantity, 0);
  const selectedTotal = Array.from(selectedItems.values()).reduce(
    (sum, item) => sum + item.quantity * item.menuItem.price,
    0
  );

  // Fetch menu items when modal opens
  const fetchMenuItems = useCallback(async () => {
    if (!bookingId) return;

    setLoadingMenu(true);
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/available-menu-items?locale=${locale}`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }
      const data = await response.json();
      setTentsWithMenu(data.tents || []);

      // Expand all tents by default
      const allTentIds = new Set<string>((data.tents || []).map((tent: TentWithMenuItems) => tent.tentId));
      setExpandedTents(allTentIds);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error(t.error);
    } finally {
      setLoadingMenu(false);
    }
  }, [bookingId, locale, t.error]);

  useEffect(() => {
    if (isOpen) {
      fetchMenuItems();
    }
  }, [isOpen, fetchMenuItems]);

  const handleClose = () => {
    if (!saving) {
      // Reset all state
      setActiveTab('food');
      setSelectedItems(new Map());
      setName('');
      setQuantity(1);
      setUnitPrice(undefined);
      setNotes('');
      onClose();
    }
  };

  const toggleItemSelection = (menuItem: MenuItem, tentName: string) => {
    const key = `${menuItem.id}`;
    const newSelected = new Map(selectedItems);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.set(key, { quantity: 1, menuItem, tentName });
    }

    setSelectedItems(newSelected);
  };

  const updateItemQuantity = (menuItemId: string, delta: number) => {
    const key = menuItemId;
    const current = selectedItems.get(key);
    if (!current) return;

    const newQuantity = Math.max(1, current.quantity + delta);
    const maxQty = current.menuItem.maxQuantity;
    const finalQuantity = maxQty ? Math.min(newQuantity, maxQty) : newQuantity;

    const newSelected = new Map(selectedItems);
    newSelected.set(key, { ...current, quantity: finalQuantity });
    setSelectedItems(newSelected);
  };

  const toggleTentExpanded = (tentId: string) => {
    const newExpanded = new Set(expandedTents);
    if (newExpanded.has(tentId)) {
      newExpanded.delete(tentId);
    } else {
      newExpanded.add(tentId);
    }
    setExpandedTents(newExpanded);
  };

  const handleSaveFood = async () => {
    if (selectedItems.size === 0) {
      toast.error(t.selectAtLeastOne);
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const items = Array.from(selectedItems.values());

      for (const item of items) {
        try {
          const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/additional-costs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: item.menuItem.name,
              quantity: item.quantity,
              unitPrice: item.menuItem.price,
              notes: `${item.tentName}`,
              menuItemId: item.menuItem.id,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(t.successMultiple.replace('{count}', String(successCount)));
        setSelectedItems(new Map());
        onSave();
      }

      if (errorCount > 0) {
        toast.error(t.errorMultiple);
      }
    } catch (error) {
      console.error('Error adding food items:', error);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustom = async () => {
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

  const handleSave = () => {
    if (activeTab === 'food') {
      handleSaveFood();
    } else {
      handleSaveCustom();
    }
  };

  const hasMenuItems = tentsWithMenu.some((tent) => tent.menuItems.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('food')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'food'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            {t.tabFood}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileEdit className="h-4 w-4" />
            {t.tabCustom}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === 'food' ? (
            // Food Tab
            <div className="space-y-4">
              {loadingMenu ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">{t.loadingMenu}</span>
                </div>
              ) : !hasMenuItems ? (
                <div className="text-center py-8 text-gray-500">
                  {t.noMenuItems}
                </div>
              ) : (
                <div className="space-y-4">
                  {tentsWithMenu.map((tent) => {
                    if (tent.menuItems.length === 0) return null;
                    const isExpanded = expandedTents.has(tent.tentId);

                    return (
                      <div key={tent.tentId} className="border rounded-lg overflow-hidden">
                        {/* Tent Header */}
                        <button
                          type="button"
                          onClick={() => toggleTentExpanded(tent.tentId)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-medium text-gray-700">
                            {t.tentSection.replace('{name}', tent.tentName)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>

                        {/* Menu Items */}
                        {isExpanded && (
                          <div className="divide-y divide-gray-100">
                            {tent.menuItems.map((menuItem) => {
                              const key = `${menuItem.id}`;
                              const selected = selectedItems.get(key);
                              const isSelected = !!selected;

                              return (
                                <div
                                  key={menuItem.id}
                                  className={`p-3 flex items-center gap-3 ${
                                    isSelected ? 'bg-amber-50' : ''
                                  }`}
                                >
                                  <Checkbox
                                    id={`menu-${menuItem.id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => toggleItemSelection(menuItem, tent.tentName)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <label
                                      htmlFor={`menu-${menuItem.id}`}
                                      className="block text-sm font-medium text-gray-900 cursor-pointer"
                                    >
                                      {menuItem.name}
                                    </label>
                                    {menuItem.description && (
                                      <p className="text-xs text-gray-500 truncate">
                                        {menuItem.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                                    {formatCurrency(menuItem.price)}
                                    {menuItem.unit && (
                                      <span className="text-gray-500 font-normal">/{menuItem.unit}</span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => updateItemQuantity(menuItem.id, -1)}
                                        className="p-1 rounded hover:bg-gray-200"
                                        disabled={selected.quantity <= 1}
                                      >
                                        <Minus className="h-4 w-4" />
                                      </button>
                                      <span className="w-8 text-center text-sm font-medium">
                                        {selected.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateItemQuantity(menuItem.id, 1)}
                                        className="p-1 rounded hover:bg-gray-200"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Selected Summary */}
                  {selectedCount > 0 && (
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="font-medium text-amber-800">
                        {t.selectedSummary
                          .replace('{count}', String(selectedCount))
                          .replace('{total}', formatCurrency(selectedTotal))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Custom Tab (existing form)
            <div className="space-y-4">
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (activeTab === 'food' && selectedCount === 0)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {activeTab === 'food'
                  ? t.addingItems.replace('{count}', String(selectedCount))
                  : t.saving}
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
