"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, HelpCircle, Settings2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface Discount {
  id: string;
  name: string;
  code: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  recurrence: string;
  status: 'active' | 'inactive' | 'expired';
  rules_name?: string;
}

export default function DiscountsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.discounts");
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await fetch('/api/admin/glamping/discounts');
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
      toast({
        title: "Error",
        description: "Failed to load discounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `${value.toLocaleString('vi-VN')} đ`;
  };

  const filteredDiscounts = discounts.filter(discount => {
    // Search filter
    if (searchQuery && !discount.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !discount.code?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && discount.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && discount.discount_type !== typeFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Left side - Action button and filters */}
        <Button onClick={() => router.push('/admin/discounts/new')}>
          <Plus className="w-4 h-4 mr-2" />
          {t("addNew")}
        </Button>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Date: All - upcoming" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All - upcoming</SelectItem>
            <SelectItem value="active">Active now</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="percentage">Percentage</SelectItem>
            <SelectItem value="fixed">Fixed Amount</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search Discounts"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Right side - Utility buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm">
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-center">Start date</TableHead>
              <TableHead className="text-center">End date</TableHead>
              <TableHead className="text-center">Discount</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredDiscounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No discounts found
                </TableCell>
              </TableRow>
            ) : (
              filteredDiscounts.map((discount, index) => (
                <TableRow key={discount.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                  <TableCell className="text-muted-foreground">
                    {discount.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => router.push(`/admin/discounts/${discount.id}/edit`)}
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      {discount.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    {discount.code ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{discount.code}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
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
                  <TableCell className="text-muted-foreground">
                    {discount.rules_name || 'Default'}
                  </TableCell>
                  <TableCell className="text-right">
                    {discount.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : discount.status === 'expired' ? (
                      <Badge variant="secondary">Expired</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination info */}
      {!loading && filteredDiscounts.length > 0 && (
        <div className="text-sm text-muted-foreground text-right">
          View 1 - {filteredDiscounts.length} of {filteredDiscounts.length}
        </div>
      )}
    </div>
  );
}
