"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowUpDown, Edit, Trash, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MenuFormModal } from "@/components/admin/glamping/MenuFormModal";
import { MenuCategoryModal } from "@/components/admin/glamping/MenuCategoryModal";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface MenuItem {
  id: string;
  name: { vi: string; en: string };
  description?: { vi: string; en: string };
  category?: { vi: string; en: string };
  category_id?: string;
  category_name?: { vi: string; en: string };
  unit: { vi: string; en: string };
  price: number;
  tax_rate: number;
  is_available: boolean;
  max_quantity: number;
  requires_advance_booking: boolean;
  advance_hours: number;
  image_url?: string;
  weight: number;
  status: string;
}

export default function MenuPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.menu");
  const tc = useTranslations("admin.glamping.common");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<'name' | 'price' | 'weight'>('weight');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editData, setEditData] = useState<MenuItem | undefined>(undefined);

  // Redirect to dashboard if "all" zones selected
  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  useEffect(() => {
    if (zoneId !== "all") {
      fetchMenuItems();
    }
  }, [zoneId]);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/menu?zone_id=${zoneId}`);
      const data = await response.json();
      setMenuItems(data.menuItems || []);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: 'name' | 'price' | 'weight') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditData(item);
    setShowFormModal(true);
  };

  const handleCreate = () => {
    setEditData(undefined);
    setShowFormModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm(t("deleteConfirm"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/glamping/menu/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete menu item');
      }

      toast({
        title: tc("success"),
        description: t("deleteSuccess"),
      });

      fetchMenuItems();
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    }
  };

  // Get unique categories for filter
  const categories = Array.from(
    new Set(
      menuItems
        .map(item => item.category_name?.vi || '')
        .filter(cat => cat !== '')
    )
  );

  // Apply filters and search
  const filteredMenuItems = menuItems.filter(item => {
    // Status filter
    if (filterStatus !== "all" && item.status !== filterStatus) return false;

    // Availability filter
    if (filterAvailability === "available" && !item.is_available) return false;
    if (filterAvailability === "unavailable" && item.is_available) return false;

    // Category filter
    if (filterCategory !== "all" && item.category_name?.vi !== filterCategory) return false;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameVi = item.name?.vi?.toLowerCase() || '';
      const nameEn = item.name?.en?.toLowerCase() || '';
      const categoryVi = item.category_name?.vi?.toLowerCase() || '';
      const categoryEn = item.category_name?.en?.toLowerCase() || '';

      if (!nameVi.includes(query) && !nameEn.includes(query) &&
          !categoryVi.includes(query) && !categoryEn.includes(query)) {
        return false;
      }
    }

    return true;
  });

  // Apply sorting
  const sortedMenuItems = [...filteredMenuItems].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    if (sortField === 'name') {
      const nameA = a.name?.vi || a.name?.en || '';
      const nameB = b.name?.vi || b.name?.en || '';
      return multiplier * nameA.localeCompare(nameB);
    } else if (sortField === 'price') {
      return multiplier * (a.price - b.price);
    } else {
      return multiplier * (a.weight - b.weight);
    }
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Category
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addNew")}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={t("search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAvailability} onValueChange={setFilterAvailability}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Availability</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>

        {categories.length > 0 && (
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-24">Image</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  {t("table.name")}
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('price')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  {t("table.price")}
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead className="text-center">{t("table.status")}</TableHead>
              <TableHead className="text-center">{t("table.available")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {tc("loading")}
                </TableCell>
              </TableRow>
            ) : sortedMenuItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            ) : (
              sortedMenuItems.map((item, index) => (
                <TableRow key={item.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                  <TableCell>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name?.vi || item.name?.en}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.name?.vi || item.name?.en}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {item.category_name?.vi || item.category_name?.en || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(item.price)}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.status === 'active' ? (
                      <Badge variant="success">{t("status.active")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("status.hidden")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.is_available ? (
                      <Badge variant="success">{t("availability.available")}</Badge>
                    ) : (
                      <Badge variant="destructive">{t("availability.unavailable")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Modal */}
      <MenuFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={fetchMenuItems}
        zoneId={zoneId}
        editData={editData}
      />

      {/* Category Modal */}
      <MenuCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        zoneId={zoneId}
      />
    </div>
  );
}
