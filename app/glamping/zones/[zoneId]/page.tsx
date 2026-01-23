"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { CategoryTabs } from "../../search_2/_components/CategoryTabs";
import { ItemsGrid } from "./_components/ItemsGrid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  zone_id: string;
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

interface Category {
  id: string;
  name: string;
  weight: number;
  status: string;
  item_count?: number;
}

interface GlampingZone {
  id: string;
  name: {
    vi: string;
    en: string;
  };
  description?: {
    vi: string;
    en: string;
  };
  address?: string;
  city?: string;
  province?: string;
}

function ZoneDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const zoneId = params.zoneId as string;

  // State
  const [zone, setZone] = useState<GlampingZone | null>(null);
  const [items, setItems] = useState<GlampingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{
    checkIn: Date | null;
    checkOut: Date | null;
  }>({
    checkIn: null,
    checkOut: null,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedLang, setSelectedLang] = useState<'vi' | 'en'>('vi');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Helper to parse date string as local date (not UTC)
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper to format date as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load URL params on mount
  useEffect(() => {
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const category = searchParams.get('category');

    if (checkIn) {
      setDateRange((prev) => ({ ...prev, checkIn: parseLocalDate(checkIn) }));
    }

    if (checkOut) {
      setDateRange((prev) => ({ ...prev, checkOut: parseLocalDate(checkOut) }));
    }

    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  // Auto-select first category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory && !searchParams.get('category')) {
      const firstCategory = categories
        .filter(cat => cat.status === 'active')
        .sort((a, b) => a.weight - b.weight)[0];

      if (firstCategory) {
        setSelectedCategory(firstCategory.id);

        // Update URL with first category
        const params = new URLSearchParams(searchParams.toString());
        params.set('category', firstCategory.id);
        router.push(`/glamping/zones/${zoneId}?${params.toString()}`, { scroll: false });
      }
    }
  }, [categories, selectedCategory, searchParams, zoneId, router]);

  // Fetch initial data
  useEffect(() => {
    Promise.all([fetchZone(), fetchItems(), fetchCategories()]).finally(() =>
      setLoading(false)
    );
  }, [zoneId]);

  // Fetch availability when date range changes
  useEffect(() => {
    if (dateRange.checkIn && dateRange.checkOut && items.length > 0) {
      fetchAvailability();
    }
  }, [dateRange.checkIn, dateRange.checkOut, items.length]);

  async function fetchZone() {
    try {
      const response = await fetch(`/api/glamping/zones/${zoneId}`);
      const data = await response.json();
      if (data.zone) {
        setZone(data.zone);
      }
    } catch (error) {
      console.error('Failed to fetch zone:', error);
    }
  }

  async function fetchItems() {
    try {
      // Fetch items with zone filter
      const response = await fetch(`/api/glamping/items?zone_id=${zoneId}`);
      const data = await response.json();
      if (data.items) {
        // Also fetch pricing and media for each item
        const itemsWithDetails = await Promise.all(
          data.items.map(async (item: any) => {
            try {
              const detailResponse = await fetch(`/api/glamping/items/${item.id}`);
              const detailData = await detailResponse.json();

              // Get base pricing from API response
              const basePrice = detailData.item?.base_price || 0;

              return {
                ...item,
                summary: detailData.item?.summary || '',
                pricing: {
                  base_price: basePrice,
                  rate_type: detailData.item?.pricing_rate || 'per_night'
                },
                media: detailData.item?.media || []
              };
            } catch (error) {
              console.error(`Failed to fetch details for item ${item.id}:`, error);
              return item;
            }
          })
        );
        setItems(itemsWithDetails);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch(`/api/glamping/categories?zone_id=${zoneId}`);
      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }

  async function fetchAvailability() {
    try {
      const itemIds = items.map((i) => i.id);
      const response = await fetch('/api/glamping/items/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_ids: itemIds,
          check_in_date: dateRange.checkIn ? formatLocalDate(dateRange.checkIn) : null,
          check_out_date: dateRange.checkOut ? formatLocalDate(dateRange.checkOut) : null,
        }),
      });

      const data = await response.json();
      if (data.availability) {
        // Merge availability into items
        setItems((prev) =>
          prev.map((item) => {
            const avail = data.availability.find((a: any) => a.item_id === item.id);
            return { ...item, availability: avail };
          })
        );
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
  }

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory && item.category_id !== selectedCategory) {
        return false;
      }

      // Date filter - only filter if dates are selected AND availability is checked
      if (dateRange.checkIn && dateRange.checkOut && item.availability) {
        if (!item.availability.is_available) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedCategory, dateRange]);

  // Handle date range change with URL update
  function handleDateRangeChange(range: {
    checkIn: Date | null;
    checkOut: Date | null;
  }) {
    setDateRange(range);

    const params = new URLSearchParams(searchParams.toString());
    if (range.checkIn) {
      params.set('checkIn', formatLocalDate(range.checkIn));
    } else {
      params.delete('checkIn');
    }

    if (range.checkOut) {
      params.set('checkOut', formatLocalDate(range.checkOut));
    } else {
      params.delete('checkOut');
    }

    router.push(`/glamping/zones/${zoneId}?${params.toString()}`);
  }

  // Handle category change
  function handleCategoryChange(categoryId: string) {
    setSelectedCategory(categoryId);

    const params = new URLSearchParams(searchParams.toString());
    params.set('category', categoryId);

    router.push(`/glamping/zones/${zoneId}?${params.toString()}`);
  }

  // Handle book click - navigate to item detail page
  function handleBookClick(itemId: string) {
    router.push(`/glamping/zones/${zoneId}/items/${itemId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Zone Header */}
        {zone && (
          <div className="mb-6 rounded bg-white p-6">
            <Tabs value={selectedLang} onValueChange={(value) => setSelectedLang(value as 'vi' | 'en')}>
              {/* Header with back button and language tabs */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => router.push('/glamping/search')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  <span className="font-medium">Quay lại</span>
                </button>

                <TabsList>
                  <TabsTrigger value="vi">Tiếng Việt</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="vi" className="mt-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {zone.name?.vi || 'Khu Glamping'}
                </h1>
                {(zone.address || zone.city || zone.province) && (
                  <p className="text-sm text-gray-500 mb-6">
                    {[zone.address, zone.city, zone.province].filter(Boolean).join(', ')}
                  </p>
                )}
                {zone.description?.vi && (
                  <div className="mb-4">
                    <div className="relative">
                      <div
                        className={`text-gray-700 prose prose-base max-w-none [&_p]:mb-2 [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:mb-2 [&_h3]:mt-3 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-1 transition-all duration-300 ${
                          !descriptionExpanded ? 'max-h-[200px] overflow-hidden' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: zone.description.vi }}
                      />
                      {!descriptionExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                      )}
                    </div>
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="mt-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                    >
                      {descriptionExpanded ? 'Thu gọn ↑' : 'Xem thêm ↓'}
                    </button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="en" className="mt-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {zone.name?.en || 'Glamping Zone'}
                </h1>
                {(zone.address || zone.city || zone.province) && (
                  <p className="text-sm text-gray-500 mb-6">
                    {[zone.address, zone.city, zone.province].filter(Boolean).join(', ')}
                  </p>
                )}
                {zone.description?.en && (
                  <div className="mb-4">
                    <div className="relative">
                      <div
                        className={`text-gray-700 prose prose-base max-w-none [&_p]:mb-2 [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:mb-2 [&_h3]:mt-3 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-1 transition-all duration-300 ${
                          !descriptionExpanded ? 'max-h-[200px] overflow-hidden' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: zone.description.en }}
                      />
                      {!descriptionExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                      )}
                    </div>
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="mt-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                    >
                      {descriptionExpanded ? 'Hide ↑' : 'View more ↓'}
                    </button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        <ItemsGrid
          items={filteredItems}
          zoneName={zone?.name?.[selectedLang] || zone?.name?.vi || 'Glamping Zone'}
          zoneCity={zone?.city}
          zoneProvince={zone?.province}
          dateRange={dateRange}
          onBookClick={handleBookClick}
        />
      </main>
    </div>
  );
}

export default function ZoneDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Đang tải...</div>
        </div>
      }
    >
      <ZoneDetailContent />
    </Suspense>
  );
}
