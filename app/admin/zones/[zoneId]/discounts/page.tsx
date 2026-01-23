"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, HelpCircle, Settings2, Download, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DiscountFormModal } from "@/components/admin/glamping/DiscountFormModal";
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

export default function DiscountsPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.discounts");
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editDiscountId, setEditDiscountId] = useState<string | null>(null);

  // Redirect to dashboard if "all" zones selected (not supported on this page)
  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  useEffect(() => {
    if (zoneId !== "all") {
      fetchDiscounts();
    }
  }, [zoneId]); // Re-fetch when zone changes

  const fetchDiscounts = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/discounts?zone_id=${zoneId}`);
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
      toast({
        title: t("errorLoadTitle"),
        description: t("errorLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (discountId: string) => {
    setEditDiscountId(discountId);
    setShowCreateModal(true);
  };

  const handleModalClose = (open: boolean) => {
    setShowCreateModal(open);
    if (!open) {
      setEditDiscountId(null); // Reset edit mode
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${Math.round(value)}%`;
    }
    return `${Math.round(value).toLocaleString('vi-VN')} đ`;
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
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("addNew")}
        </Button>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.dateAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.dateAll")}</SelectItem>
            <SelectItem value="active">{t("filters.dateActiveNow")}</SelectItem>
            <SelectItem value="upcoming">{t("filters.dateUpcoming")}</SelectItem>
            <SelectItem value="expired">{t("filters.dateExpired")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.typeAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.typeAll")}</SelectItem>
            <SelectItem value="percentage">{t("filters.typePercentage")}</SelectItem>
            <SelectItem value="fixed">{t("filters.typeFixed")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.code")}</TableHead>
              <TableHead className="text-center">{t("table.startDate")}</TableHead>
              <TableHead className="text-center">{t("table.endDate")}</TableHead>
              <TableHead className="text-center">{t("table.discount")}</TableHead>
              <TableHead>{t("table.rules")}</TableHead>
              <TableHead className="text-right">{t("table.status")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : filteredDiscounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {t("noDiscountsFound")}
                </TableCell>
              </TableRow>
            ) : (
              filteredDiscounts.map((discount, index) => (
                <TableRow key={discount.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                  <TableCell>
                    <span className="font-medium">{discount.name}</span>
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
                    {discount.rules_name || t("table.defaultRules")}
                  </TableCell>
                  <TableCell className="text-right">
                    {discount.status === 'active' ? (
                      <Badge variant="success">{t("status.active")}</Badge>
                    ) : discount.status === 'expired' ? (
                      <Badge variant="secondary">{t("status.expired")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("status.inactive")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(discount.id)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {t("table.edit")}
                    </Button>
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
          {t("viewPagination", { start: 1, end: filteredDiscounts.length, total: filteredDiscounts.length })}
        </div>
      )}

      {/* Create Discount Modal */}
      <DiscountFormModal
        open={showCreateModal}
        onOpenChange={handleModalClose}
        onSuccess={fetchDiscounts}
        zoneId={zoneId}
        discountId={editDiscountId || undefined}
      />
    </div>
  );
}
