"use client";

import { Trash2, Plus, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DynamicListManagerProps<T extends { id: string }> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, updateItem: (updated: T) => void) => React.ReactNode;
  onAdd: () => void;
  addButtonLabel: string;
  emptyText: string;
  itemLabel?: (item: T, index: number) => string;
  columns?: 1 | 2; // Number of columns to display items
}

/**
 * Generic drag-drop list manager component
 * Handles add/delete/reorder operations for any type of list
 */
export function DynamicListManager<T extends { id: string }>({
  items,
  onChange,
  renderItem,
  onAdd,
  addButtonLabel,
  emptyText,
  itemLabel,
  columns = 1
}: DynamicListManagerProps<T>) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(items.map(item => item.id)));

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems);
  };

  const handleDelete = (index: number) => {
    const itemToDelete = items[index];
    if (confirm(`Bạn có chắc muốn xóa item này?`)) {
      onChange(items.filter((_, i) => i !== index));
      // Remove from expanded set
      setExpandedItems(prev => {
        const next = new Set(prev);
        next.delete(itemToDelete.id);
        return next;
      });
    }
  };

  const handleUpdate = (index: number, updated: T) => {
    const newItems = [...items];
    newItems[index] = updated;
    onChange(newItems);
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Button type="button" onClick={onAdd} variant="outline" className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        {addButtonLabel}
      </Button>

      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-sm text-gray-500">{emptyText}</p>
        </div>
      ) : (
        <div className={cn(columns === 2 ? "grid grid-cols-2 gap-3" : "space-y-3")}>
          {items.map((item, index) => {
            const isExpanded = expandedItems.has(item.id);
            const label = itemLabel ? itemLabel(item, index) : `Item ${index + 1}`;

            return (
              <Card key={item.id} className="transition-shadow">
                {/* Header */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
                  {/* Move Up/Down buttons */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-5 w-6 p-0"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                      className="h-5 w-6 p-0"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.id)}
                    className="flex-1 text-left flex items-center gap-2 font-medium text-sm hover:text-blue-600 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {label}
                  </button>

                  <span className="text-xs text-gray-500 mr-2">#{index + 1}</span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Content */}
                {isExpanded && (
                  <div className="p-4">
                    {renderItem(item, index, (updated) => handleUpdate(index, updated))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          Có {items.length} items
        </p>
      )}
    </div>
  );
}
