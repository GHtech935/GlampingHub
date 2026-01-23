"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Save, Landmark } from "lucide-react";
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

export default function NewZonePage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.zones");
  const tc = useTranslations("admin.glamping.common");
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<ImageData[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{id: string; bank_name: string; account_number: string; is_default: boolean}>>([]);

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

  // Fetch bank accounts on mount
  useEffect(() => {
    fetch("/api/admin/bank-accounts?is_active=true")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setBankAccounts(data.data);
        }
      })
      .catch(err => console.error("Failed to load bank accounts:", err));
  }, []);

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
      // Step 1: Create zone
      const response = await fetch("/api/admin/glamping/zones", {
        method: "POST",
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
          bank_account_id: formData.bank_account_id,
          is_active: formData.is_active,
          is_featured: formData.is_featured,
        }),
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

      const zoneId = data.zone.id;

      // Step 2: Save images if any
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
        description: t("createSuccess"),
      });

      router.push("/admin/zones/all/dashboard");
    } catch (error) {
      console.error("Failed to create zone:", error);
      toast({
        title: tc("error"),
        description: "Failed to create zone",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">{t("addNew")}</h1>
          <p className="text-gray-600 mt-1">Create a new glamping zone</p>
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

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
