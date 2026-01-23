"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, Image as ImageIcon, Video } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { differenceInDays, format } from "date-fns";
import { vi } from "date-fns/locale";
import { AvailabilityCalendar } from "./AvailabilityCalendar";

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

interface ItemDetailModalProps {
  item: GlampingItem;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
  dateRange: {
    checkIn: Date | null;
    checkOut: Date | null;
  };
}

export function ItemDetailModal({
  item,
  isOpen,
  onClose,
  defaultTab = "booking",
  dateRange
}: ItemDetailModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Get images and youtube video
  const images = item.media?.filter(m => m.type === 'image').sort((a, b) => a.display_order - b.display_order) || [];
  const youtubeVideo = item.media?.find(m => m.type === 'youtube');

  // Calculate nights
  const nights = dateRange.checkIn && dateRange.checkOut
    ? differenceInDays(dateRange.checkOut, dateRange.checkIn)
    : 1;

  // Fetch item details when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch(`/api/admin/glamping/items/${item.id}`)
        .then(res => res.json())
        .then(data => {
          setItemDetails(data.item);
          // Initialize quantities
          const initialQty: Record<string, number> = {};
          data.item?.parameters?.forEach((param: any) => {
            initialQty[param.id] = 0;
          });
          setQuantities(initialQty);
        })
        .catch(err => console.error('Failed to fetch item details:', err));
    }
  }, [isOpen, item.id]);

  // Sync activeTab with defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Calculate total price
  const calculateTotal = () => {
    if (!itemDetails) return 0;

    let total = 0;
    const pricingRate = itemDetails.pricing_rate || 'per_night';

    // Only calculate based on parameter quantities
    // (base_price is already included in the inventory parameter price)
    itemDetails.parameters?.forEach((param: any) => {
      const qty = quantities[param.id] || 0;
      const paramPrice = itemDetails.parameter_base_prices?.[param.id] || 0;

      // Respect the pricing rate type
      if (pricingRate === 'per_night') {
        total += paramPrice * qty * nights;
      } else if (pricingRate === 'per_stay' || pricingRate === 'per_hour') {
        // For per_stay and per_hour, don't multiply by nights
        total += paramPrice * qty;
      } else {
        // Default to per_night if unknown
        total += paramPrice * qty * nights;
      }
    });

    return total;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <VisuallyHidden>
          <DialogTitle>{item.name}</DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-col h-full">
          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-white h-auto p-0">
              <TabsTrigger
                value="booking"
                className="flex items-center gap-2 px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                ✓ Book Now
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="flex items-center gap-2 px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <FileText className="h-4 w-4" />
                Thông tin chi tiết
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="flex items-center gap-2 px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Calendar className="h-4 w-4" />
                Xem lịch trống
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="flex items-center gap-2 px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <ImageIcon className="h-4 w-4" />
                Hình ảnh
              </TabsTrigger>
              <TabsTrigger
                value="video"
                className="flex items-center gap-2 px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Video className="h-4 w-4" />
                Video
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Book Now Tab */}
              <TabsContent value="booking" className="p-6">
                <h2 className="text-2xl font-bold mb-4">{item.name}</h2>

                {/* Availability Badge */}
                <div className="mb-6">
                  {item.availability?.is_available ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md">
                      ✓ Available
                      {!item.availability.unlimited && item.availability.available_quantity > 0 && (
                        <span>({item.availability.available_quantity})</span>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-md">
                      Not Available
                    </div>
                  )}
                </div>

                {/* Date Pickers */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-4">
                    <label className="w-32 font-semibold">Check-in</label>
                    <input
                      type="date"
                      defaultValue={dateRange.checkIn?.toISOString().split('T')[0]}
                      className="flex-1 px-4 py-2 border rounded-md"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-32 font-semibold">Check-out</label>
                    <input
                      type="date"
                      defaultValue={dateRange.checkOut?.toISOString().split('T')[0]}
                      className="flex-1 px-4 py-2 border rounded-md"
                    />
                  </div>
                </div>

                {/* Parameters/Guests */}
                <div className="space-y-4 mb-6">
                  {itemDetails?.parameters && itemDetails.parameters.length > 0 ? (
                    itemDetails.parameters.map((param: any) => {
                      const paramPrice = itemDetails.parameter_base_prices?.[param.id] || 0;
                      return (
                        <div key={param.id} className="flex items-center gap-4">
                          <label className="flex-1 font-medium">{param.name}</label>
                          <input
                            type="number"
                            value={quantities[param.id] || 0}
                            onChange={(e) => setQuantities({
                              ...quantities,
                              [param.id]: parseInt(e.target.value) || 0
                            })}
                            min={param.min_quantity || 0}
                            max={param.max_quantity || 999}
                            className="w-24 px-3 py-2 border rounded-md text-center"
                          />
                          {paramPrice > 0 && (
                            <span className="w-48 text-gray-600">
                              x {paramPrice.toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500">Đang tải thông tin...</div>
                  )}
                </div>

                {/* Total Price */}
                <div className="border-t pt-4 mb-4">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold">
                      {dateRange.checkIn && dateRange.checkOut ? (
                        <>
                          {format(dateRange.checkIn, 'EEE dd MMM yyyy', { locale: vi })} - {format(dateRange.checkOut, 'EEE dd MMM yyyy', { locale: vi })}:
                        </>
                      ) : (
                        'Chọn ngày:'
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600">
                        {calculateTotal().toLocaleString('vi-VN')} đ
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Promo Code Link */}
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <a href="#" className="text-sm hover:underline">
                    Áp dụng chương trình khuyến mãi hoặc phiếu giảm giá
                  </a>
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="p-6">
                <h2 className="text-2xl font-bold mb-4">{item.name}</h2>

                {/* Summary */}
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.summary || '' }}
                />
              </TabsContent>

              {/* Calendar Tab */}
              <TabsContent value="calendar" className="p-6">
                <AvailabilityCalendar
                  itemId={item.id}
                  itemName={item.name}
                  checkInDate={dateRange.checkIn}
                  checkOutDate={dateRange.checkOut}
                />
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="p-6">
                <h2 className="text-2xl font-bold mb-4">{item.name}</h2>

                {images.length > 0 ? (
                  <div className="space-y-4">
                    {/* Main Image */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                      <img
                        src={images[0].url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Thumbnails */}
                    {images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {images.map((image, index) => (
                          <div
                            key={index}
                            className="relative aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={image.url}
                              alt={`${item.name} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Không có hình ảnh
                  </div>
                )}
              </TabsContent>

              {/* Video Tab */}
              <TabsContent value="video" className="p-6">
                <h2 className="text-2xl font-bold mb-4">{item.name}</h2>

                {youtubeVideo ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYoutubeVideoId(youtubeVideo.url)}`}
                      title={item.name}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Không có video
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-8"
            >
              Đóng
            </Button>
            <Button
              onClick={() => {
                // TODO: Handle continue action
                console.log('Continue booking:', item.id);
              }}
              className="px-8 bg-blue-600 hover:bg-blue-700"
            >
              Tiếp tục
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to extract YouTube video ID
function getYoutubeVideoId(url: string): string {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : '';
}
