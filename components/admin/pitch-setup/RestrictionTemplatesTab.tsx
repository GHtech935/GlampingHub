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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

interface RestrictionTemplate {
  id: string;
  restriction: { vi: string; en: string };
  is_active: boolean;
  sort_order: number;
}

export function RestrictionTemplatesTab() {
  const t = useTranslations('admin.setupCommonPitch.restrictionTemplatesTab');
  const [templates, setTemplates] = useState<RestrictionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RestrictionTemplate | null>(null);
  const [formData, setFormData] = useState({
    restrictionVi: "",
    restrictionEn: "",
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/restriction-templates");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching restriction templates:", error);
      toast.error(t('messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({ restrictionVi: "", restrictionEn: "", isActive: true, sortOrder: 0 });
    setModalOpen(true);
  };

  const openEditModal = (template: RestrictionTemplate) => {
    setEditingTemplate(template);
    setFormData({
      restrictionVi: template.restriction.vi,
      restrictionEn: template.restriction.en,
      isActive: template.is_active,
      sortOrder: template.sort_order,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.restrictionVi || !formData.restrictionEn) {
      toast.error(t('messages.contentRequired'));
      return;
    }

    try {
      const payload = {
        restriction: { vi: formData.restrictionVi, en: formData.restrictionEn },
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      const url = editingTemplate
        ? `/api/admin/restriction-templates/${editingTemplate.id}`
        : "/api/admin/restriction-templates";

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
      const response = await fetch(`/api/admin/restriction-templates/${id}`, {
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
              <TableHead>{t('contentVi')}</TableHead>
              <TableHead>{t('contentEn')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('sortOrder')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium max-w-xs truncate">
                  {template.restriction.vi}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {template.restriction.en}
                </TableCell>
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
              <div>
                <Label htmlFor="restrictionVi">{t('modal.contentViLabel')}</Label>
                <Textarea
                  id="restrictionVi"
                  value={formData.restrictionVi}
                  onChange={(e) =>
                    setFormData({ ...formData, restrictionVi: e.target.value })
                  }
                  placeholder={t('modal.contentViPlaceholder')}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="restrictionEn">{t('modal.contentEnLabel')}</Label>
                <Textarea
                  id="restrictionEn"
                  value={formData.restrictionEn}
                  onChange={(e) =>
                    setFormData({ ...formData, restrictionEn: e.target.value })
                  }
                  placeholder={t('modal.contentEnPlaceholder')}
                  rows={2}
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
