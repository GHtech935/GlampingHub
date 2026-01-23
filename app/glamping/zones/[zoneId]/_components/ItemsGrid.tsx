"use client";

import { ItemCardVertical } from "./ItemCardVertical";

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
  zoneName: string;
  zoneCity?: string;
  zoneProvince?: string;
  dateRange: {
    checkIn: Date | null;
    checkOut: Date | null;
  };
  onBookClick: (itemId: string) => void;
}

export function ItemsGrid({
  items,
  zoneName,
  zoneCity,
  zoneProvince,
  dateRange,
  onBookClick,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <ItemCardVertical
          key={item.id}
          item={item}
          zoneName={zoneName}
          zoneCity={zoneCity}
          zoneProvince={zoneProvince}
          dateRange={dateRange}
          onBookClick={onBookClick}
        />
      ))}
    </div>
  );
}
