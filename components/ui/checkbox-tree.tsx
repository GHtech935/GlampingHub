"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export interface CheckboxTreeItem {
  id: string;
  label: string;
  children?: CheckboxTreeItem[];
}

export interface CheckboxTreeProps {
  items: CheckboxTreeItem[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  collapsible?: boolean;
  defaultExpanded?: string[];
  className?: string;
}

export function CheckboxTree({
  items,
  selectedIds,
  onSelectionChange,
  collapsible = true,
  defaultExpanded = [],
  className,
}: CheckboxTreeProps) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
    new Set(defaultExpanded)
  );

  const toggleExpanded = React.useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      return newExpanded;
    });
  }, []);

  const getChildIds = React.useCallback((item: CheckboxTreeItem): string[] => {
    if (!item.children || item.children.length === 0) {
      return [item.id];
    }
    return item.children.flatMap(getChildIds);
  }, []);

  const getParentCheckState = React.useCallback(
    (item: CheckboxTreeItem): boolean | "indeterminate" => {
      if (!item.children || item.children.length === 0) {
        return selectedIds.includes(item.id);
      }

      const childIds = item.children.flatMap(getChildIds);
      const selectedCount = childIds.filter((id) =>
        selectedIds.includes(id)
      ).length;

      if (selectedCount === 0) {
        return false;
      } else if (selectedCount === childIds.length) {
        return true;
      } else {
        return "indeterminate";
      }
    },
    [selectedIds, getChildIds]
  );

  const toggleParent = React.useCallback(
    (item: CheckboxTreeItem) => {
      if (!item.children || item.children.length === 0) {
        // Leaf node - toggle single item
        if (selectedIds.includes(item.id)) {
          onSelectionChange(selectedIds.filter((id) => id !== item.id));
        } else {
          onSelectionChange([...selectedIds, item.id]);
        }
        return;
      }

      const childIds = item.children.flatMap(getChildIds);
      const allSelected = childIds.every((id) => selectedIds.includes(id));

      if (allSelected) {
        // Deselect all children
        onSelectionChange(
          selectedIds.filter((id) => !childIds.includes(id))
        );
      } else {
        // Select all children
        const newSelected = [...selectedIds];
        childIds.forEach((id) => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        onSelectionChange(newSelected);
      }
    },
    [selectedIds, onSelectionChange, getChildIds]
  );

  const toggleChild = React.useCallback(
    (itemId: string) => {
      if (selectedIds.includes(itemId)) {
        onSelectionChange(selectedIds.filter((id) => id !== itemId));
      } else {
        onSelectionChange([...selectedIds, itemId]);
      }
    },
    [selectedIds, onSelectionChange]
  );

  const renderItem = (item: CheckboxTreeItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const checkState = getParentCheckState(item);

    if (!hasChildren) {
      // Leaf node - simple checkbox
      return (
        <div
          key={item.id}
          className={cn("flex items-center gap-2", level > 0 && "pl-6")}
        >
          <Checkbox
            checked={selectedIds.includes(item.id)}
            onCheckedChange={() => toggleChild(item.id)}
          />
          <label className="text-sm cursor-pointer select-none">
            {item.label}
          </label>
        </div>
      );
    }

    // Parent node with children
    if (collapsible) {
      return (
        <Collapsible
          key={item.id}
          open={isExpanded}
          onOpenChange={() => toggleExpanded(item.id)}
        >
          <div className="border rounded-lg">
            <div className="flex items-center gap-2 p-3 bg-gray-50">
              <Checkbox
                checked={checkState}
                onCheckedChange={() => toggleParent(item)}
              />
              <CollapsibleTrigger className="flex-1 flex items-center justify-between hover:text-blue-600">
                <span className="text-sm font-medium">{item.label}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="p-3 space-y-2">
              {item.children?.map((child) => renderItem(child, level + 1))}
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    }

    // Non-collapsible parent
    return (
      <div key={item.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={checkState}
            onCheckedChange={() => toggleParent(item)}
          />
          <span className="font-medium">{item.label}</span>
        </div>
        <div className="space-y-2">
          {item.children?.map((child) => renderItem(child, level + 1))}
        </div>
      </div>
    );
  };

  return <div className={cn("space-y-2", className)}>{items.map((item) => renderItem(item))}</div>;
}
