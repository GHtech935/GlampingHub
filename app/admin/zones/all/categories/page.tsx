"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Edit, Trash, MapPin, Folder, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { StatCard, StatCardGrid } from "@/components/admin/StatCard";

interface Category {
  id: string;
  name: string;
  weight: number;
  status: string;
  item_count?: number;
  zone_id: string;
  zone_name: string;
}

export default function AllZonesCategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.categories");
  const tc = useTranslations("admin.glamping.common");
  const ts = useTranslations("admin.glamping.allZonesStats");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<"name" | "weight">("weight");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchZones();
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/glamping/categories");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: "name" | "weight") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm(tc("confirmDelete"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/glamping/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete category");
      }

      toast({
        title: tc("success"),
        description: t("deleteSuccess"),
      });

      fetchCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && category.status === "active") ||
      (filterStatus === "hidden" && category.status === "hidden");

    const matchesZone = zoneFilter === "all" || category.zone_id === zoneFilter;

    return matchesStatus && matchesZone;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    if (sortField === "name") {
      return multiplier * a.name.localeCompare(b.name);
    } else {
      return multiplier * (a.weight - b.weight);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("allTitle")}</h1>

        <Tabs value="categories" className="w-full">
          <TabsList>
            <TabsTrigger value="categories">{t("tabCategories")}</TabsTrigger>
            <TabsTrigger
              value="tags"
              onClick={() => router.push("/admin/zones/all/tags")}
            >
              {t("tabTags")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      {!loading && (
        <StatCardGrid>
          <StatCard
            title={ts("totalCategories")}
            value={categories.length}
            icon={Folder}
            color="blue"
          />
          <StatCard
            title={ts("active")}
            value={categories.filter((c) => c.status === "active").length}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title={ts("totalItemsInCategories")}
            value={categories.reduce((sum, c) => sum + (c.item_count || 0), 0)}
            icon={Package}
            color="purple"
          />
          <StatCard
            title={ts("zones")}
            value={new Set(categories.map((c) => c.zone_id)).size}
            icon={MapPin}
            color="orange"
          />
        </StatCardGrid>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">{t("statusLabel")}:</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all")}</SelectItem>
              <SelectItem value="active">{t("filter.active")}</SelectItem>
              <SelectItem value="hidden">{t("filter.hidden")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">{t("zoneLabel")}:</label>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
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
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  {t("table.name")}
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead>{t("zoneColumn")}</TableHead>
              <TableHead className="text-center">{t("table.items")}</TableHead>
              <TableHead className="text-center">
                <button
                  onClick={() => handleSort("weight")}
                  className="flex items-center gap-1 hover:text-primary mx-auto"
                >
                  {t("table.weight")}
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {tc("loading")}
                </TableCell>
              </TableRow>
            ) : sortedCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            ) : (
              sortedCategories.map((category, index) => (
                <TableRow key={category.id} className={index % 2 === 1 ? "bg-gray-50" : ""}>
                  <TableCell>
                    <button
                      onClick={() =>
                        router.push(
                          `/admin/zones/${category.zone_id}/categories/${category.id}/edit`
                        )
                      }
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      {category.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{category.zone_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-gray-600">
                    {category.item_count || 0}
                  </TableCell>
                  <TableCell className="text-center text-gray-600">{category.weight}</TableCell>
                  <TableCell>
                    {category.status === "active" ? (
                      <Badge variant="success">{t("status.active")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("status.hidden")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/zones/${category.zone_id}/categories/${category.id}/edit`
                          )
                        }
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
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
