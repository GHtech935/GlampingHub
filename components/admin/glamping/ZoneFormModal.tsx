"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Landmark } from "lucide-react";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MultilingualRichTextEditor } from "@/components/admin/MultilingualRichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface ImageData {
  url: string;
  public_id?: string;
  is_featured: boolean;
  display_order: number;
}

interface Zone {
  id: string;
  name: { vi: string; en: string };
  description?: { vi: string; en: string };
  address?: string;
  city?: string;
  province?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  is_featured: boolean;
}

interface ZoneFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  zone?: Zone; // If provided, edit mode; otherwise create mode
}

export function ZoneFormModal({ open, onOpenChange, onSuccess, zone }: ZoneFormModalProps) {
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.zones");
  const tc = useTranslations("admin.glamping.common");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageData[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{id: string; bank_name: string; account_number: string; is_default: boolean}>>([]);
  const isEditMode = !!zone;

  const [formData, setFormData] = useState({
    name_vi: "",
    name_en: "",
    description_vi: "",
    description_en: "",
    address: "",
    city: "",
    province: "",
    latitude: null as number | null,
    longitude: null as number | null,
    bank_account_id: null as string | null,
    is_active: true,
    is_featured: false,
  });

  // Fetch bank accounts when modal opens
  useEffect(() => {
    if (open) {
      fetch("/api/admin/bank-accounts?is_active=true")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setBankAccounts(data.data);
          }
        })
        .catch(err => console.error("Failed to load bank accounts:", err));
    }
  }, [open]);

  // Load zone data when opening in edit mode
  useEffect(() => {
    if (open && zone) {
      setLoading(true);
      // Load zone details including images
      fetch(`/api/admin/glamping/zones/${zone.id}`)
        .then(res => res.json())
        .then(data => {
          const zoneData = data.zone;
          setFormData({
            name_vi: zoneData.name?.vi || "",
            name_en: zoneData.name?.en || "",
            description_vi: zoneData.description?.vi || "",
            description_en: zoneData.description?.en || "",
            address: zoneData.address || "",
            city: zoneData.city || "",
            province: zoneData.province || "",
            latitude: zoneData.latitude,
            longitude: zoneData.longitude,
            bank_account_id: zoneData.bank_account_id || null,
            is_active: zoneData.is_active ?? true,
            is_featured: zoneData.is_featured ?? false,
          });
          // Load images if available
          if (zoneData.images && Array.isArray(zoneData.images)) {
            setImages(zoneData.images.map((img: any, index: number) => ({
              url: img.image_url,
              public_id: img.public_id,
              is_featured: img.is_featured || false,
              display_order: img.display_order ?? index,
            })));
          }
        })
        .catch(err => {
          console.error("Failed to load zone:", err);
          toast({
            title: tc("error"),
            description: "Failed to load zone data",
            variant: "destructive",
          });
        })
        .finally(() => setLoading(false));
    } else if (open && !zone) {
      resetForm();
    }
  }, [open, zone]);

  const handleLocationChange = (location: {
    address: string;
    city: string;
    province: string;
    latitude: number | null;
    longitude: number | null;
  }) => {
    setFormData({
      ...formData,
      address: location.address,
      city: location.city,
      province: location.province,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  const resetForm = () => {
    setFormData({
      name_vi: "",
      name_en: "",
      description_vi: "",
      description_en: "",
      address: "",
      city: "",
      province: "",
      latitude: null,
      longitude: null,
      bank_account_id: null,
      is_active: true,
      is_featured: false,
    });
    setImages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name_vi) {
      toast({
        title: tc("error"),
        description: "Vietnamese name is required",
        variant: "destructive",
      });
      return;
    }

    if (images.length > 10) {
      toast({
        title: tc("error"),
        description: t("form.images") + " - Maximum 10 images allowed",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const zoneData = {
        name: {
          vi: formData.name_vi,
          en: formData.name_en,
        },
        description: {
          vi: formData.description_vi,
          en: formData.description_en,
        },
        address: formData.address,
        city: formData.city,
        province: formData.province,
        latitude: formData.latitude,
        longitude: formData.longitude,
        bank_account_id: formData.bank_account_id,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
      };

      let zoneId: string;

      if (isEditMode && zone) {
        // Update existing zone
        const response = await fetch(`/api/admin/glamping/zones/${zone.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(zoneData),
        });

        const data = await response.json();

        if (!response.ok) {
          toast({
            title: tc("error"),
            description: data.error || "Failed to update zone",
            variant: "destructive",
          });
          return;
        }

        zoneId = zone.id;

        // Delete all existing images first
        await fetch(`/api/admin/glamping/zones/${zoneId}/images?all=true`, {
          method: "DELETE",
        });
      } else {
        // Create new zone
        const response = await fetch("/api/admin/glamping/zones", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(zoneData),
        });

        const data = await response.json();

        if (!response.ok) {
          toast({
            title: tc("error"),
            description: data.error || "Failed to create zone",
            variant: "destructive",
          });
          return;
        }

        zoneId = data.zone.id;
      }

      // Save images if any
      if (images.length > 0) {
        const imagePromises = images.map((image, index) =>
          fetch(`/api/admin/glamping/zones/${zoneId}/images`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_url: image.url,
              public_id: image.public_id,
              is_featured: image.is_featured,
              display_order: index,
            }),
          })
        );

        await Promise.all(imagePromises);
      }

      toast({
        title: tc("success"),
        description: isEditMode ? t("updateSuccess") : t("createSuccess"),
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} zone:`, error);
      toast({
        title: tc("error"),
        description: `Failed to ${isEditMode ? 'update' : 'create'} zone`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isEditMode ? t("editZone") : t("addNew")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("form.basicInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_vi">
                    {t("form.nameVi")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name_vi"
                    value={formData.name_vi}
                    onChange={(e) =>
                      setFormData({ ...formData, name_vi: e.target.value })
                    }
                    placeholder="Tên khu glamping"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">{t("form.nameEn")}</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) =>
                      setFormData({ ...formData, name_en: e.target.value })
                    }
                    placeholder="Glamping zone name"
                  />
                </div>
              </div>

              <MultilingualRichTextEditor
                label="Mô Tả"
                value={{
                  vi: formData.description_vi,
                  en: formData.description_en,
                }}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    description_vi: value.vi,
                    description_en: value.en,
                  })
                }
                placeholder={{
                  vi: "Mô tả khu glamping",
                  en: "Glamping zone description",
                }}
              />
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("form.location")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationPicker
                value={{
                  address: formData.address,
                  city: formData.city,
                  province: formData.province,
                  latitude: formData.latitude,
                  longitude: formData.longitude,
                }}
                onChange={handleLocationChange}
              />
            </CardContent>
          </Card>

          {/* Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="w-5 h-5" />
                {t("form.paymentSettings")}
              </CardTitle>
              <p className="text-sm text-gray-500">{t("form.paymentSettingsDesc")}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="bank_account_id">{t("form.bankAccount")}</Label>
                <Select
                  value={formData.bank_account_id || "default"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      bank_account_id: value === "default" ? null : value,
                    })
                  }
                >
                  <SelectTrigger id="bank_account_id">
                    <SelectValue placeholder={t("form.selectBankAccount")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      {t("form.useDefault")}
                      {bankAccounts.find(acc => acc.is_default) && (
                        <span className="text-muted-foreground ml-2">
                          ({bankAccounts.find(acc => acc.is_default)?.bank_name} - {bankAccounts.find(acc => acc.is_default)?.account_number})
                        </span>
                      )}
                    </SelectItem>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bank_name} - {account.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("form.images")}</CardTitle>
              <p className="text-sm text-gray-500">Maximum 10 images</p>
            </CardHeader>
            <CardContent>
              <ImageUpload
                images={images}
                onChange={setImages}
                maxImages={10}
                folder="glamping-zones"
              />
            </CardContent>
          </Card>

          {/* Status Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{tc("status")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active">{t("form.isActive")}</Label>
                  <p className="text-sm text-gray-500">Zone will be visible to staff</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_featured">{t("form.isFeatured")}</Label>
                  <p className="text-sm text-gray-500">Mark as featured zone</p>
                </div>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_featured: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
