"use client";

import { use, useEffect, useState } from "react";
import { Plus, Search, Edit, Tent, ImageOff, DollarSign, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";

interface Item {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  category_name: string;
  inventory_quantity: number;
  status: string;
  visibility: string;
  image_url: string | null;
  base_price: number | null;
  active_bookings: number;
  deposit_type: string;
  deposit_value: number;
  zone_deposit_type: string;
  zone_deposit_value: number;
  is_active: boolean;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
}

const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toLocaleString("vi-VN");
};

const formatDepositDisplay = (item: Item) => {
  let depositType = item.deposit_type;
  let depositValue = item.deposit_value;

  // If using system default, use zone settings
  if (depositType === 'system_default') {
    depositType = item.zone_deposit_type || 'percentage';
    depositValue = item.zone_deposit_value || 0;
  }

  // Format based on type
  if (depositType === 'percentage' || depositType === 'custom_percentage') {
    return `${parseFloat(depositValue.toString())}%`;
  } else if (depositType === 'fixed_amount') {
    return `${formatCurrency(depositValue)} VND`;
  } else if (depositType === 'per_hour') {
    return `${formatCurrency(depositValue)} VND/giờ`;
  } else if (depositType === 'per_qty') {
    return `${formatCurrency(depositValue)} VND/số lượng`;
  }

  return `${formatCurrency(depositValue)} VND`;
};

export default function ItemsPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const router = useRouter();
  const { zoneId } = use(params);
  const { user } = useAuth();
  const t = useTranslations("admin.glamping.items");
  const tc = useTranslations("admin.glamping.common");
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showNoCategory, setShowNoCategory] = useState(false);
  const [copyingItemId, setCopyingItemId] = useState<string | null>(null);

  // Check if user is operations role (read-only)
  const isOperations = user?.type === 'staff' && (user as any).role === 'operations';

  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  useEffect(() => {
    if (zoneId !== "all") {
      fetchItems();
      fetchCategories();
    }
  }, [zoneId, showNoCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/categories?zone_id=${zoneId}&is_tent=true`);
      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchItems = async () => {
    try {
      // Build query params based on filter
      let url = `/api/admin/glamping/items?zone_id=${zoneId}`;
      if (showNoCategory) {
        // Fetch items without category (no_category=true), only tents
        url += '&no_category=true&is_tent=true';
      } else {
        // Filter by is_tent_category=true for tent items only
        url += '&is_tent_category=true';
      }
      const response = await fetch(url);
      const data = await response.json();

      if (data.items) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    // Filter by search
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());

    // Filter by status
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.is_active) ||
      (statusFilter === 'inactive' && !item.is_active);

    // Filter by category
    let matchesCategory = true;
    if (showNoCategory) {
      // When checkbox is checked, only show items without category
      matchesCategory = !item.category_id || item.category_id === '';
    } else if (categoryFilter !== 'all') {
      // When a specific category is selected
      matchesCategory = item.category_id === categoryFilter;
    }

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "available":
        return "success";
      case "unavailable":
        return "secondary";
      case "disabled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleCopyItem = async (itemId: string, itemName: string) => {
    const result = await Swal.fire({
      title: t("card.confirmCopy", { name: itemName }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: t("card.confirmCopyBtn"),
      cancelButtonText: t("card.cancelBtn"),
    });

    if (!result.isConfirmed) {
      return;
    }

    setCopyingItemId(itemId);
    try {
      const response = await fetch(`/api/admin/glamping/items/${itemId}/copy`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to copy item');
      }

      const data = await response.json();

      // Refresh the items list
      await fetchItems();

      await Swal.fire({
        title: t("card.copySuccess"),
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });

      // Optionally redirect to edit page of new item
      // router.push(`/admin/zones/${zoneId}/items/${data.id}/edit`);
    } catch (error) {
      console.error("Failed to copy item:", error);
      await Swal.fire({
        title: t("card.copyError"),
        icon: 'error',
        confirmButtonText: 'OK',
      });
    } finally {
      setCopyingItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        {!isOperations && (
          <Button onClick={() => router.push(`/admin/zones/${zoneId}/items/new`)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addNew")}
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {/* Category Filter */}
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          disabled={showNoCategory}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filters.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* No Category Checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="noCategory"
            checked={showNoCategory}
            onCheckedChange={(checked) => {
              setShowNoCategory(checked === true);
              if (checked) {
                setCategoryFilter('all');
              }
            }}
          />
          <label
            htmlFor="noCategory"
            className="text-sm text-gray-700 cursor-pointer whitespace-nowrap"
          >
            {t("filters.noCategory")}
          </label>
        </div>
        {/* Status Filter */}
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border-r border-gray-300`}
          >
            {t('status.active')}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border-r border-gray-300`}
          >
            {t('status.inactive')}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('filters.all')}
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <Tent className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{tc("noData")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!item.is_active ? 'opacity-60' : ''}`}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] bg-gray-100">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                    <ImageOff className="w-10 h-10 mb-1" />
                    <span className="text-xs">{t("card.noImage")}</span>
                  </div>
                )}

                {/* Status badges overlaid on image */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {!item.is_active && (
                    <Badge variant="secondary" className="text-xs shadow-sm bg-gray-500 text-white">
                      {t('status.inactive')}
                    </Badge>
                  )}
                  <Badge variant={getStatusVariant(item.status)} className="text-xs shadow-sm">
                    {t(`status.${item.status}`)}
                  </Badge>
                  {item.category_name && (
                    <Badge variant="outline" className="text-xs bg-white/90 shadow-sm">
                      {item.category_name}
                    </Badge>
                  )}
                </div>

                {/* Copy button in top-right corner */}
                {!isOperations && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyItem(item.id, item.name);
                    }}
                    disabled={copyingItemId === item.id}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
                    title={t("card.copy")}
                  >
                    <Copy className={`w-4 h-4 text-gray-700 group-hover:text-primary transition-colors ${copyingItemId === item.id ? 'animate-pulse' : ''}`} />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Name with display order */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg text-gray-900 leading-tight line-clamp-1">
                    {item.name}
                  </h3>
                  <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    #{item.display_order}
                  </span>
                </div>

                {/* SKU */}
                {item.sku && (
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.sku}
                  </p>
                )}

                {/* Info rows */}
                <div className="space-y-1.5 text-sm text-gray-600">
                  {/* Base price */}
                  {item.base_price != null && item.base_price > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <span>
                        {t("card.basePrice")}:{" "}
                        <span className="font-medium text-gray-900">
                          {formatCurrency(item.base_price)} VND
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Deposit */}
                  {item.deposit_type && item.deposit_type !== "no_deposit" && (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-orange-500 flex-shrink-0 text-xs font-bold">%</span>
                      <span>
                        {t("card.deposit")}:{" "}
                        <span className="font-medium text-gray-900">
                          {formatDepositDisplay(item)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom stats */}
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <div className="flex items-center gap-1.5">
                    <Tent className="w-4 h-4 text-blue-500" />
                    <div>
                      <span className="font-semibold text-gray-900">
                        {item.inventory_quantity === -1
                          ? "∞"
                          : t("card.slots", { count: item.inventory_quantity })}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {t("card.activeBookings", { count: item.active_bookings || 0 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Manage button */}
                {!isOperations && (
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => router.push(`/admin/zones/${zoneId}/items/${item.id}/edit`)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t("card.manage")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
