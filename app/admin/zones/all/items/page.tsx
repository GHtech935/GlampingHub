"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, Edit, Eye, MapPin } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Item {
  id: string;
  name: string;
  sku: string;
  category_name: string;
  inventory_quantity: number;
  status: string;
  zone_id: string;
  zone_name: string;
}

export default function AllZonesItemsPage() {
  const router = useRouter();
  const t = useTranslations("admin.glamping.items");
  const tc = useTranslations("admin.glamping.common");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchZones();
    fetchItems();
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

  const fetchItems = async () => {
    try {
      // Fetch items from all zones by not passing zone_id filter
      const response = await fetch("/api/admin/glamping/items");
      const data = await response.json();

      if (data.items) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase()) ||
      item.zone_name?.toLowerCase().includes(search.toLowerCase());

    const matchesZone = zoneFilter === "all" || item.zone_id === zoneFilter;

    return matchesSearch && matchesZone;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("allItems")}</h1>
          <p className="text-gray-600 mt-1">{t("allItemsDesc")}</p>
        </div>
      </div>

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
            <SelectValue placeholder={t("filterByZone")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allZones")}</SelectItem>
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
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.sku")}</TableHead>
              <TableHead>{t("zone")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead>{t("table.inventory")}</TableHead>
              <TableHead>{t("table.visibility")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
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
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.sku || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{item.zone_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.category_name || "-"}</TableCell>
                  <TableCell>
                    {item.inventory_quantity === -1 ? (
                      <Badge variant="outline">{t("table.unlimited")}</Badge>
                    ) : (
                      item.inventory_quantity
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === "available" ? "default" : "secondary"}
                    >
                      {t(`status.${item.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/zones/${item.zone_id}/items/${item.id}`
                          )
                        }
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/zones/${item.zone_id}/items/${item.id}/edit`
                          )
                        }
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
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
