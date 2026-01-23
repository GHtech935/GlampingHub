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
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

interface GroundTypeTemplate {
  id: string;
  name: { vi: string; en: string };
  is_active: boolean;
  sort_order: number;
}

export function GroundTypesTab() {
  const t = useTranslations('admin.setupCommonPitch.groundTypesTab');
  const [templates, setTemplates] = useState<GroundTypeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GroundTypeTemplate | null>(null);
  const [formData, setFormData] = useState({
    nameVi: "",
    nameEn: "",
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/ground-type-templates");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching ground type templates:", error);
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
      isActive: true,
      sortOrder: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (template: GroundTypeTemplate) => {
    setEditingTemplate(template);
    setFormData({
      nameVi: template.name.vi,
      nameEn: template.name.en,
      isActive: template.is_active,
      sortOrder: template.sort_order,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.nameVi || !formData.nameEn) {
        toast.error(t('messages.nameRequired'));
        return;
      }

      const payload = {
        name: {
          vi: formData.nameVi,
          en: formData.nameEn,
        },
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      const url = editingTemplate
        ? `/api/admin/ground-type-templates/${editingTemplate.id}`
        : "/api/admin/ground-type-templates";

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
      text: 'Bạn có chắc chắn muốn xóa ground type này không?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/admin/ground-type-templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();

        // Show detailed error message
        await Swal.fire({
          icon: 'error',
          title: 'Không thể xóa ground type',
          text: error.error || 'Đã xảy ra lỗi khi xóa ground type',
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

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">{t('title')}</h3>
            <p className="text-sm text-gray-500">{templates.length} {t('count')}</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addButton')}
          </Button>
        </div>

        {/* Table */}
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('nameVi')}</TableHead>
                <TableHead>{t('nameEn')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="w-24">{t('sortOrder')}</TableHead>
                <TableHead className="w-32">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.name.vi}</TableCell>
                  <TableCell>{template.name.en}</TableCell>
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
                  <TableCell>{template.sort_order}</TableCell>
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
      </CardContent>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t('modal.editTitle') : t('modal.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('modal.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name Vi */}
            <div className="space-y-2">
              <Label htmlFor="nameVi">{t('modal.nameLabel')} (Tiếng Việt) *</Label>
              <Input
                id="nameVi"
                value={formData.nameVi}
                onChange={(e) =>
                  setFormData({ ...formData, nameVi: e.target.value })
                }
                placeholder={t('modal.namePlaceholder.vi')}
              />
            </div>

            {/* Name En */}
            <div className="space-y-2">
              <Label htmlFor="nameEn">{t('modal.nameLabel')} (English) *</Label>
              <Input
                id="nameEn"
                value={formData.nameEn}
                onChange={(e) =>
                  setFormData({ ...formData, nameEn: e.target.value })
                }
                placeholder={t('modal.namePlaceholder.en')}
              />
            </div>

            {/* Sort Order */}
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

            {/* Active Switch */}
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
