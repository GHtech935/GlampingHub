"use client";

import { useState, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";

interface ProductsFilterBarProps {
  onFilterChange: (filters: ProductFilters) => void;
}

export interface ProductFilters {
  campsiteId: string;
  categoryId: string;
  isAvailable: string;
  search: string;
}

interface Campsite {
  id: string;
  name: any;
}

interface Category {
  id: string;
  name: { vi: string; en: string };
  is_active: boolean;
}

export function ProductsFilterBar({ onFilterChange }: ProductsFilterBarProps) {
  const t = useTranslations('admin.productsPage');
  const locale = useLocale() as 'vi' | 'en';
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<ProductFilters>({
    campsiteId: "all",
    categoryId: "all",
    isAvailable: "all",
    search: "",
  });

  // Helper to get localized text
  const getLocalizedText = (text: any): string => {
    if (typeof text === 'string') return text;
    if (!text) return '';
    return text[locale] || text.vi || text.en || '';
  };

  // Load campsites and categories for filter dropdowns
  useEffect(() => {
    fetchCampsites();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/product-categories");
      const result = await response.json();
      if (Array.isArray(result)) {
        setCategories(result);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchCampsites = async () => {
    try {
      const response = await fetch("/api/admin/campsites");
      const result = await response.json();

      const campsitesData = result.campsites || result.data || result || [];

      if (Array.isArray(campsitesData)) {
        setCampsites(campsitesData);
      }
    } catch (error) {
      console.error("Failed to fetch campsites:", error);
    }
  };

  const handleFilterChange = (key: keyof ProductFilters, value: string) => {
    const updatedFilters = {
      ...filters,
      [key]: value,
    };

    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleSearchChange = (value: string) => {
    const updatedFilters = {
      ...filters,
      search: value,
    };
    setFilters(updatedFilters);

    // Debounce search
    const timeoutId = setTimeout(() => {
      onFilterChange(updatedFilters);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleReset = () => {
    const resetFilters: ProductFilters = {
      campsiteId: "all",
      categoryId: "all",
      isAvailable: "all",
      search: "",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      {/* Responsive grid layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2 sm:gap-3 items-end">
        {/* Search bar */}
        <div className="col-span-2 sm:col-span-1 lg:w-56">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {t('search')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 sm:pl-10 text-sm"
            />
          </div>
        </div>

        {/* Campsite filter */}
        <div className="lg:w-48">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {t('campsite')}
          </label>
          <Select
            value={filters.campsiteId}
            onValueChange={(value) => handleFilterChange("campsiteId", value)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={t('allCampsites')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              {campsites.map((campsite) => (
                <SelectItem key={campsite.id} value={campsite.id}>
                  {getLocalizedText(campsite.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category filter */}
        <div className="lg:w-44">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {t('category')}
          </label>
          <Select
            value={filters.categoryId}
            onValueChange={(value) => handleFilterChange("categoryId", value)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={t('allCategories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {getLocalizedText(category.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Availability filter */}
        <div className="lg:w-36">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {t('status')}
          </label>
          <Select
            value={filters.isAvailable}
            onValueChange={(value) => handleFilterChange("isAvailable", value)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={t('allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="true">{t('available')}</SelectItem>
              <SelectItem value="false">{t('unavailable')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset button - Icon only */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          title={t('reset')}
          className="h-9 w-9 sm:h-10 sm:w-10"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
