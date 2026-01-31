"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowUpDown, Edit, Trash } from "lucide-react";
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
import { TagFormModal } from "@/components/admin/glamping/TagFormModal";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface Tag {
  id: string;
  name: string;
  weight: number;
  visibility: string;
  item_count?: number;
}

export default function TagsPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.tags");
  const tc = useTranslations("admin.glamping.common");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [sortField, setSortField] = useState<'name' | 'weight'>('weight');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  // Redirect to dashboard if "all" zones selected (not supported on this page)
  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  useEffect(() => {
    if (zoneId !== "all") {
      fetchTags();
    }
  }, [zoneId]); // Re-fetch when zone changes

  const fetchTags = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/tags?zone_id=${zoneId}`);
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: 'name' | 'weight') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm(tc("confirmDelete"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/glamping/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      toast({
        title: tc("success"),
        description: t("deleteSuccess"),
      });

      fetchTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    }
  };

  const filteredTags = tags.filter(tag => {
    if (filterVisibility === "all") return true;
    if (filterVisibility === "staff") return tag.visibility === "staff";
    if (filterVisibility === "everyone") return tag.visibility === "everyone";
    return true;
  });

  const sortedTags = [...filteredTags].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'name') {
      return multiplier * a.name.localeCompare(b.name);
    } else {
      return multiplier * (a.weight - b.weight);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("title")}</h1>

        <Tabs value="tags" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger
                value="inventory"
                onClick={() => router.push(`/admin/zones/${zoneId}/categories`)}
              >
                Inventory
              </TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>

            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addNew")}
            </Button>
          </div>
        </Tabs>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Filter by:</label>
        <Select value={filterVisibility} onValueChange={setFilterVisibility}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="staff">Staff Only</SelectItem>
            <SelectItem value="everyone">Everyone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  {t("table.name")}
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead className="text-center">{t("table.items")}</TableHead>
              <TableHead className="text-center">
                <button
                  onClick={() => handleSort('weight')}
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
                <TableCell colSpan={5} className="text-center py-8">
                  {tc("loading")}
                </TableCell>
              </TableRow>
            ) : sortedTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            ) : (
              sortedTags.map((tag, index) => (
                <TableRow key={tag.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                  <TableCell>
                    <button
                      onClick={() => setEditingTag(tag)}
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      {tag.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-center text-gray-600">
                    {tag.item_count || 0}
                  </TableCell>
                  <TableCell className="text-center text-gray-600">
                    {tag.weight}
                  </TableCell>
                  <TableCell>
                    {tag.visibility === 'everyone' ? (
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
                        onClick={() => setEditingTag(tag)}
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

      {/* Create/Edit Tag Modal */}
      <TagFormModal
        open={showCreateModal || !!editingTag}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingTag(null);
          }
        }}
        onSuccess={() => {
          setShowCreateModal(false);
          setEditingTag(null);
          fetchTags();
        }}
        zoneId={zoneId}
        tag={editingTag}
      />
    </div>
  );
}
