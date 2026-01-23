"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X } from "lucide-react";
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
  });

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (open) {
      // Fetch categories when modal opens
      fetchCategories();

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
        });
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
        });
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
        description: "Vui lòng chọn file hình ảnh",
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
        description: "Tải ảnh lên thành công",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: tc("error"),
        description: "Không thể tải ảnh lên",
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

    if (!formData.price || parseFloat(formData.price) < 0) {
      toast({
        title: tc("error"),
        description: t("priceRequired"),
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

            {/* Category */}
            <div className="space-y-2">
              <Label>{t("categoryLabel")}</Label>
              <Select
                value={formData.category_id || "none"}
                onValueChange={handleCategoryChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn category" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  <SelectItem value="none">
                    -- Không chọn category --
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
                Chọn category món ăn hoặc để trống
              </p>
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label>{t("unitLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="món"
                  value={formData.unit_vi}
                  onChange={(e) => setFormData({ ...formData, unit_vi: e.target.value })}
                  disabled={loading}
                />
                <Input
                  placeholder="item"
                  value={formData.unit_en}
                  onChange={(e) => setFormData({ ...formData, unit_en: e.target.value })}
                  disabled={loading}
                />
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

            {/* Availability */}
            <div className="flex items-center space-x-2">
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

            {/* Max Quantity */}
            <div className="space-y-2">
              <Label htmlFor="max_quantity">{t("maxQuantityLabel")}</Label>
              <Input
                id="max_quantity"
                type="number"
                min="0"
                value={formData.max_quantity}
                onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                disabled={loading}
              />
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
                        {uploading ? "Đang tải lên..." : "Tải ảnh lên"}
                      </span>
                    </div>
                  </Button>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Nhấn để chọn hình ảnh từ máy tính của bạn
              </p>
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight">{t("weightLabel")}</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                disabled={loading}
              />
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
              disabled={loading || (!formData.name_vi && !formData.name_en) || !formData.price}
            >
              {loading ? tc("loading") : (editData ? t("updateButton") : t("createButton"))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
