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
import { MultilingualInput } from "@/components/admin/MultilingualInput";
import { MultilingualTextarea } from "@/components/admin/MultilingualTextarea";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

interface FeatureTemplate {
  id: string;
  name: { vi: string; en: string };
  value?: { vi: string; en: string };
  warning?: { vi: string; en: string };
  is_active: boolean;
  sort_order: number;
}

export function FeatureTemplatesTab() {
  const t = useTranslations('admin.setupCommonPitch.featureTemplatesTab');
  const [templates, setTemplates] = useState<FeatureTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeatureTemplate | null>(null);
  const [formData, setFormData] = useState({
    nameVi: "",
    nameEn: "",
    valueVi: "",
    valueEn: "",
    warningVi: "",
    warningEn: "",
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/feature-templates");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching feature templates:", error);
      toast.error(t('messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      nameVi: "",
      nameEn: "",
      valueVi: "",
      valueEn: "",
      warningVi: "",
      warningEn: "",
      isActive: true,
      sortOrder: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (template: FeatureTemplate) => {
    setEditingTemplate(template);
    setFormData({
      nameVi: template.name.vi,
      nameEn: template.name.en,
      valueVi: template.value?.vi || "",
      valueEn: template.value?.en || "",
      warningVi: template.warning?.vi || "",
      warningEn: template.warning?.en || "",
      isActive: template.is_active,
      sortOrder: template.sort_order,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nameVi || !formData.nameEn) {
      toast.error(t('messages.nameRequired'));
      return;
    }

    try {
      const payload = {
        name: { vi: formData.nameVi, en: formData.nameEn },
        value:
          formData.valueVi || formData.valueEn
            ? { vi: formData.valueVi, en: formData.valueEn }
            : undefined,
        warning:
          formData.warningVi || formData.warningEn
            ? { vi: formData.warningVi, en: formData.warningEn }
            : undefined,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      const url = editingTemplate
        ? `/api/admin/feature-templates/${editingTemplate.id}`
        : "/api/admin/feature-templates";

      const response = await fetch(url, {
        method: editingTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(
        editingTemplate ? t('messages.updateSuccess') : t('messages.createSuccess')
      );
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
      const response = await fetch(`/api/admin/feature-templates/${id}`, {
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
    return <div className="flex justify-center p-8">{t('loading')}</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">{t('title')}</h3>
            <p className="text-sm text-gray-500">
              {templates.length} {t('count')}
            </p>
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
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('sortOrder')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name.vi}</TableCell>
                <TableCell>{template.name.en}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      template.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {template.is_active ? t('active') : t('inactive')}
                  </span>
                </TableCell>
                <TableCell>{template.sort_order}</TableCell>
                <TableCell className="text-right space-x-2">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? t('modal.editTitle') : t('modal.createTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('modal.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <MultilingualInput
                label={t('modal.nameLabel')}
                value={{ vi: formData.nameVi, en: formData.nameEn }}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    nameVi: val.vi,
                    nameEn: val.en,
                  })
                }
                placeholder={{
                  vi: t('modal.namePlaceholder.vi'),
                  en: t('modal.namePlaceholder.en'),
                }}
                required
              />

              <div>
                <MultilingualTextarea
                  label={t('modal.valueLabel')}
                  value={{ vi: formData.valueVi, en: formData.valueEn }}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      valueVi: val.vi,
                      valueEn: val.en,
                    })
                  }
                  placeholder={{
                    vi: t('modal.valuePlaceholder.vi'),
                    en: t('modal.valuePlaceholder.en'),
                  }}
                  rows={2}
                  requiredLocales={[]}
                />
              </div>

              <div>
                <MultilingualTextarea
                  label={t('modal.warningLabel')}
                  value={{ vi: formData.warningVi, en: formData.warningEn }}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      warningVi: val.vi,
                      warningEn: val.en,
                    })
                  }
                  placeholder={{
                    vi: t('modal.warningPlaceholder.vi'),
                    en: t('modal.warningPlaceholder.en'),
                  }}
                  rows={2}
                  requiredLocales={[]}
                />
              </div>

              <div>
                <Label htmlFor="sortOrder">{t('modal.sortOrderLabel')}</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) })
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
              <Button onClick={handleSubmit}>
                {editingTemplate ? t('modal.update') : t('modal.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
