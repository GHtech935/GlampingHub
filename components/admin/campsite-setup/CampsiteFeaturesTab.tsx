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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { MultilingualInput, MultilingualValue } from "../MultilingualInput";
import { MultilingualTextarea } from "../MultilingualTextarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

interface Category {
  id: string;
  name: { vi: string; en: string };
  templates?: Template[];
}

interface Template {
  id: string;
  category_id: string;
  name: { vi: string; en: string };
  description?: { vi: string; en: string };
  icon?: string;
  sort_order: number;
  is_active: boolean;
  category_name?: { vi: string; en: string };
}

export function CampsiteFeaturesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<{
    name: MultilingualValue;
    description: MultilingualValue;
    categoryId: string;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
  }>({
    name: { vi: "", en: "" },
    description: { vi: "", en: "" },
    categoryId: "",
    icon: null,
    sortOrder: 0,
    isActive: true,
  });
  const t = useTranslations('admin.setupCommon.campsite.features');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/campsite-feature-templates-management?grouped=true");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error(t('messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (categoryId?: string) => {
    setEditingTemplate(null);
    setFormData({
      name: { vi: "", en: "" },
      description: { vi: "", en: "" },
      categoryId: categoryId || "",
      icon: null,
      sortOrder: 0,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || { vi: "", en: "" },
      categoryId: template.category_id,
      icon: null,
      sortOrder: template.sort_order,
      isActive: template.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name.vi || !formData.name.en || !formData.categoryId) {
        toast.error(t('messages.fillRequired'));
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description.vi || formData.description.en ? formData.description : null,
        categoryId: formData.categoryId,
        icon: formData.icon || null,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };

      const url = editingTemplate
        ? `/api/admin/campsite-feature-templates-management/${editingTemplate.id}`
        : "/api/admin/campsite-feature-templates-management";

      const response = await fetch(url, {
        method: editingTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingTemplate ? t('messages.updateSuccess') : t('messages.createSuccess'));
      setModalOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(t('messages.saveError'));
    }
  };

  const handleDelete = async (id: string) => {
    // Show confirmation dialog
    const result = await Swal.fire({
      title: t('messages.deleteConfirm'),
      text: 'Bạn có chắc chắn muốn xóa template này không?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/admin/campsite-feature-templates-management/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();

        // Show detailed error message
        await Swal.fire({
          icon: 'error',
          title: 'Không thể xóa template',
          text: error.error || 'Đã xảy ra lỗi khi xóa template',
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      toast.success(t('messages.deleteSuccess'));
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);

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

  const totalFeatures = categories.reduce((sum, cat) => sum + (cat.templates?.length || 0), 0);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">{t('title')}</h3>
            <p className="text-sm text-gray-500">
              {t('count', { count: totalFeatures })}
            </p>
          </div>
          <Button onClick={() => openCreateModal()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addButton')}
          </Button>
        </div>

        <Accordion type="multiple" className="w-full">
          {categories.map((category) => (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-medium">
                    {category.name.vi} / {category.name.en}
                  </span>
                  <span className="text-sm text-gray-500">
                    {category.templates?.length || 0}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCreateModal(category.id)}
                    className="mb-2"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('addToCategory')}
                  </Button>

                  {category.templates && category.templates.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('nameVi')}</TableHead>
                          <TableHead>{t('nameEn')}</TableHead>
                          <TableHead>{t('sortOrder')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                          <TableHead className="w-24">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.templates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell>{template.name.vi}</TableCell>
                            <TableCell>{template.name.en}</TableCell>
                            <TableCell>{template.sort_order}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  template.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {template.is_active ? t('active') : t('inactive')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(template)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(template.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-gray-500 pl-6">
                      {t('emptyCategory')}
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t('modal.editTitle') : t('modal.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('modal.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('modal.categoryLabel')} *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('modal.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name.vi} / {cat.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MultilingualInput
              label={t('modal.nameLabel')}
              value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })}
              placeholder={{ vi: t('modal.namePlaceholder.vi'), en: t('modal.namePlaceholder.en') }}
              required
            />

            <MultilingualTextarea
              label={t('modal.descriptionLabel')}
              value={formData.description}
              onChange={(val) => setFormData({ ...formData, description: val })}
              placeholder={{ vi: t('modal.descriptionPlaceholder.vi'), en: t('modal.descriptionPlaceholder.en') }}
            />

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
              {editingTemplate ? t('modal.update') : t('modal.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
