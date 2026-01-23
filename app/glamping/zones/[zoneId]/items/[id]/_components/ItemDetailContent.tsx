"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { PitchImageGallery } from '@/components/pitch/PitchImageGallery';
import { ItemInformationGrid } from './ItemInformationGrid';
import { ItemBookingSection } from './ItemBookingSection';

interface ItemImage {
  url: string;
  caption?: string;
  display_order: number;
}

interface ItemParameter {
  id: string;
  name: string;
  color_code: string;
  min_quantity: number;
  max_quantity: number;
}

interface ItemTag {
  id: string;
  name: string;
}

interface ItemDetailContentProps {
  item: {
    id: string;
    name: string;
    sku: string;
    summary: string;
    category_name: string;
    zone_id: string;
    zone_name: { vi: string; en: string };
    zone_city: string;
    zone_province: string;
    zone_address: string;
    max_guests: number;
    inventory_quantity: number;
    unlimited_inventory: boolean;
    status: string;
    base_price: number;
    extra_adult_price: number;
    extra_child_price: number;
  };
  parameters: ItemParameter[];
  tags: ItemTag[];
  images: ItemImage[];
  media: any[];
  zoneId: string;
  locale: 'vi' | 'en';
}

export function ItemDetailContent({
  item,
  parameters,
  tags,
  images,
  media,
  zoneId,
  locale,
}: ItemDetailContentProps) {
  // Transform images to match PitchImageGallery format
  const galleryImages = images.map((img, index) => ({
    id: `${item.id}-${index}`,
    image_url: img.url,
    is_featured: index === 0,
    display_order: img.display_order,
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* Header with back button and item name */}
      <div className="border-b">
        <Container>
          <div className="py-4 flex items-center gap-3">
            <Link
              href={`/glamping/zones/${zoneId}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">
              {item.name}
            </h1>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-8">
          {/* Left column - Main content */}
          <div className="space-y-6">
            {/* Image Gallery */}
            <PitchImageGallery media={galleryImages} pitchName={item.name} />

            {/* Item Information Grid (Parameters, Tags, Description) */}
            <ItemInformationGrid
              item={item}
              parameters={parameters}
              tags={tags}
              media={media}
              locale={locale}
            />

            {/* Zone info */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {locale === 'vi' ? 'Thông tin khu glamping' : 'Glamping Zone Information'}
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {locale === 'vi' ? 'Tên khu:' : 'Zone Name:'}
                  </span>
                  <span className="text-right">
                    {item.zone_name?.[locale] || item.zone_name?.vi || ''}
                  </span>
                </div>
                {item.zone_address && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {locale === 'vi' ? 'Địa chỉ:' : 'Address:'}
                    </span>
                    <span className="text-right">{item.zone_address}</span>
                  </div>
                )}
                {(item.zone_city || item.zone_province) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {locale === 'vi' ? 'Vị trí:' : 'Location:'}
                    </span>
                    <span className="text-right">
                      {[item.zone_city, item.zone_province].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column - Sticky Booking Section */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <ItemBookingSection
              itemId={item.id}
              zoneId={zoneId}
              zoneName={item.zone_name?.[locale] || item.zone_name?.vi || ''}
              itemName={item.name}
              basePrice={item.base_price}
              extraAdultPrice={item.extra_adult_price}
              extraChildPrice={item.extra_child_price}
              maxGuests={item.max_guests}
              parameters={parameters}
              locale={locale}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
