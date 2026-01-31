"use client";

import { use, useEffect, useState } from "react";
import { Plus, Search, Edit, Tent, ImageOff, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Item {
  id: string;
  name: string;
  sku: string;
  category_name: string;
  inventory_quantity: number;
  status: string;
  visibility: string;
  image_url: string | null;
  base_price: number | null;
  active_bookings: number;
  deposit_type: string;
  deposit_value: number;
  is_active: boolean;
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

export default function ItemsPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const router = useRouter();
  const { zoneId } = use(params);
  const t = useTranslations("admin.glamping.items");
  const tc = useTranslations("admin.glamping.common");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  useEffect(() => {
    if (zoneId !== "all") {
      fetchItems();
    }
  }, [zoneId]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/items?zone_id=${zoneId}`);
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

    return matchesSearch && matchesStatus;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => router.push(`/admin/zones/${zoneId}/items/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("addNew")}
        </Button>
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
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Name */}
                <h3 className="font-semibold text-lg text-gray-900 leading-tight line-clamp-1">
                  {item.name}
                </h3>

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
                  {item.deposit_type && item.deposit_type !== "system_default" && (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-orange-500 flex-shrink-0 text-xs font-bold">%</span>
                      <span>
                        {t("card.deposit")}:{" "}
                        <span className="font-medium text-gray-900">
                          {item.deposit_type === "custom_percentage"
                            ? `${item.deposit_value}%`
                            : `${formatCurrency(item.deposit_value)} VND`}
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
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => router.push(`/admin/zones/${zoneId}/items/${item.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t("card.manage")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
