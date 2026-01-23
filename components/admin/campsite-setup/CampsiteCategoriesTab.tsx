"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { MultilingualInput, MultilingualValue } from "../MultilingualInput";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

interface CampsiteFeatureCategory {
  id: string;
  name: { vi: string; en: string };
  slug: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
}

export function CampsiteCategoriesTab() {
  const [categories, setCategories] = useState<CampsiteFeatureCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CampsiteFeatureCategory | null>(null);
  const [formData, setFormData] = useState<{
    name: MultilingualValue;
    slug: string;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
  }>({
    name: { vi: "", en: "" },
    slug: "",
    icon: null,
    sortOrder: 0,
    isActive: true,
  });
  const t = useTranslations('admin.setupCommon.campsite.categories');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/campsite-feature-categories");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error(t('messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: { vi: "", en: "" },
      slug: "",
      icon: null,
      sortOrder: 0,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (category: CampsiteFeatureCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: null,
      sortOrder: category.sort_order,
      isActive: category.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name.vi || !formData.name.en || !formData.slug) {
        toast.error(t('messages.fillRequired'));
        return;
      }

      const payload = {
        name: formData.name,
        slug: formData.slug,
        icon: formData.icon || null,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };

      const url = editingCategory
        ? `/api/admin/campsite-feature-categories/${editingCategory.id}`
        : "/api/admin/campsite-feature-categories";

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      toast.success(editingCategory ? t('messages.updateSuccess') : t('messages.createSuccess'));
      setModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || t('messages.saveError'));
    }
  };

  const handleDelete = async (id: string) => {
    // Show confirmation dialog
    const result = await Swal.fire({
      title: t('messages.deleteConfirm'),
      text: 'Bạn có chắc chắn muốn xóa danh mục này không?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/admin/campsite-feature-categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();

        // Show detailed error message
        await Swal.fire({
          icon: 'error',
          title: 'Không thể xóa danh mục',
          html: error.error === 'Cannot delete category with 1 associated templates'
            ? 'Danh mục này đang được sử dụng bởi <strong>1 template</strong>.<br><br>Vui lòng xóa hoặc thay đổi category của template trước khi xóa danh mục này.'
            : error.error?.includes('associated templates')
            ? `Danh mục này đang được sử dụng bởi các template.<br><br>Vui lòng xóa hoặc thay đổi category của các template trước khi xóa danh mục này.<br><br><small>${error.error}</small>`
            : error.error || 'Đã xảy ra lỗi khi xóa danh mục',
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      toast.success(t('messages.deleteSuccess'));
      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);

      // Show error dialog
      await Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error.message || t('messages.deleteError'),
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">{t('title')}</h3>
            <p className="text-sm text-gray-500">{t('count', { count: categories.length })}</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addButton')}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('nameVi')}</TableHead>
              <TableHead>{t('nameEn')}</TableHead>
              <TableHead>{t('slug')}</TableHead>
              <TableHead>{t('sortOrder')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className="w-32">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name.vi}</TableCell>
                <TableCell>{category.name.en}</TableCell>
                <TableCell><code className="text-xs">{category.slug}</code></TableCell>
                <TableCell>{category.sort_order}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      category.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {category.is_active ? t('active') : t('inactive')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(category)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('modal.editTitle') : t('modal.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('modal.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <MultilingualInput
              label={t('modal.nameLabel')}
              value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })}
              placeholder={{ vi: t('modal.namePlaceholder.vi'), en: t('modal.namePlaceholder.en') }}
              required
            />

            <div className="space-y-2">
              <Label htmlFor="slug">{t('modal.slugLabel')} *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder={t('modal.slugPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">{t('modal.sortOrderLabel')}</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">{t('modal.activeLabel')}</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t('modal.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {editingCategory ? t('modal.update') : t('modal.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
