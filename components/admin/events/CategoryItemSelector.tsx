'use client';

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckboxTree } from "@/components/ui/checkbox-tree";
import { useTranslations } from "next-intl";

export interface Category {
  id: string;
  name: string;
  items: Item[];
}

export interface Item {
  id: string;
  name: string;
  category_id: string;
}

interface CategoryItemSelectorProps {
  categories: Category[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export default function CategoryItemSelector({
  categories,
  selectedItems,
  onSelectionChange
}: CategoryItemSelectorProps) {
  const t = useTranslations('events.new');

  const handleSelectAll = () => {
    const allItemIds = categories.flatMap(cat => cat.items.map(item => item.id));
    onSelectionChange(allItemIds);
  };

  const handleSelectNone = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{t('appliedTo')}</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
            {t('selectAll')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleSelectNone}>
            {t('selectNone')}
          </Button>
        </div>
      </div>

      {/* CheckboxTree */}
      <div className="max-h-64 overflow-y-auto">
        <CheckboxTree
          items={categories.map(cat => ({
            id: cat.id,
            label: `${cat.name} (${cat.items.length} ${t('items')})`,
            children: cat.items.map(item => ({
              id: item.id,
              label: item.name
            }))
          }))}
          selectedIds={selectedItems}
          onSelectionChange={onSelectionChange}
        />
      </div>
    </div>
  );
}
