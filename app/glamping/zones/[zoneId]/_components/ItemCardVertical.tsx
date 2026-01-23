"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Heart, ChevronLeft, ChevronRight, Tent } from "lucide-react";
import Image from "next/image";

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

interface ItemCardVerticalProps {
  item: GlampingItem;
  zoneName: string;
  zoneCity?: string;
  zoneProvince?: string;
  dateRange: { checkIn: Date | null; checkOut: Date | null };
  onBookClick: (itemId: string) => void;
}

export function ItemCardVertical({
  item,
  zoneName,
  zoneCity,
  zoneProvince,
  dateRange,
  onBookClick,
}: ItemCardVerticalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Get images sorted by display order
  const images = item.media
    ?.filter((m) => m.type === "image")
    .sort((a, b) => a.display_order - b.display_order) || [];

  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[currentImageIndex] : null;

  // Navigate carousel
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Location string
  const location = [zoneCity, zoneProvince].filter(Boolean).join(", ");

  // Truncate description
  const description = item.summary
    ? item.summary.replace(/<[^>]*>/g, "").slice(0, 100) + "..."
    : "";

  return (
    <Card className="rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer">
      {/* Image Section with Carousel */}
      <div className="relative aspect-[4/3] bg-gray-200">
        {hasImages && currentImage ? (
          <>
            <Image
              src={currentImage.url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />

            {/* Carousel Controls */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-800" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4 text-gray-800" />
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  {currentImageIndex + 1}/{images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Tent className="w-16 h-16 text-gray-400" />
          </div>
        )}

        {/* Wishlist Heart Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
          aria-label="Add to wishlist"
        >
          <Heart
            className={`w-5 h-5 ${
              isWishlisted
                ? "fill-red-500 text-red-500"
                : "text-gray-700"
            }`}
          />
        </button>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Item Name */}
        <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
          {item.name}
        </h3>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
        )}

        {/* CTA Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onBookClick(item.id);
          }}
          className="w-full"
          size="lg"
        >
          Đặt Lều
        </Button>
      </div>
    </Card>
  );
}
