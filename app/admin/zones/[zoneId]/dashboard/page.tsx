"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Tag, Calendar, Grid3x3, MapPin, Edit, Power } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { ZoneFormModal } from "@/components/admin/glamping/ZoneFormModal";

interface ZoneStats {
  id: string;
  name: { vi: string; en: string };
  items_count: number;
  categories_count: number;
  events_count: number;
  active_items: number;
  city?: string;
  province?: string;
  is_active: boolean;
  is_featured: boolean;
  description?: { vi: string; en: string };
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export default function ZoneDashboardPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const router = useRouter();
  const t = useTranslations("admin.glamping.zones");
  const tc = useTranslations("admin.glamping.common");
  const { toast } = useToast();
  const { zoneId } = use(params);
  const isAllZones = zoneId === "all";
  const [loading, setLoading] = useState(true);
  const [zoneStats, setZoneStats] = useState<ZoneStats | null>(null);
  const [allZones, setAllZones] = useState<ZoneStats[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneStats | null>(null);

  useEffect(() => {
    if (isAllZones) {
      fetchAllZones();
    } else {
      fetchZoneStats();
    }
  }, [zoneId]);

  const fetchZoneStats = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/zones/${zoneId}`);
      const data = await response.json();
      if (response.ok) {
        setZoneStats(data.zone);
      }
    } catch (error) {
      console.error("Failed to fetch zone stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllZones = async () => {
    try {
      const response = await fetch("/api/admin/glamping/zones");
      const data = await response.json();
      if (response.ok) {
        setAllZones(data.zones || []);
      }
    } catch (error) {
      console.error("Failed to fetch zones:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleZoneStatus = async (zoneId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/glamping/zones/${zoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        toast({
          title: tc("success"),
          description: !currentStatus ? t("zoneActivated") : t("zoneDeactivated"),
        });
        fetchAllZones();
      } else {
        throw new Error('Failed to update zone status');
      }
    } catch (error) {
      console.error("Failed to toggle zone status:", error);
      toast({
        title: tc("error"),
        description: t("failedUpdateStatus"),
        variant: "destructive",
      });
    }
  };

  const handleEditZone = (zone: ZoneStats) => {
    setSelectedZone(zone);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAllZones) {
    // Aggregate View - All Zones
    const totalItems = allZones.reduce((sum, zone) => sum + (zone.items_count || 0), 0);
    const totalCategories = allZones.reduce((sum, zone) => sum + (zone.categories_count || 0), 0);
    const totalEvents = allZones.reduce((sum, zone) => sum + (zone.events_count || 0), 0);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("allZones")}</h1>
            <p className="text-gray-600 mt-1">{t("overview")}</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addNew")}
          </Button>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{allZones.length}</div>
                  <p className="text-sm text-gray-600">{t("totalZones")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
                  <p className="text-sm text-gray-600">{t("stats.itemsCount")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Tag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalCategories}</div>
                  <p className="text-sm text-gray-600">{t("stats.categoriesCount")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalEvents}</div>
                  <p className="text-sm text-gray-600">{t("stats.eventsCount")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zones Cards */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("allZones")}</h2>
          {allZones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {t("noZonesFound")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allZones.map((zone) => (
                <Card key={zone.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <button
                          onClick={() => router.push(`/admin/zones/${zone.id}/dashboard`)}
                          className="text-base font-semibold text-gray-900 hover:text-primary transition-colors text-left"
                        >
                          {zone.name.vi}
                        </button>
                        {zone.name.en && (
                          <p className="text-xs text-gray-500 mt-1">{zone.name.en}</p>
                        )}
                        {(zone.city || zone.province) && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                            <MapPin className="w-3 h-3" />
                            <span>{[zone.city, zone.province].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                      </div>
                      {zone.is_active ? (
                        <Badge variant="success">{t("active")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("inactive")}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="text-lg font-bold text-primary">
                          {zone.items_count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">{t("items")}</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="text-lg font-bold text-secondary">
                          {zone.categories_count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">{t("categories")}</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">
                          {zone.events_count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">{t("events")}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditZone(zone)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {tc("edit")}
                      </Button>
                      <Button
                        variant={zone.is_active ? "outline" : "default"}
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleZoneStatus(zone.id, zone.is_active)}
                      >
                        <Power className="w-4 h-4 mr-1" />
                        {zone.is_active ? t("deactivate") : t("activate")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Zone Create Modal */}
        <ZoneFormModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={() => {
            fetchAllZones();
          }}
        />

        {/* Zone Edit Modal */}
        <ZoneFormModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          zone={selectedZone || undefined}
          onSuccess={() => {
            fetchAllZones();
            setSelectedZone(null);
          }}
        />
      </div>
    );
  }

  // Single Zone View
  if (!zoneStats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("zoneNotFound")}</p>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/zones/all/dashboard")}
          className="mt-4"
        >
          {t("backToDashboard")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{zoneStats.name.vi}</h1>
          {zoneStats.name.en && (
            <p className="text-gray-600 mt-1">{zoneStats.name.en}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/zones/manage/${zoneId}`)}
          >
            {t("viewDetails")}
          </Button>
          <Button onClick={() => router.push(`/admin/zones/${zoneId}/items/new`)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addItem")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {zoneStats.items_count || 0}
                </div>
                <p className="text-sm text-gray-600">{t("stats.itemsCount")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {zoneStats.categories_count || 0}
                </div>
                <p className="text-sm text-gray-600">{t("stats.categoriesCount")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {zoneStats.events_count || 0}
                </div>
                <p className="text-sm text-gray-600">{t("stats.eventsCount")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {zoneStats.active_items || 0}
                </div>
                <p className="text-sm text-gray-600">{t("stats.activeItems")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-24"
              onClick={() => router.push(`/admin/zones/${zoneId}/items`)}
            >
              <div className="flex flex-col items-center gap-2">
                <Package className="w-6 h-6" />
                <span>{t("viewItems")}</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-24"
              onClick={() => router.push(`/admin/zones/${zoneId}/categories`)}
            >
              <div className="flex flex-col items-center gap-2">
                <Tag className="w-6 h-6" />
                <span>{t("manageCategories")}</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-24"
              onClick={() => router.push(`/admin/zones/${zoneId}/events`)}
            >
              <div className="flex flex-col items-center gap-2">
                <Calendar className="w-6 h-6" />
                <span>{t("viewEvents")}</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
