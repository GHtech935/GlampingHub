"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash, MapPin, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const ZoneMap = dynamic(
  () => import("./_components/ZoneMap").then((mod) => ({ default: mod.ZoneMap })),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg" />
  }
);

interface Zone {
  id: string;
  name: { vi: string; en: string };
  description?: { vi: string; en: string };
  address?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  is_featured: boolean;
  items_count?: number;
  categories_count?: number;
  events_count?: number;
  images_count?: number;
  created_at: string;
  updated_at: string;
}

interface ZoneImage {
  id: string;
  image_url: string;
  is_featured: boolean;
  display_order: number;
}

export default function ViewZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.zones");
  const tc = useTranslations("admin.glamping.common");
  const [zone, setZone] = useState<Zone | null>(null);
  const [images, setImages] = useState<ZoneImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZone();
    fetchImages();
  }, [id]);

  const fetchZone = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/zones/${id}`);
      const data = await response.json();
      if (response.ok) {
        setZone(data.zone);
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
        setImages(data.images || []);
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("confirmDelete"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/glamping/zones/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete zone");
      }

      toast({
        title: tc("success"),
        description: t("deleteSuccess"),
      });

      router.push("/admin/zones/manage");
    } catch (error: any) {
      console.error("Failed to delete zone:", error);
      toast({
        title: tc("error"),
        description: error.message || t("cannotDelete"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Zone not found</p>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/zones/manage")}
          className="mt-4"
        >
          Back to Zones
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/zones/manage")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{zone.name.vi}</h1>
            {zone.name.en && (
              <p className="text-gray-600 mt-1">{zone.name.en}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/zones/manage/${id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            {tc("edit")}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash className="w-4 h-4 mr-2" />
            {tc("delete")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {zone.items_count || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">{t("stats.itemsCount")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {zone.categories_count || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">{t("stats.categoriesCount")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {zone.events_count || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">{t("stats.eventsCount")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {images.length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Images</p>
          </CardContent>
        </Card>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("form.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <div className="mt-1 flex items-center gap-2">
              {zone.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {zone.is_featured && <Badge variant="default">Featured</Badge>}
            </div>
          </div>

          {zone.description && (zone.description.vi || zone.description.en) && (
            <>
              {zone.description.vi && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {t("form.descriptionVi")}
                  </label>
                  <p className="mt-1 text-gray-900">{zone.description.vi}</p>
                </div>
              )}
              {zone.description.en && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {t("form.descriptionEn")}
                  </label>
                  <p className="mt-1 text-gray-900">{zone.description.en}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      {(zone.address || zone.city || zone.province) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("form.location")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                {zone.address && <p className="text-gray-900">{zone.address}</p>}
                <p className="text-gray-600">
                  {[zone.city, zone.province].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>

            {zone.latitude && zone.longitude && (
              <div className="h-[300px] rounded-lg overflow-hidden">
                <ZoneMap
                  latitude={zone.latitude}
                  longitude={zone.longitude}
                  zoneId={zone.id}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Images */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images ({images.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative aspect-video rounded-lg overflow-hidden">
                  <img
                    src={image.image_url}
                    alt="Zone"
                    className="w-full h-full object-cover"
                  />
                  {image.is_featured && (
                    <Badge
                      className="absolute top-2 right-2"
                      variant="default"
                    >
                      Featured
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
