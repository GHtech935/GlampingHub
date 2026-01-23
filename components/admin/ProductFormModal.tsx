"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "react-hot-toast";
import { Product } from "./ProductsTable";
import { useTranslations, useLocale } from "next-intl";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

interface Campsite {
  id: string;
  name: any;
}

interface Category {
  id: string;
  name: { vi: string; en: string };
  is_active: boolean;
}

interface MultilingualText {
  vi: string;
  en: string;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductFormModalProps) {
  const t = useTranslations("admin.productFormModal");
  const locale = useLocale() as "vi" | "en";
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper to get localized text
  const getLocalizedText = (text: any): string => {
    if (typeof text === "string") return text;
    if (!text) return "";
    return text[locale] || text.vi || text.en || "";
  };

  const [formData, setFormData] = useState({
    campsiteId: "",
    categoryId: "",
    name: { vi: "", en: "" } as MultilingualText,
    description: { vi: "", en: "" } as MultilingualText,
    price: undefined as number | undefined,
    unit: { vi: "sản phẩm", en: "item" } as MultilingualText,
    taxRate: "0",
    isAvailable: true,
    maxQuantity: "10",
    stock: "" as string, // Empty = unlimited (NULL), otherwise number
    requiresAdvanceBooking: false,
    advanceHours: "0",
    sortOrder: "0",
  });

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      fetchCampsites();
      fetchCategories();
    }
  }, [isOpen]);

  // Pre-fill form if editing
  useEffect(() => {
    if (product) {
      // Convert name/description/unit to MultilingualText format
      // Note: typeof null === "object" in JavaScript, so we need to check for null explicitly
      const nameData =
        typeof product.name === "object" && product.name !== null
          ? product.name
          : { vi: product.name || "", en: product.name || "" };
      const descData =
        typeof product.description === "object" && product.description !== null
          ? product.description
          : { vi: product.description || "", en: product.description || "" };
      const unitData =
        typeof product.unit === "object" && product.unit !== null
          ? product.unit
          : { vi: product.unit || "sản phẩm", en: product.unit || "item" };

      setFormData({
        campsiteId: product.campsite?.id || "",
        categoryId: product.category?.id || "",
        name: nameData as MultilingualText,
        description: descData as MultilingualText,
        price: product.price,
        unit: unitData as MultilingualText,
        taxRate: product.taxRate?.toString() || "0",
        isAvailable: product.isAvailable,
        maxQuantity: product.maxQuantity?.toString() || "10",
        stock: product.stock !== null && product.stock !== undefined ? product.stock.toString() : "",
        requiresAdvanceBooking: product.requiresAdvanceBooking,
        advanceHours: product.advanceHours?.toString() || "0",
        sortOrder: product.sortOrder?.toString() || "0",
      });
    } else {
      // Reset form for new product
      setFormData({
        campsiteId: "",
        categoryId: "",
        name: { vi: "", en: "" },
        description: { vi: "", en: "" },
        price: undefined,
        unit: { vi: "sản phẩm", en: "item" },
        taxRate: "0",
        isAvailable: true,
        maxQuantity: "10",
        stock: "",
        requiresAdvanceBooking: false,
        advanceHours: "0",
        sortOrder: "0",
      });
    }
  }, [product, isOpen]);

  const fetchCampsites = async () => {
    try {
      const response = await fetch("/api/admin/campsites");
      const result = await response.json();
      const campsitesData = Array.isArray(result)
        ? result
        : result.campsites || result.data || [];
      setCampsites(campsitesData);
    } catch (error) {
      console.error("Failed to fetch campsites:", error);
      toast.error(t("loadCampsitesFailed"));
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/product-categories");
      const result = await response.json();
      if (Array.isArray(result)) {
        setCategories(result);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - now requires campsiteId instead of pitchId
    if (
      !formData.campsiteId ||
      (!formData.name.vi && !formData.name.en) ||
      formData.price === undefined
    ) {
      toast.error(t("fillRequired"));
      return;
    }

    // Validate tax rate
    const taxRateNum = parseFloat(formData.taxRate);
    if (isNaN(taxRateNum) || taxRateNum < 0 || taxRateNum > 100) {
      toast.error(t("taxRateInvalid"));
      return;
    }

    try {
      setLoading(true);

      const payload = {
        campsiteId: formData.campsiteId,
        categoryId: formData.categoryId || null,
        name: formData.name,
        description:
          formData.description.vi || formData.description.en
            ? formData.description
            : null,
        price: formData.price,
        unit: formData.unit,
        taxRate: parseFloat(formData.taxRate),
        isAvailable: formData.isAvailable,
        maxQuantity: parseInt(formData.maxQuantity),
        stock: formData.stock === "" ? null : parseInt(formData.stock),
        requiresAdvanceBooking: formData.requiresAdvanceBooking,
        advanceHours: parseInt(formData.advanceHours),
        sortOrder: parseInt(formData.sortOrder),
      };

      const url = product
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products";
      const method = product ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      toast.success(product ? t("updateSuccess") : t("createSuccess"));
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error(t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {product ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
          {/* Campsite Selection - Now full width since pitch is removed */}
          <div>
            <Label htmlFor="campsiteId">
              {t("campsite")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.campsiteId}
              onValueChange={(value) =>
                setFormData({ ...formData, campsiteId: value })
              }
            >
              <SelectTrigger id="campsiteId">
                <SelectValue placeholder={t("selectCampsite")} />
              </SelectTrigger>
              <SelectContent>
                {campsites.map((campsite) => (
                  <SelectItem key={campsite.id} value={campsite.id}>
                    {getLocalizedText(campsite.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Selection */}
          <div>
            <Label htmlFor="categoryId">{t("category")}</Label>
            <Select
              value={formData.categoryId || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: value === "none" ? "" : value })
              }
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder={t("selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noCategory")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {getLocalizedText(category.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Name - Multilingual */}
          <div className="space-y-2">
            <Label>
              {t("name")} <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Tiếng Việt</div>
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
                <div className="text-xs text-gray-500 mb-1">English</div>
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
          </div>

          {/* Description - Multilingual */}
          <div className="space-y-2">
            <Label>{t("description")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Tiếng Việt</div>
                <Textarea
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
                  rows={2}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">English</div>
                <Textarea
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
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Price and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">
                {t("price")} <span className="text-red-500">*</span>
              </Label>
              <CurrencyInput
                id="price"
                value={formData.price}
                onValueChange={(value) =>
                  setFormData({ ...formData, price: value })
                }
                placeholder="0"
                minValue={0}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("unit")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Tiếng Việt</div>
                  <Input
                    value={formData.unit.vi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit: { ...formData.unit, vi: e.target.value },
                      })
                    }
                    placeholder="sản phẩm"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">English</div>
                  <Input
                    value={formData.unit.en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit: { ...formData.unit, en: e.target.value },
                      })
                    }
                    placeholder="item"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tax Configuration */}
          <div>
            <Label htmlFor="taxRate">{t("taxRate")}</Label>
            <Input
              id="taxRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.taxRate}
              onChange={(e) =>
                setFormData({ ...formData, taxRate: e.target.value })
              }
              placeholder="0"
            />
          </div>

          {/* Stock Management */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="maxQuantity">{t("maxQuantity")}</Label>
              <Input
                id="maxQuantity"
                type="number"
                min="1"
                value={formData.maxQuantity}
                onChange={(e) =>
                  setFormData({ ...formData, maxQuantity: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="stock">{t("stock")}</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                placeholder={t("stockPlaceholder")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("stockHint")}
              </p>
            </div>
            <div>
              <Label htmlFor="sortOrder">{t("sortOrder")}</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: e.target.value })
                }
              />
            </div>
          </div>

          {/* Advance Booking */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                id="requiresAdvanceBooking"
                checked={formData.requiresAdvanceBooking}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresAdvanceBooking: checked })
                }
              />
              <Label htmlFor="requiresAdvanceBooking">
                {t("requiresAdvanceBooking")}
              </Label>
            </div>

            {formData.requiresAdvanceBooking && (
              <div>
                <Label htmlFor="advanceHours">{t("advanceHours")}</Label>
                <Input
                  id="advanceHours"
                  type="number"
                  min="0"
                  value={formData.advanceHours}
                  onChange={(e) =>
                    setFormData({ ...formData, advanceHours: e.target.value })
                  }
                  placeholder={t("advanceHoursPlaceholder")}
                />
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="flex items-center gap-2">
            <Switch
              id="isAvailable"
              checked={formData.isAvailable}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isAvailable: checked })
              }
            />
            <Label htmlFor="isAvailable">{t("isAvailable")}</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("saving") : product ? t("update") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
