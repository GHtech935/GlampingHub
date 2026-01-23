"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Edit, Trash, MapPin } from "lucide-react";
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

interface Tag {
  id: string;
  name: string;
  weight: number;
  visibility: string;
  item_count?: number;
  zone_id: string;
  zone_name: string;
}

export default function AllZonesTagsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.tags");
  const tc = useTranslations("admin.glamping.common");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [sortField, setSortField] = useState<"name" | "weight">("weight");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchZones();
    fetchTags();
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

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/admin/glamping/tags");
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
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

  const handleDelete = async (tagId: string) => {
    if (!confirm(tc("confirmDelete"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/glamping/tags/${tagId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete tag");
      }

      toast({
        title: tc("success"),
        description: "Tag deleted successfully",
      });

      fetchTags();
    } catch (error) {
      console.error("Failed to delete tag:", error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    }
  };

  const filteredTags = tags.filter((tag) => {
    const matchesVisibility =
      filterVisibility === "all" ||
      (filterVisibility === "everyone" && tag.visibility === "everyone") ||
      (filterVisibility === "staff" && tag.visibility === "staff");

    const matchesZone = zoneFilter === "all" || tag.zone_id === zoneFilter;

    return matchesVisibility && matchesZone;
  });

  const sortedTags = [...filteredTags].sort((a, b) => {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">All Categories & Tags</h1>

        <Tabs value="tags" className="w-full">
          <TabsList>
            <TabsTrigger
              value="categories"
              onClick={() => router.push("/admin/zones/all/categories")}
            >
              Categories
            </TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Visibility:</label>
          <Select value={filterVisibility} onValueChange={setFilterVisibility}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="everyone">Everyone</SelectItem>
              <SelectItem value="staff">Staff Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Zone:</label>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
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
              <TableHead className="w-24">ID</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  {t("table.name")}
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead>Zone</TableHead>
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
              <TableHead>{t("table.visibility")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {tc("loading")}
                </TableCell>
              </TableRow>
            ) : sortedTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            ) : (
              sortedTags.map((tag, index) => (
                <TableRow key={tag.id} className={index % 2 === 1 ? "bg-gray-50" : ""}>
                  <TableCell className="text-gray-600">#{tag.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <button
                      onClick={() =>
                        router.push(
                          `/admin/zones/${tag.zone_id}/tags/${tag.id}/edit`
                        )
                      }
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      {tag.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{tag.zone_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-gray-600">
                    {tag.item_count || 0}
                  </TableCell>
                  <TableCell className="text-center text-gray-600">{tag.weight}</TableCell>
                  <TableCell>
                    {tag.visibility === "everyone" ? (
                      <Badge variant="default">{t("visibility.everyone")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("visibility.staff")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/zones/${tag.zone_id}/tags/${tag.id}/edit`
                          )
                        }
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag.id)}
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
