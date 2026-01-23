"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { ItemDetailModal } from "./ItemDetailModal";

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

interface ItemCardProps {
  item: GlampingItem;
  dateRange: {
    checkIn: Date | null;
    checkOut: Date | null;
  };
  onViewDetails?: (itemId: string) => void;
  onViewCalendar?: (itemId: string) => void;
  zoneName?: string;
}

export function ItemCard({ item, dateRange, onViewDetails, onViewCalendar, zoneName }: ItemCardProps) {
  // Debug: log item data
  console.log('ItemCard - item data:', {
    name: item.name,
    pricing: item.pricing,
    summary: item.summary,
    media: item.media
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<string>("details");

  // Open modal with specific tab
  const openModal = (tab: string) => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  // Calculate number of nights
  const nights = dateRange.checkIn && dateRange.checkOut
    ? differenceInDays(dateRange.checkOut, dateRange.checkIn)
    : 1;

  // Get base price (default to 0 if not available)
  const basePrice = item.pricing?.base_price || 0;
  const totalPrice = basePrice * nights;

  // Get primary image
  const primaryImage = item.media && item.media.length > 0
    ? item.media.sort((a, b) => a.display_order - b.display_order)[0]?.url
    : null;

  // Determine availability badge
  const renderAvailabilityBadge = () => {
    // If no dates selected, show neutral badge
    if (!dateRange.checkIn || !dateRange.checkOut) {
      return <Badge variant="outline" className="text-gray-600">Chọn ngày để xem</Badge>;
    }

    // If dates selected but no availability data, show checking
    if (!item.availability) {
      return <Badge variant="outline" className="text-gray-600">Đang kiểm tra...</Badge>;
    }

    if (item.availability.is_available) {
      return (
        <Badge className="bg-green-500 text-white hover:bg-green-600 w-full justify-center py-2">
          AVAILABLE
          {item.availability.unlimited
            ? ""
            : item.availability.available_quantity > 0
              ? ` (${item.availability.available_quantity})`
              : ""
          }
        </Badge>
      );
    }

    return <Badge variant="destructive" className="w-full justify-center py-2">FULL</Badge>;
  };

  // Split summary into two parts if available
  const summaryParts = item.summary?.split('\n\n') || [];
  const shortSummary = summaryParts[0] || '';
  const longSummary = summaryParts.slice(1).join('\n\n') || '';

  return (
    <Card className="rounded-lg border shadow hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-6 p-6">
          {/* Left: Actions */}
          <div className="flex flex-col gap-3 w-48">
            {/* Availability Badge */}
            {renderAvailabilityBadge()}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openModal("booking")}
                className="w-full justify-start text-sm bg-white border-gray-200 hover:border-primary text-gray-900"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 mr-2 rounded border-gray-300 text-primary focus:ring-primary"
                  onClick={(e) => e.stopPropagation()}
                />
                Book Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openModal("details")}
                className="w-full justify-start text-sm bg-white border-gray-200 hover:border-primary text-blue-600"
              >
                📋 Thông tin chi tiết
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openModal("calendar")}
                className="w-full justify-start text-sm bg-white border-gray-200 hover:border-primary text-gray-900"
              >
                📅 Xem lịch trống
              </Button>
            </div>
          </div>

          {/* Middle: Info */}
          <div className="flex-1 space-y-2">
            {/* Title */}
            <h3 className="text-2xl font-semibold text-gray-900">
              {item.name}
            </h3>

            {/* Price */}
            <p className="text-base text-gray-700">
              {basePrice > 0 ? (
                <>
                  <span className="font-semibold">{totalPrice.toLocaleString('vi-VN')} đ</span>
                  <span className="text-gray-500"> một đêm</span>
                </>
              ) : (
                <span className="font-semibold text-blue-600">Liên hệ để biết giá</span>
              )}
            </p>

            {/* Short Description (bold) */}
            {shortSummary && (
              <p className="text-base font-semibold text-gray-900 leading-relaxed">
                {shortSummary}
              </p>
            )}

            {/* Long Description (blue link style) */}
            {longSummary && (
              <p className="text-base text-blue-600 leading-relaxed">
                {longSummary}
                {longSummary.length > 200 && (
                  <span className="ml-1 font-medium cursor-pointer hover:underline">
                    (Đọc thêm)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Right: Image */}
          {primaryImage && (
            <div className="w-72 h-48 flex-shrink-0">
              <img
                src={primaryImage}
                alt={item.name}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal */}
      <ItemDetailModal
        item={item}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTab={modalTab}
        dateRange={dateRange}
        zoneName={zoneName}
      />
    </Card>
  );
}
