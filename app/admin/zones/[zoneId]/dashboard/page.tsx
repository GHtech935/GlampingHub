"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Tag, Calendar, MapPin, Edit, Power, DollarSign, CheckCircle, BarChart3 } from "lucide-react";
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
import { StatCard, StatCardGrid } from "@/components/admin/StatCard";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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

interface DashboardData {
  summary: {
    totalRevenue: number;
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    avgBookingValue: number;
    totalGuests: number;
  };
  dailyRevenue: { date: string; revenue: number; bookings: number }[];
  monthlyRevenue: { month: string; month_name: string; revenue: number; bookings: number }[];
  statusDistribution: { status: string; count: number }[];
  recentBookings: {
    id: string;
    bookingCode: string;
    status: string;
    totalAmount: number;
    checkInDate: string;
    checkOutDate: string;
    createdAt: string;
    customerName: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#22c55e",
  checked_in: "#3b82f6",
  checked_out: "#8b5cf6",
  completed: "#6366f1",
  cancelled: "#ef4444",
};

const STATUS_BADGE_VARIANT: Record<string, string> = {
  pending: "warning",
  confirmed: "success",
  checked_in: "info",
  checked_out: "secondary",
  completed: "default",
  cancelled: "destructive",
};

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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [chartMode, setChartMode] = useState<"daily" | "monthly">("daily");

  useEffect(() => {
    if (isAllZones) {
      fetchAllZones();
    } else {
      fetchZoneStats();
      fetchDashboardData();
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

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const response = await fetch(`/api/admin/glamping/bookings/stats/dashboard?zoneId=${zoneId}`);
      const data = await response.json();
      if (response.ok) {
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("vi-VN") + "đ";
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toFixed(0);
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

  const td = (key: string) => t(`dashboard.${key}`);

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
            onClick={() => handleEditZone(zoneStats)}
          >
            <Edit className="w-4 h-4 mr-2" />
            {tc("edit")}
          </Button>
          <Button onClick={() => router.push(`/admin/zones/${zoneId}/items/new`)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addItem")}
          </Button>
        </div>
      </div>

      {/* Booking Stat Cards */}
      {dashboardLoading ? (
        <StatCardGrid>
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-8 bg-gray-200 rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </StatCardGrid>
      ) : dashboardData ? (
        <StatCardGrid>
          <StatCard
            title={td("totalRevenue")}
            value={formatShortCurrency(dashboardData.summary.totalRevenue) + "đ"}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title={td("totalBookings")}
            value={dashboardData.summary.totalBookings}
            icon={BarChart3}
            color="blue"
          />
          <StatCard
            title={td("confirmedBookings")}
            value={dashboardData.summary.confirmedBookings}
            icon={CheckCircle}
            color="emerald"
          />
          <StatCard
            title={td("avgBookingValue")}
            value={formatShortCurrency(dashboardData.summary.avgBookingValue) + "đ"}
            icon={DollarSign}
            color="purple"
          />
        </StatCardGrid>
      ) : null}

      {/* Revenue Chart */}
      {dashboardLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-48 bg-gray-200 rounded" />
            </div>
          </CardContent>
        </Card>
      ) : dashboardData ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant={chartMode === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartMode("daily")}
            >
              {td("daily")}
            </Button>
            <Button
              variant={chartMode === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartMode("monthly")}
            >
              {td("monthly")}
            </Button>
          </div>
          <RevenueChart
            data={chartMode === "daily" ? dashboardData.dailyRevenue : dashboardData.monthlyRevenue}
            title={chartMode === "daily" ? td("dailyRevenue") : td("monthlyRevenue")}
            description={chartMode === "daily" ? td("last30Days") : td("last12Months")}
            type={chartMode}
          />
        </div>
      ) : null}

      {/* Two-column: Pie Chart + Zone Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie Chart */}
        {dashboardLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-48" />
                <div className="h-64 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ) : dashboardData && dashboardData.statusDistribution.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{td("bookingsByStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={dashboardData.statusDistribution.map((item) => ({
                      name: td(item.status),
                      value: item.count,
                      status: item.status,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dashboardData.statusDistribution.map((item, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[item.status] || "#9ca3af"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{td("bookingsByStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-64 text-gray-500">
              {td("noBookingsYet")}
            </CardContent>
          </Card>
        )}

        {/* Zone Overview */}
        <Card>
          <CardHeader>
            <CardTitle>{td("zoneOverview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <Package className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {zoneStats.items_count || 0}
                </div>
                <p className="text-sm text-gray-600">{t("stats.itemsCount")}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <Tag className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {zoneStats.categories_count || 0}
                </div>
                <p className="text-sm text-gray-600">{t("stats.categoriesCount")}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <Calendar className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {zoneStats.events_count || 0}
                </div>
                <p className="text-sm text-gray-600">{t("stats.eventsCount")}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {zoneStats.active_items || 0}
                </div>
                <p className="text-sm text-gray-600">{t("stats.activeItems")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      {dashboardLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : dashboardData && dashboardData.recentBookings.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{td("recentBookings")}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/zones/${zoneId}/bookings`)}
              >
                {td("viewAll")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{td("bookingCode")}</TableHead>
                  <TableHead>{td("customer")}</TableHead>
                  <TableHead>{td("dates")}</TableHead>
                  <TableHead>{td("status")}</TableHead>
                  <TableHead className="text-right">{td("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.recentBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.bookingCode}
                    </TableCell>
                    <TableCell>{booking.customerName}</TableCell>
                    <TableCell>
                      {new Date(booking.checkInDate).toLocaleDateString("vi-VN")}
                      {" - "}
                      {new Date(booking.checkOutDate).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[booking.status] as any || "default"}>
                        {td(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(booking.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : !dashboardLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>{td("recentBookings")}</CardTitle>
          </CardHeader>
          <CardContent className="py-8 text-center text-gray-500">
            {td("noBookingsYet")}
          </CardContent>
        </Card>
      ) : null}

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

      {/* Zone Edit Modal */}
      <ZoneFormModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        zone={selectedZone || undefined}
        onSuccess={() => {
          fetchZoneStats();
          setSelectedZone(null);
        }}
      />
    </div>
  );
}
