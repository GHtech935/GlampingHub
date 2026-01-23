"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MultilingualRichTextEditor } from "@/components/admin/MultilingualRichTextEditor";
import { BankAccountSelector } from "@/components/admin/BankAccountSelector";
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
  latitude?: number;
  longitude?: number;
  bank_account_id?: string | null;
  is_active: boolean;
  is_featured: boolean;
}

export default function EditZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.zones");
  const tc = useTranslations("admin.glamping.common");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<ImageData[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);

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

  useEffect(() => {
    fetchZone();
    fetchImages();
  }, [id]);

  const fetchZone = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/zones/${id}`);
      const data = await response.json();
      if (response.ok) {
        const zone: Zone = data.zone;
        setFormData({
          name_vi: zone.name.vi || "",
          name_en: zone.name.en || "",
          description_vi: zone.description?.vi || "",
          description_en: zone.description?.en || "",
          address: zone.address || "",
          city: zone.city || "",
          province: zone.province || "",
          latitude: zone.latitude || null,
          longitude: zone.longitude || null,
          bank_account_id: zone.bank_account_id || null,
          is_active: zone.is_active,
          is_featured: zone.is_featured,
        });
      }
    } catch (error) {
      console.error("Failed to fetch zone:", error);
      toast({
        title: tc("error"),
        description: "Failed to fetch zone details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/zones/${id}/images`);
      const data = await response.json();
      if (response.ok) {
        setExistingImages(data.images || []);
        // Convert to ImageData format for ImageUpload component
        setImages(
          (data.images || []).map((img: any) => ({
            url: img.image_url,
            public_id: img.public_id,
            is_featured: img.is_featured,
            display_order: img.display_order,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
    }
  };

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
      // Step 1: Update zone
      const response = await fetch(`/api/admin/glamping/zones/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
          is_active: formData.is_active,
          is_featured: formData.is_featured,
        }),
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

      // Step 2: Handle image updates
      // Delete removed images
      const currentImageUrls = images.map((img) => img.url);
      const imagesToDelete = existingImages.filter(
        (img) => !currentImageUrls.includes(img.image_url)
      );

      for (const img of imagesToDelete) {
        await fetch(`/api/admin/glamping/zones/${id}/images`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image_id: img.id }),
        });
      }

      // Add new images
      const existingImageUrls = existingImages.map((img) => img.image_url);
      const newImages = images.filter((img) => !existingImageUrls.includes(img.url));

      if (newImages.length > 0) {
        const imagePromises = newImages.map((image, index) =>
          fetch(`/api/admin/glamping/zones/${id}/images`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_url: image.url,
              public_id: image.public_id,
              is_featured: image.is_featured,
              display_order: existingImages.length + index,
            }),
          })
        );

        await Promise.all(imagePromises);
      }

      toast({
        title: tc("success"),
        description: t("updateSuccess"),
      });

      router.push("/admin/zones/all/dashboard");
    } catch (error) {
      console.error("Failed to update zone:", error);
      toast({
        title: tc("error"),
        description: "Failed to update zone",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/zones/all/dashboard")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("editZone")}</h1>
          <p className="text-gray-600 mt-1">{formData.name_vi}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.basicInfo")}</CardTitle>
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
            <CardTitle>{t("form.location")}</CardTitle>
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

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.images")}</CardTitle>
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

        {/* Bank Account Selector */}
        <BankAccountSelector
          entityType="glamping_zone"
          entityId={id}
          currentBankAccountId={formData.bank_account_id}
          onSave={() => {
            // Refresh zone data after bank account is updated
            fetchZone();
          }}
        />

        {/* Status Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{tc("status")}</CardTitle>
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
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/zones/all/dashboard")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? tc("saving") : tc("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
