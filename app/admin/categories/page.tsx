"use client";

import { useEffect, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface Category {
  id: string;
  name: string;
  weight: number;
  status: string;
  item_count?: number;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.categories");
  const tc = useTranslations("admin.glamping.common");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<'name' | 'weight'>('weight');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/glamping/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
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

  const handleDelete = async (categoryId: string) => {
    if (!confirm(tc("confirmDelete"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/glamping/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      toast({
        title: tc("success"),
        description: t("deleteSuccess"),
      });

      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter(category => {
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return category.status === "active";
    if (filterStatus === "hidden") return category.status === "hidden";
    return true;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
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

        <Tabs value="inventory" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger
                value="tags"
                onClick={() => router.push('/admin/tags')}
              >
                Tags
              </TabsTrigger>
            </TabsList>

            <Button onClick={() => router.push('/admin/categories/new')}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addNew")}
            </Button>
          </div>
        </Tabs>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Filter by:</label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-24">ID</TableHead>
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
                <TableRow key={category.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                  <TableCell className="text-gray-600">
                    #{category.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => router.push(`/admin/categories/${category.id}/edit`)}
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      {category.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-center text-gray-600">
                    {category.item_count || 0}
                  </TableCell>
                  <TableCell className="text-center text-gray-600">
                    {category.weight}
                  </TableCell>
                  <TableCell>
                    {category.status === 'active' ? (
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
                        onClick={() => router.push(`/admin/categories/${category.id}/edit`)}
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
