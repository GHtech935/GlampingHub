'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CategoryItemSelector, { Category } from '@/components/admin/events/CategoryItemSelector';
import Swal from 'sweetalert2';

interface CommonItemAppliedItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneId: string;
  commonItemId: string;
  commonItemName: string;
}

export default function CommonItemAppliedItemsModal({
  open,
  onOpenChange,
  zoneId,
  commonItemId,
  commonItemName,
}: CommonItemAppliedItemsModalProps) {
  const t = useTranslations('admin.glamping.commonItems.appliedItems');
  const [itemCategories, setItemCategories] = useState<Category[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && commonItemId) {
      fetchData();
    }
  }, [open, commonItemId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, itemsRes, appliedRes] = await Promise.all([
        fetch(`/api/admin/glamping/categories?zone_id=${zoneId}&is_tent_category=true`),
        fetch(`/api/admin/glamping/items?zone_id=${zoneId}&is_tent_category=true`),
        fetch(`/api/admin/glamping/items/${commonItemId}/applied-items`),
      ]);

      const categoriesData = await categoriesRes.json();
      const itemsData = await itemsRes.json();
      const appliedData = await appliedRes.json();

      // Group items by category (same pattern as MenuFormModal)
      const categoryMap = new Map<string, Category>();

      categoriesData.categories?.forEach((cat: any) => {
        const catName = typeof cat.name === 'object'
          ? (cat.name?.vi || cat.name?.en || 'N/A')
          : (cat.name || 'N/A');
        categoryMap.set(cat.id, { id: cat.id, name: catName, items: [] });
      });

      itemsData.items?.forEach((item: any) => {
        const category = categoryMap.get(item.category_id);
        if (category) {
          const itemName = typeof item.name === 'object'
            ? (item.name?.vi || item.name?.en || 'N/A')
            : (item.name || 'N/A');
          category.items.push({
            id: item.id,
            name: itemName,
            category_id: item.category_id,
          });
        }
      });

      const categoriesWithItems = Array.from(categoryMap.values()).filter(cat => cat.items.length > 0);
      setItemCategories(categoriesWithItems);
      setSelectedItems(appliedData.item_ids || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      Swal.fire({ icon: 'error', title: t('error'), timer: 2000, showConfirmButton: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedItems(selectedIds);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/glamping/items/${commonItemId}/applied-items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: selectedItems }),
      });

      if (!res.ok) throw new Error('Failed to save');

      onOpenChange(false);
      await Swal.fire({
        icon: 'success',
        title: t('success'),
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Failed to save applied items:', error);
      await Swal.fire({
        icon: 'error',
        title: t('error'),
        confirmButtonText: 'OK',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}: {commonItemName}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <CategoryItemSelector
            categories={itemCategories}
            selectedItems={selectedItems}
            onSelectionChange={handleSelectionChange}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
