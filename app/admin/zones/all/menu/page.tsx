"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Edit, MapPin, UtensilsCrossed, CheckCircle, Folder } from "lucide-react";
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

interface MenuItem {
  id: string;
  name: { vi: string; en: string };
  category_name?: { vi: string; en: string };
  price: number;
  is_available: boolean;
  status: string;
  zone_id: string;
  zone_name: string;
  image_url?: string;
}

export default function AllZonesMenuPage() {
  const router = useRouter();
  const t = useTranslations("admin.glamping.menu");
  const tc = useTranslations("admin.glamping.common");
  const ts = useTranslations("admin.glamping.allZonesStats");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchZones();
    fetchMenuItems();
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

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/admin/glamping/menu");
      const data = await response.json();
      setMenuItems(data.menuItems || []);
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const nameVi = item.name?.vi?.toLowerCase() || "";
    const nameEn = item.name?.en?.toLowerCase() || "";
    const catVi = item.category_name?.vi?.toLowerCase() || "";
    const zoneName = item.zone_name?.toLowerCase() || "";
    const query = search.toLowerCase();

    const matchesSearch =
      !search ||
      nameVi.includes(query) ||
      nameEn.includes(query) ||
      catVi.includes(query) ||
      zoneName.includes(query);

    const matchesZone = zoneFilter === "all" || item.zone_id === zoneFilter;

    return matchesSearch && matchesZone;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{ts("allMenuTitle")}</h1>
          <p className="text-gray-600 mt-1">{ts("allMenuDesc")}</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <StatCardGrid>
          <StatCard
            title={ts("totalMenuItems")}
            value={menuItems.length}
            icon={UtensilsCrossed}
            color="blue"
          />
          <StatCard
            title={ts("available")}
            value={menuItems.filter((i) => i.is_available && i.status === "active").length}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title={ts("categories")}
            value={
              new Set(
                menuItems
                  .map((i) => i.category_name?.vi)
                  .filter(Boolean)
              ).size
            }
            icon={Folder}
            color="purple"
          />
          <StatCard
            title={ts("zones")}
            value={new Set(menuItems.map((i) => i.zone_id)).size}
            icon={MapPin}
            color="orange"
          />
        </StatCardGrid>
      )}

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={tc("filter")} />
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
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-20">{t("table.image")}</TableHead>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>{t("table.price")}</TableHead>
              <TableHead className="text-center">{t("table.status")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-gray-500">{tc("noData")}</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item, index) => (
                <TableRow key={item.id} className={index % 2 === 1 ? "bg-gray-50" : ""}>
                  <TableCell>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name?.vi || item.name?.en}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        {t("noImage")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.name?.vi || item.name?.en}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {item.category_name?.vi || item.category_name?.en || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{item.zone_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(item.price)}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.status === "active" && item.is_available ? (
                      <Badge variant="default">{t("status.active")}</Badge>
                    ) : item.status === "active" && !item.is_available ? (
                      <Badge variant="secondary">{t("availability.unavailable")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("status.hidden")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(`/admin/zones/${item.zone_id}/menu`)
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
