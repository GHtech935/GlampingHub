"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { CurrencyInput } from "@/components/ui/currency-input";
import CategoryItemSelector, { Category } from "@/components/admin/events/CategoryItemSelector";

interface MenuFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zoneId?: string;
  editData?: any; // Menu item data for editing
}

export function MenuFormModal({
  open,
  onOpenChange,
  onSuccess,
  zoneId,
  editData
}: MenuFormModalProps) {
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.menu.form");
  const tc = useTranslations("admin.glamping.common");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Item selector state (for "Áp dụng cho" feature)
  const [itemCategories, setItemCategories] = useState<Category[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [formData, setFormData] = useState({
    name_vi: "",
    name_en: "",
    description_vi: "",
    description_en: "",
    category_id: "",
    unit_vi: "món",
    unit_en: "item",
    price: "",
    tax_rate: "0",
    status: "active",
    is_available: true,
    max_quantity: "10",
    requires_advance_booking: false,
    advance_hours: "0",
    image_url: "",
    weight: 0,
    min_guests: "",
    max_guests: "",
    stock: "",
  });

  // Fetch menu item details (including item_ids) when editing
  const fetchMenuItemDetails = async (menuItemId: string) => {
    try {
      const response = await fetch(`/api/admin/glamping/menu/${menuItemId}`);
      const data = await response.json();
      if (data.menuItem?.item_ids) {
        setSelectedItems(data.menuItem.item_ids);
      }
    } catch (error) {
      console.error('Failed to fetch menu item details:', error);
    }
  };

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (open) {
      // Fetch menu categories when modal opens
      fetchCategories();
      // Fetch item categories for "Áp dụng cho" selector
      fetchCategoriesAndItems();

      if (editData) {
        // Populate form with edit data
        setFormData({
          name_vi: editData.name?.vi || "",
          name_en: editData.name?.en || "",
          description_vi: editData.description?.vi || "",
          description_en: editData.description?.en || "",
          category_id: editData.category_id || "",
          unit_vi: editData.unit?.vi || "món",
          unit_en: editData.unit?.en || "item",
          price: editData.price?.toString() || "",
          tax_rate: editData.tax_rate?.toString() || "0",
          status: editData.status || "active",
          is_available: editData.is_available !== undefined ? editData.is_available : true,
          max_quantity: editData.max_quantity?.toString() || "10",
          requires_advance_booking: editData.requires_advance_booking || false,
          advance_hours: editData.advance_hours?.toString() || "0",
          image_url: editData.image_url || "",
          weight: editData.weight || 0,
          min_guests: editData.min_guests?.toString() || "",
          max_guests: editData.max_guests?.toString() || "",
          stock: editData.stock?.toString() || "",
        });
        // Fetch item_ids from API (editData from list doesn't include item_ids)
        fetchMenuItemDetails(editData.id);
      } else {
        // Fetch next weight for new items
        fetchNextWeight();
        // Reset form for new creation
        setFormData({
          name_vi: "",
          name_en: "",
          description_vi: "",
          description_en: "",
          category_id: "",
          unit_vi: "món",
          unit_en: "item",
          price: "",
          tax_rate: "0",
          status: "active",
          is_available: true,
          max_quantity: "10",
          requires_advance_booking: false,
          advance_hours: "0",
          image_url: "",
          weight: 0,
          min_guests: "",
          max_guests: "",
          stock: "",
        });
        // Reset selected items
        setSelectedItems([]);
      }
    }
  }, [open, editData, zoneId]);

  const fetchNextWeight = async () => {
    try {
      const url = zoneId
        ? `/api/admin/glamping/menu?zone_id=${zoneId}`
        : '/api/admin/glamping/menu';

      const response = await fetch(url);
      const data = await response.json();

      if (data.menuItems && data.menuItems.length > 0) {
        const maxWeight = Math.max(...data.menuItems.map((m: any) => m.weight || 0));
        setFormData(prev => ({ ...prev, weight: maxWeight + 1 }));
      } else {
        setFormData(prev => ({ ...prev, weight: 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch menu items for weight:', error);
      setFormData(prev => ({ ...prev, weight: 0 }));
    }
  };

  const fetchCategories = async () => {
    try {
      const url = zoneId
        ? `/api/admin/glamping/menu-categories?zone_id=${zoneId}`
        : '/api/admin/glamping/menu-categories';

      const response = await fetch(url);
      const data = await response.json();

      console.log('Fetched menu categories:', data.categories);

      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch menu categories:', error);
      setCategories([]);
    }
  };

  // Fetch item categories and items for "Áp dụng cho" selector
  const fetchCategoriesAndItems = async () => {
    if (!zoneId) return;

    setLoadingItems(true);
    try {
      // Only fetch tent categories (is_tent_category=true)
      const categoryUrl = `/api/admin/glamping/categories?zone_id=${zoneId}&is_tent_category=true`;
      const itemsUrl = `/api/admin/glamping/items?zone_id=${zoneId}&is_tent_category=true`;

      const [categoriesRes, itemsRes] = await Promise.all([
        fetch(categoryUrl),
        fetch(itemsUrl)
      ]);

      const categoriesData = await categoriesRes.json();
      const itemsData = await itemsRes.json();

      // Group items by category
      const categoryMap = new Map<string, Category>();

      categoriesData.categories?.forEach((cat: any) => {
        const catName = typeof cat.name === 'object'
          ? (cat.name?.vi || cat.name?.en || 'N/A')
          : (cat.name || 'N/A');
        categoryMap.set(cat.id, { id: cat.id, name: catName, items: [] });
      });

      itemsData.items?.forEach((item: any) => {
        const category = categoryMap.get(item.category_id);
        if (category) {
          const itemName = typeof item.name === 'object'
            ? (item.name?.vi || item.name?.en || 'N/A')
            : (item.name || 'N/A');
          category.items.push({
            id: item.id,
            name: itemName,
            category_id: item.category_id
          });
        }
      });

      // Only include categories that have items
      const categoriesWithItems = Array.from(categoryMap.values()).filter(cat => cat.items.length > 0);
      setItemCategories(categoriesWithItems);
    } catch (error) {
      console.error('Failed to fetch item categories and items:', error);
      setItemCategories([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedItems(selectedIds);
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === "none" || !categoryId) {
      setFormData({
        ...formData,
        category_id: "",
      });
    } else {
      setFormData({
        ...formData,
        category_id: categoryId,
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: tc("error"),
        description: t("imageFileRequired"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "glamping-menu");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      setFormData(prev => ({ ...prev, image_url: data.url }));
      toast({
        title: tc("success"),
        description: t("imageUploadSuccess"),
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: tc("error"),
        description: t("imageUploadFailed"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name_vi && !formData.name_en) {
      toast({
        title: tc("error"),
        description: t("nameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (formData.price === '' || formData.price === null || formData.price === undefined || parseFloat(formData.price) < 0) {
      toast({
        title: tc("error"),
        description: t("priceRequired"),
        variant: "destructive",
      });
      return;
    }

    // Validate guest limits
    if (formData.min_guests && formData.max_guests) {
      const minGuests = parseInt(formData.min_guests);
      const maxGuests = parseInt(formData.max_guests);
      if (maxGuests < minGuests) {
        toast({
          title: tc("error"),
          description: t("guestLimitError"),
          variant: "destructive",
        });
        return;
      }
    }

    // Check if only one guest limit is filled
    if ((formData.min_guests && !formData.max_guests) || (!formData.min_guests && formData.max_guests)) {
      toast({
        title: tc("error"),
        description: t("guestLimitBothRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Transform form data to API format (JSONB fields)
      const apiData = {
        name: {
          vi: formData.name_vi,
          en: formData.name_en,
        },
        description: {
          vi: formData.description_vi,
          en: formData.description_en,
        },
        category_id: formData.category_id || null,
        unit: {
          vi: formData.unit_vi,
          en: formData.unit_en,
        },
        price: parseFloat(formData.price),
        tax_rate: parseFloat(formData.tax_rate) || 0,
        status: formData.status,
        is_available: formData.is_available,
        max_quantity: parseInt(formData.max_quantity) || 10,
        requires_advance_booking: formData.requires_advance_booking,
        advance_hours: parseInt(formData.advance_hours) || 0,
        image_url: formData.image_url || null,
        weight: formData.weight,
        zone_id: zoneId,
        min_guests: formData.min_guests ? parseInt(formData.min_guests) : null,
        max_guests: formData.max_guests ? parseInt(formData.max_guests) : null,
        stock: formData.stock ? parseInt(formData.stock) : null,
        item_ids: selectedItems, // Items this menu product applies to
      };

      const url = editData
        ? `/api/admin/glamping/menu/${editData.id}`
        : '/api/admin/glamping/menu';

      const method = editData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || (editData ? t("updateFailed") : t("createFailed")));
      }

      toast({
        title: tc("success"),
        description: editData ? t("updateSuccess") : t("createSuccess"),
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: tc("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? t("editModalTitle") : t("modalTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>
                {t("nameLabel")} <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t("nameViPlaceholder")}
                  value={formData.name_vi}
                  onChange={(e) => setFormData({ ...formData, name_vi: e.target.value })}
                  disabled={loading}
                />
                <Input
                  placeholder={t("nameEnPlaceholder")}
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t("descriptionLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Textarea
                  placeholder={t("nameViPlaceholder")}
                  value={formData.description_vi}
                  onChange={(e) => setFormData({ ...formData, description_vi: e.target.value })}
                  disabled={loading}
                  rows={3}
                />
                <Textarea
                  placeholder={t("nameEnPlaceholder")}
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  disabled={loading}
                  rows={3}
                />
              </div>
            </div>

            {/* Category and Unit - 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label>{t("categoryLabel")}</Label>
                <Select
                  value={formData.category_id || "none"}
                  onValueChange={handleCategoryChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999]">
                    <SelectItem value="none">
                      {t("categoryNone")}
                    </SelectItem>
                    {categories.map((category) => {
                      const displayName = typeof category.name === 'object'
                        ? (category.name?.vi || category.name?.en || 'N/A')
                        : (category.name || 'N/A');

                      return (
                        <SelectItem key={category.id} value={category.id}>
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {t("categoryHelp")}
                </p>
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label>{t("unitLabel")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={t("unitViPlaceholder")}
                    value={formData.unit_vi}
                    onChange={(e) => setFormData({ ...formData, unit_vi: e.target.value })}
                    disabled={loading}
                  />
                  <Input
                    placeholder={t("unitEnPlaceholder")}
                    value={formData.unit_en}
                    onChange={(e) => setFormData({ ...formData, unit_en: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Price and Tax Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  {t("priceLabel")} <span className="text-red-500">*</span>
                </Label>
                <CurrencyInput
                  id="price"
                  value={formData.price}
                  onValueChange={(value) => setFormData({ ...formData, price: value?.toString() || "" })}
                  disabled={loading || uploading}
                  placeholder="0"
                  minValue={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_rate">{t("taxRateLabel")}</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">{t("statusLabel")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={loading}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  <SelectItem value="active">{t("statusActive")}</SelectItem>
                  <SelectItem value="hidden">{t("statusHidden")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Quantity, Stock, Display Order - 3 columns */}
            <div className="grid grid-cols-3 gap-4">
              {/* Max Quantity */}
              <div className="space-y-2">
                <Label htmlFor="max_quantity">{t("maxQuantityLabel")}</Label>
                <Input
                  id="max_quantity"
                  type="number"
                  min="0"
                  placeholder="100"
                  value={formData.max_quantity}
                  onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                  disabled={loading}
                />
              </div>

              {/* Stock */}
              <div className="space-y-2">
                <Label htmlFor="stock">{t("stockLabel")}</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  placeholder={t("stockPlaceholder")}
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {t("stockHelp")}
                </p>
              </div>

              {/* Weight/Display Order */}
              <div className="space-y-2">
                <Label htmlFor="weight">{t("displayOrderLabel")}</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Guest Limits for Combo */}
            <div className="space-y-2">
              <Label>{t("comboGuestLabel")}</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_guests" className="text-sm text-gray-600">
                    {t("minGuestsLabel")}
                  </Label>
                  <Input
                    id="min_guests"
                    type="number"
                    min="0"
                    placeholder="VD: 2"
                    value={formData.min_guests}
                    onChange={(e) => setFormData({ ...formData, min_guests: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_guests" className="text-sm text-gray-600">
                    {t("maxGuestsLabel")}
                  </Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="0"
                    placeholder="VD: 2"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {t("comboFixedHelp")}<br/>
                {t("comboFlexibleHelp")}<br/>
                {t("comboNormalHelp")}
              </p>
            </div>

            {/* Advance Booking */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_advance_booking"
                checked={formData.requires_advance_booking}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requires_advance_booking: checked as boolean })
                }
                disabled={loading}
              />
              <Label htmlFor="requires_advance_booking" className="font-normal cursor-pointer">
                {t("advanceBookingLabel")}
              </Label>
            </div>

            {/* Advance Hours (conditional) */}
            {formData.requires_advance_booking && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="advance_hours">{t("advanceHoursLabel")}</Label>
                <Input
                  id="advance_hours"
                  type="number"
                  min="0"
                  value={formData.advance_hours}
                  onChange={(e) => setFormData({ ...formData, advance_hours: e.target.value })}
                  disabled={loading}
                />
              </div>
            )}

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>{t("imageUrlLabel")}</Label>

              {formData.image_url ? (
                <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-gray-50">
                  <Image
                    src={formData.image_url}
                    alt="Menu item"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    disabled={loading || uploading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={loading || uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || uploading}
                    className="w-full h-32 border-dashed"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {uploading ? t("uploading") : t("uploadImage")}
                      </span>
                    </div>
                  </Button>
                </div>
              )}

              <p className="text-xs text-gray-500">
                {t("imageHelp")}
              </p>
            </div>

            {/* Item Selector - "Áp dụng cho" */}
            {zoneId && (
              <div className="space-y-2 pt-4 border-t">
                {loadingItems ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">{tc("loading")}</span>
                  </div>
                ) : itemCategories.length > 0 ? (
                  <CategoryItemSelector
                    categories={itemCategories}
                    selectedItems={selectedItems}
                    onSelectionChange={handleSelectionChange}
                  />
                ) : (
                  <p className="text-sm text-gray-500">{t("noItemsAvailable")}</p>
                )}
              </div>
            )}

            {/* Active Status - Checkbox at the bottom */}
            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox
                id="is_available"
                checked={formData.is_available}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_available: checked as boolean })
                }
                disabled={loading}
              />
              <Label htmlFor="is_available" className="font-normal cursor-pointer">
                {t("availableLabel")}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || (!formData.name_vi && !formData.name_en) || (formData.price === '' || formData.price === null || formData.price === undefined)}
            >
              {loading ? tc("loading") : (editData ? t("updateButton") : t("createButton"))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
