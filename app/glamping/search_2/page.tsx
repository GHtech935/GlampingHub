"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchSidebar } from "./_components/SearchSidebar";
import { SearchHeader } from "./_components/SearchHeader";
import { CategoryTabs } from "./_components/CategoryTabs";
import { ItemsGrid } from "./_components/ItemsGrid";

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

interface Category {
  id: string;
  name: string;
  weight: number;
  status: string;
  item_count?: number;
}

function GlampingSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Load URL params on mount
  useEffect(() => {
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const category = searchParams.get('category');

    if (checkIn) {
      setDateRange((prev) => ({ ...prev, checkIn: new Date(checkIn) }));
    }

    if (checkOut) {
      setDateRange((prev) => ({ ...prev, checkOut: new Date(checkOut) }));
    }

    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  // Fetch initial data
  useEffect(() => {
    Promise.all([fetchItems(), fetchCategories()]).finally(() =>
      setLoading(false)
    );
  }, []);

  // Fetch availability when date range changes
  useEffect(() => {
    if (dateRange.checkIn && dateRange.checkOut && items.length > 0) {
      fetchAvailability();
    }
  }, [dateRange.checkIn, dateRange.checkOut, items.length]);

  async function fetchItems() {
    try {
      const response = await fetch('/api/admin/glamping/items');
      const data = await response.json();
      if (data.items) {
        // Also fetch pricing and media for each item
        const itemsWithDetails = await Promise.all(
          data.items.map(async (item: any) => {
            try {
              const detailResponse = await fetch(`/api/admin/glamping/items/${item.id}`);
              const detailData = await detailResponse.json();

              // Get base pricing from API response
              const basePrice = detailData.item?.base_price || 0;

              // Debug log
              console.log('Detail API response for', item.name, ':', {
                base_price: detailData.item?.base_price,
                summary: detailData.item?.summary,
                pricing_rate: detailData.item?.pricing_rate,
                media: detailData.item?.media?.length
              });

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
      const response = await fetch('/api/admin/glamping/categories');
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
          check_in_date: dateRange.checkIn?.toISOString().split('T')[0],
          check_out_date: dateRange.checkOut?.toISOString().split('T')[0],
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
      if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
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
      params.set('checkIn', range.checkIn.toISOString().split('T')[0]);
    } else {
      params.delete('checkIn');
    }

    if (range.checkOut) {
      params.set('checkOut', range.checkOut.toISOString().split('T')[0]);
    } else {
      params.delete('checkOut');
    }

    router.push(`/glamping/search?${params.toString()}`);
  }

  // Handle category change
  function handleCategoryChange(categoryId: string) {
    setSelectedCategory(categoryId);

    const params = new URLSearchParams(searchParams.toString());
    if (categoryId !== 'all') {
      params.set('category', categoryId);
    } else {
      params.delete('category');
    }

    router.push(`/glamping/search?${params.toString()}`);
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
      {/* Sidebar - Fixed on desktop */}
      <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 bg-white border-r overflow-y-auto">
        <SearchSidebar
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-6">
        <SearchHeader
          dateRange={dateRange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        <ItemsGrid
          items={filteredItems}
          viewMode={viewMode}
          dateRange={dateRange}
          onViewDetails={(id) => console.log('View details:', id)}
          onViewCalendar={(id) => console.log('View calendar:', id)}
        />
      </main>
    </div>
  );
}

export default function GlampingSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Đang tải...</div>
        </div>
      }
    >
      <GlampingSearchContent />
    </Suspense>
  );
}
