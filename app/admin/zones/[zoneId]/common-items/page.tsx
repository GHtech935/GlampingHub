"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, Package, Eye, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import CommonItemAppliedItemsModal from "@/components/admin/glamping/CommonItemAppliedItemsModal";

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
  addon_count: number;
  product_group_children_count: number;
  is_product_group_parent: boolean;
  product_group_parent_id: string | null;
}

function getItemTypeBadge(item: Item): { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } | null {
  const isChild = !!item.product_group_parent_id;
  const isParent = item.is_product_group_parent;
  const hasAddons = item.addon_count > 0;
  if (isParent) return { label: `Parent (${item.product_group_children_count})`, variant: 'destructive' };
  if (isChild && hasAddons) return { label: 'Child + Package', variant: 'secondary' };
  if (isChild) return { label: 'Child', variant: 'outline' };
  if (hasAddons) return { label: 'Package', variant: 'default' };
  return null;
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

export default function CommonItemsPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const router = useRouter();
  const { zoneId } = use(params);
  const { user } = useAuth();
  const t = useTranslations("admin.glamping.commonItems");
  const tc = useTranslations("admin.glamping.common");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showNoCategory, setShowNoCategory] = useState(false);
  const [appliedItemsModal, setAppliedItemsModal] = useState<{ open: boolean; itemId: string; itemName: string }>({ open: false, itemId: '', itemName: '' });

  const categories = useMemo(() => {
    const names = [...new Set(items.map(i => i.category_name).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Check if user is operations role (read-only)
  const isOperations = user?.type === 'staff' && (user as any).role === 'operations';

  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/common-items");
      return;
    }
    fetchItems();
  }, [zoneId, showNoCategory]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      let url = `/api/admin/glamping/items?zone_id=${zoneId}`;
      if (showNoCategory) {
        url += '&no_category=true&is_tent=false';
      } else {
        url += '&is_tent_category=false';
      }
      const response = await fetch(url);
      const data = await response.json();

      if (data.items) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch common items:", error);
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
    const matchesCategory =
      categoryFilter === 'all' || item.category_name === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        {!isOperations && (
          <Button onClick={() => router.push(`/admin/zones/${zoneId}/common-items/new`)}>
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("filters.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* No Category Checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="noCategory"
            checked={showNoCategory}
            onCheckedChange={(checked) => setShowNoCategory(checked === true)}
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

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.sku")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead>{t("table.price")}</TableHead>
              <TableHead>{t("table.inventory")}</TableHead>
              <TableHead>{t("table.visibility")}</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <div className="text-gray-500">{tc("noData")}</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {!item.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          {t('status.inactive')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.sku || "-"}</TableCell>
                  <TableCell>{item.category_name || "-"}</TableCell>
                  <TableCell>
                    {item.base_price != null && item.base_price > 0
                      ? `${formatCurrency(item.base_price)} VND`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {item.inventory_quantity === -1 ? (
                      <Badge variant="outline">{t("table.unlimited")}</Badge>
                    ) : (
                      item.inventory_quantity
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === "available" ? "default" : "secondary"}
                    >
                      {t(`status.${item.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const typeBadge = getItemTypeBadge(item);
                      return typeBadge ? (
                        <Badge variant={typeBadge.variant} className="text-xs">
                          {typeBadge.label}
                        </Badge>
                      ) : null;
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isOperations && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t("appliedItems.title")}
                          onClick={() => setAppliedItemsModal({ open: true, itemId: item.id, itemName: item.name })}
                        >
                          <Link2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/zones/${zoneId}/common-items/${item.id}/edit`)
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CommonItemAppliedItemsModal
        open={appliedItemsModal.open}
        onOpenChange={(open) => setAppliedItemsModal(prev => ({ ...prev, open }))}
        zoneId={zoneId}
        commonItemId={appliedItemsModal.itemId}
        commonItemName={appliedItemsModal.itemName}
      />
    </div>
  );
}
