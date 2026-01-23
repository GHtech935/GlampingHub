"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Save, X, GripVertical } from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";

interface Category {
  id: string;
  name: { vi: string; en: string };
  description: { vi: string; en: string } | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChange: () => void;
}

export function CategoryManagementModal({
  isOpen,
  onClose,
  onCategoryChange,
}: CategoryManagementModalProps) {
  const t = useTranslations("admin.categoryModal");
  const locale = useLocale() as "vi" | "en";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: { vi: "", en: "" },
    description: { vi: "", en: "" },
    sortOrder: 0,
  });

  // Helper to get localized text
  const getLocalizedText = (text: any): string => {
    if (typeof text === "string") return text;
    if (!text) return "";
    return text[locale] || text.vi || text.en || "";
  };

  // Fetch categories on open
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/admin/product-categories?includeInactive=true"
      );
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error(t("fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: { vi: "", en: "" },
      description: { vi: "", en: "" },
      sortOrder: categories.length + 1,
    });
    setEditingId(null);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({
      name: { vi: "", en: "" },
      description: { vi: "", en: "" },
      sortOrder: categories.length + 1,
    });
  };

  const handleEdit = (category: Category) => {
    setIsAddingNew(false);
    setEditingId(category.id);
    setFormData({
      name: category.name || { vi: "", en: "" },
      description: category.description || { vi: "", en: "" },
      sortOrder: category.sort_order,
    });
  };

  const handleSave = async () => {
    // Validate
    if (!formData.name.vi && !formData.name.en) {
      toast.error(t("nameRequired"));
      return;
    }

    try {
      setLoading(true);

      if (isAddingNew) {
        // Create new category
        const response = await fetch("/api/admin/product-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description:
              formData.description.vi || formData.description.en
                ? formData.description
                : null,
            sortOrder: formData.sortOrder,
          }),
        });

        if (!response.ok) throw new Error("Failed to create category");

        toast.success(t("createSuccess"));
      } else if (editingId) {
        // Update existing category
        const response = await fetch(
          `/api/admin/product-categories/${editingId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.name,
              description:
                formData.description.vi || formData.description.en
                  ? formData.description
                  : null,
              sortOrder: formData.sortOrder,
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to update category");

        toast.success(t("updateSuccess"));
      }

      resetForm();
      fetchCategories();
      onCategoryChange();
    } catch (error) {
      console.error("Failed to save category:", error);
      toast.error(t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const result = await Swal.fire({
      title: t("confirmDelete"),
      text: t("confirmDeleteText", { name: getLocalizedText(category.name) }),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: t("delete"),
      cancelButtonText: t("cancel"),
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/product-categories/${category.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete category");

      const data = await response.json();

      if (data.softDeleted) {
        toast.success(t("deactivated", { count: data.productsUsingCategory }));
      } else {
        toast.success(t("deleteSuccess"));
      }

      fetchCategories();
      onCategoryChange();
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error(t("deleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Button */}
          {!isAddingNew && !editingId && (
            <Button onClick={handleAddNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("addNew")}
            </Button>
          )}

          {/* Add/Edit Form */}
          {(isAddingNew || editingId) && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">
                    {t("nameVi")} *
                  </Label>
                  <Input
                    value={formData.name.vi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name, vi: e.target.value },
                      })
                    }
                    placeholder={t("namePlaceholderVi")}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{t("nameEn")}</Label>
                  <Input
                    value={formData.name.en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name, en: e.target.value },
                      })
                    }
                    placeholder={t("namePlaceholderEn")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">
                    {t("descriptionVi")}
                  </Label>
                  <Input
                    value={formData.description.vi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: {
                          ...formData.description,
                          vi: e.target.value,
                        },
                      })
                    }
                    placeholder={t("descriptionPlaceholderVi")}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">
                    {t("descriptionEn")}
                  </Label>
                  <Input
                    value={formData.description.en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: {
                          ...formData.description,
                          en: e.target.value,
                        },
                      })
                    }
                    placeholder={t("descriptionPlaceholderEn")}
                  />
                </div>
              </div>

              <div className="w-32">
                <Label className="text-xs text-gray-500">{t("sortOrder")}</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t("cancel")}
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4 mr-1" />
                  {loading ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("nameVi")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("nameEn")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("sortOrder")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("status")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t("loading")}
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t("noCategories")}
                    </td>
                  </tr>
                ) : (
                  categories.map((category, index) => (
                    <tr
                      key={category.id}
                      className={`hover:bg-gray-50 ${
                        !category.is_active ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {category.name?.vi || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {category.name?.en || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {category.sort_order}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {category.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {t("active")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {t("inactive")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(category)}
                            disabled={loading || editingId === category.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(category)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
