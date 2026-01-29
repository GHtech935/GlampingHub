"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Edit, MapPin, Percent, CheckCircle, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { StatCard, StatCardGrid } from "@/components/admin/StatCard";

interface Discount {
  id: string;
  name: string;
  code: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "inactive" | "expired";
  zone_id: string;
  zone_name?: string;
  rules_name?: string;
}

export default function AllZonesDiscountsPage() {
  const router = useRouter();
  const t = useTranslations("admin.glamping.discounts");
  const tc = useTranslations("admin.glamping.common");
  const ts = useTranslations("admin.glamping.allZonesStats");
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchZones();
    fetchDiscounts();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await fetch("/api/admin/glamping/zones");
      const data = await response.json();
      if (data.zones) {
        setZones(data.zones.map((z: any) => ({ id: z.id, name: z.name.vi })));
      }
    } catch (error) {
      console.error("Failed to fetch zones:", error);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const response = await fetch("/api/admin/glamping/discounts");
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error("Failed to fetch discounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDiscounts = discounts.filter((discount) => {
    const matchesSearch =
      !search ||
      discount.name.toLowerCase().includes(search.toLowerCase()) ||
      discount.code?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || discount.status === statusFilter;
    const matchesType =
      typeFilter === "all" || discount.discount_type === typeFilter;
    const matchesZone =
      zoneFilter === "all" || discount.zone_id === zoneFilter;

    return matchesSearch && matchesStatus && matchesType && matchesZone;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === "percentage") {
      return `${Math.round(value)}%`;
    }
    return `${Math.round(value).toLocaleString("vi-VN")} d`;
  };

  // Map zone names from the zones list
  const getZoneName = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    return zone?.name || "-";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{ts("allDiscountsTitle")}</h1>
          <p className="text-gray-600 mt-1">{ts("allDiscountsDesc")}</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <StatCardGrid>
          <StatCard
            title={ts("totalDiscounts")}
            value={discounts.length}
            icon={Percent}
            color="blue"
          />
          <StatCard
            title={ts("active")}
            value={discounts.filter((d) => d.status === "active").length}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title={ts("percentageBased")}
            value={discounts.filter((d) => d.discount_type === "percentage").length}
            icon={TrendingDown}
            color="purple"
          />
          <StatCard
            title={ts("zones")}
            value={new Set(discounts.map((d) => d.zone_id)).size}
            icon={MapPin}
            color="orange"
          />
        </StatCardGrid>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("filters.statusAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.statusAll")}</SelectItem>
            <SelectItem value="active">{t("filters.statusActive")}</SelectItem>
            <SelectItem value="inactive">{t("filters.statusInactive")}</SelectItem>
            <SelectItem value="expired">{t("filters.statusExpired")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("filters.typeAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.typeAll")}</SelectItem>
            <SelectItem value="percentage">{t("filters.typePercentage")}</SelectItem>
            <SelectItem value="fixed">{t("filters.typeFixed")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ts("zones")}</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.code")}</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead className="text-center">{t("table.startDate")}</TableHead>
              <TableHead className="text-center">{t("table.endDate")}</TableHead>
              <TableHead className="text-center">{t("table.discount")}</TableHead>
              <TableHead className="text-right">{t("table.status")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredDiscounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredDiscounts.map((discount, index) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <span className="font-medium">{discount.name}</span>
                  </TableCell>
                  <TableCell>
                    {discount.code ? (
                      <span className="text-sm">{discount.code}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{getZoneName(discount.zone_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {formatDate(discount.start_date)}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {formatDate(discount.end_date)}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {formatDiscount(discount.discount_type, discount.discount_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {discount.status === "active" ? (
                      <Badge variant="success">{t("status.active")}</Badge>
                    ) : discount.status === "expired" ? (
                      <Badge variant="secondary">{t("status.expired")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("status.inactive")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(`/admin/zones/${discount.zone_id}/discounts`)
                      }
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
