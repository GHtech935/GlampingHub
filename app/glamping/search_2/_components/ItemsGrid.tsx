"use client";

import { ItemCard } from "./ItemCard";
import { cn } from "@/lib/utils";

interface GlampingItem {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  category_name: string;
  summary: string;
  inventory_quantity: number;
  unlimited_inventory: boolean;
  status: string;
  pricing?: {
    base_price: number;
    rate_type: string;
  };
  media?: {
    url: string;
    type: string;
    display_order: number;
  }[];
  availability?: {
    is_available: boolean;
    available_quantity: number;
    unlimited?: boolean;
  };
}

interface ItemsGridProps {
  items: GlampingItem[];
  viewMode: 'grid' | 'list';
  dateRange: {
    checkIn: Date | null;
    checkOut: Date | null;
  };
  onViewDetails?: (itemId: string) => void;
  onViewCalendar?: (itemId: string) => void;
  zoneName?: string;
}

export function ItemsGrid({
  items,
  viewMode,
  dateRange,
  onViewDetails,
  onViewCalendar,
  zoneName
}: ItemsGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Không tìm thấy items
          </h3>
          <p className="text-gray-600">
            Thử thay đổi bộ lọc hoặc chọn ngày khác
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          dateRange={dateRange}
          onViewDetails={onViewDetails}
          onViewCalendar={onViewCalendar}
          zoneName={zoneName}
        />
      ))}
    </div>
  );
}
