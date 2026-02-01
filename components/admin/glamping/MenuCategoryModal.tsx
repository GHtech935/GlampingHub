"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface MenuCategory {
  id: string;
  zone_id: string;
  name: { vi: string; en: string };
  description?: { vi: string; en: string };
  weight: number;
  status: string;
  is_tent_category?: boolean;
}

interface MenuCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneId: string;
}

export function MenuCategoryModal({
  open,
  onOpenChange,
  zoneId,
}: MenuCategoryModalProps) {
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.menuCategories");
  const tc = useTranslations("admin.glamping.common");

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nameVi: "",
    nameEn: "",
    descriptionVi: "",
    descriptionEn: "",
    weight: 0,
    status: "active",
    is_tent_category: true,
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, zoneId]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/glamping/menu-categories?zone_id=${zoneId}`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nameVi: "",
      nameEn: "",
      descriptionVi: "",
      descriptionEn: "",
      weight: 0,
      status: "active",
      is_tent_category: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (category: MenuCategory) => {
    setFormData({
      nameVi: category.name.vi || "",
      nameEn: category.name.en || "",
      descriptionVi: category.description?.vi || "",
      descriptionEn: category.description?.en || "",
      weight: category.weight,
      status: category.status,
      is_tent_category: category.is_tent_category !== false,
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nameVi || !formData.nameEn) {
      toast({
        title: tc("error"),
        description: t("nameRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        zone_id: zoneId,
        name: {
          vi: formData.nameVi,
          en: formData.nameEn,
        },
        description: {
          vi: formData.descriptionVi,
          en: formData.descriptionEn,
        },
        weight: formData.weight,
        status: formData.status,
        is_tent_category: formData.is_tent_category,
      };

      const url = editingId
        ? `/api/admin/glamping/menu-categories/${editingId}`
        : `/api/admin/glamping/menu-categories`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save category");
      }

      toast({
        title: tc("success"),
        description: editingId ? t("updateSuccess") : t("createSuccess"),
      });

      resetForm();
      fetchCategories();
    } catch (error) {
      console.error("Failed to save category:", error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/glamping/menu-categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete category");
      }

      toast({
        title: tc("success"),
        description: t("deleteSuccess"),
      });

      fetchCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Category Button */}
          {!showForm && (
            <div className="flex justify-end">
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                {t("addCategory")}
              </Button>
            </div>
          )}

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {editingId ? t("editCategory") : t("newCategory")}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nameVi">{t("nameVi")} *</Label>
                  <Input
                    id="nameVi"
                    value={formData.nameVi}
                    onChange={(e) =>
                      setFormData({ ...formData, nameVi: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nameEn">{t("nameEn")} *</Label>
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="descriptionVi">{t("descriptionVi")}</Label>
                  <Input
                    id="descriptionVi"
                    value={formData.descriptionVi}
                    onChange={(e) =>
                      setFormData({ ...formData, descriptionVi: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="descriptionEn">{t("descriptionEn")}</Label>
                  <Input
                    id="descriptionEn"
                    value={formData.descriptionEn}
                    onChange={(e) =>
                      setFormData({ ...formData, descriptionEn: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">{t("weight")}</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="status">{t("status")}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("statusActive")}</SelectItem>
                      <SelectItem value="hidden">{t("statusHidden")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="is_tent_category"
                  checked={formData.is_tent_category}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_tent_category: checked as boolean })
                  }
                />
                <Label htmlFor="is_tent_category" className="font-normal cursor-pointer">
                  {t("isTentCategory")}
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                {t("isTentCategoryHelp")}
              </p>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t("cancel")}
                </Button>
                <Button type="submit">
                  {editingId ? t("update") : t("create")}
                </Button>
              </div>
            </form>
          )}

          {/* Categories List */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nameLabel")}</TableHead>
                  <TableHead>{t("descriptionVi")}</TableHead>
                  <TableHead className="text-center">{t("weight")}</TableHead>
                  <TableHead className="text-center">{t("status")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {tc("loading")}
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {t("noCategories")}
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{category.name.vi}</div>
                          <div className="text-xs text-gray-500">{category.name.en}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {category.description?.vi || '-'}
                      </TableCell>
                      <TableCell className="text-center">{category.weight}</TableCell>
                      <TableCell className="text-center">
                        {category.status === "active" ? (
                          <Badge variant="success">{t("statusActive")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("statusHidden")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
