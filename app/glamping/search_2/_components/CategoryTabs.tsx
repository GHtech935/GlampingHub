"use client";

import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  weight: number;
  status: string;
  item_count?: number;
}

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onCategoryChange
}: CategoryTabsProps) {
  // Sort categories by weight
  const sortedCategories = [...categories].sort((a, b) => a.weight - b.weight);

  return (
    <div className="mb-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {/* Category Tabs */}
        {sortedCategories
          .filter(cat => cat.status === 'active')
          .map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className="whitespace-nowrap"
            >
              {category.name}
              {category.item_count !== undefined && ` (${category.item_count})`}
            </Button>
          ))
        }
      </div>
    </div>
  );
}
