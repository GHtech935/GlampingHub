"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users2,
  Search,
  RefreshCcw,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Info,
  FileBarChart,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import CustomerDetailModal from "@/components/admin/CustomerDetailModal";
import CustomerFormModal from "@/components/admin/CustomerFormModal";
import CustomerExportModal from "@/components/admin/CustomerExportModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard, StatCardGrid } from "@/components/admin/StatCard";

interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  total_bookings: number;
  total_spent: number;
  last_booking_date: string;
  created_at: string;
}

export default function AllZonesCustomersPage() {
  const { toast } = useToast();
  const t = useTranslations("admin.customersPage");
  const tCommon = useTranslations("common");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tierInfoOpen, setTierInfoOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [search, zoneFilter]);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.user?.role || null);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchUserRole();
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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (zoneFilter && zoneFilter !== "all") {
        params.append("zoneId", zoneFilter);
      }

      const response = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data);
        setTotal(data.total);
      } else {
        toast({
          title: t("error"),
          description: t("fetchError"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: t("error"),
        description: t("fetchError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent >= 50000000) {
      return { label: "VIP", className: "bg-purple-100 text-purple-700" };
    } else if (totalSpent >= 20000000) {
      return { label: "Gold", className: "bg-yellow-100 text-yellow-700" };
    } else if (totalSpent >= 5000000) {
      return { label: "Silver", className: "bg-gray-100 text-gray-700" };
    } else {
      return { label: "Bronze", className: "bg-orange-100 text-orange-700" };
    }
  };

  const handleViewDetail = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setDetailModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCustomerId(null);
    setFormModalOpen(true);
  };

  const handleEdit = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete({
      id: customer.id,
      name: `${customer.first_name} ${customer.last_name}`,
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t("success"),
          description: t("deleteSuccess"),
        });
        fetchCustomers();
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
      } else {
        toast({
          title: t("error"),
          description: data.error || t("deleteFailed"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: t("error"),
        description: t("deleteFailed"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    try {
      const headers = [
        "Email",
        "First Name",
        "Last Name",
        "Phone",
        "Country",
        "Total Bookings",
        "Total Spent",
        "Last Booking",
        "Created At",
      ];

      const csvRows = [
        headers.join(","),
        ...customers.map((c) =>
          [
            c.email,
            c.first_name,
            c.last_name,
            c.phone || "",
            c.country || "",
            c.total_bookings,
            c.total_spent,
            c.last_booking_date
              ? new Date(c.last_booking_date).toLocaleDateString("vi-VN")
              : "",
            new Date(c.created_at).toLocaleDateString("vi-VN"),
          ].join(",")
        ),
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `customers_all_zones_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: t("success"),
        description: t("exportSuccess"),
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: t("error"),
        description: t("exportFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("allTitle")}</h1>
          <p className="text-gray-600 mt-1">{t("allSubtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTierInfoOpen(true)}
            title={t("tierInfo")}
          >
            <Info className="w-5 h-5 text-blue-600" />
          </Button>
          <Button variant="outline" onClick={() => setExportModalOpen(true)}>
            <FileBarChart className="w-4 h-4 mr-2" />
            {t("exportReport")}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={customers.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {t("exportCsv")}
          </Button>
          <Button variant="outline" onClick={() => fetchCustomers()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t("refresh")}
          </Button>
          {userRole !== "owner" && (
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addCustomer")}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <StatCardGrid>
          <StatCard
            title={`${t("total")} ${t("customers")}`}
            value={total}
            icon={Users2}
            color="blue"
          />
          <StatCard
            title={t("vip")}
            value={customers.filter((c) => c.total_spent >= 50000000).length}
            icon={Users2}
            color="purple"
          />
          <StatCard
            title={t("bookings")}
            value={customers.reduce((sum, c) => sum + c.total_bookings, 0)}
            icon={ShoppingBag}
            color="green"
          />
          <StatCard
            title={t("totalRevenue")}
            value={formatCurrency(
              customers.reduce((sum, c) => sum + c.total_spent, 0)
            )}
            icon={DollarSign}
            color="orange"
          />
        </StatCardGrid>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("zoneLabel")} />
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
        </CardContent>
      </Card>

      {/* Customers Table */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCcw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      {t("customer")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      {t("contact")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      {t("tier")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      {t("bookingCount")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      {t("totalSpent")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      {t("lastBooking")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      {t("createdAt")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        {t("noCustomers")}
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => {
                      const tier = getCustomerTier(customer.total_spent);
                      return (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {customer.first_name} {customer.last_name}
                              </p>
                              <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                <Mail className="w-3 h-3" />
                                {customer.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Phone className="w-3 h-3" />
                                  {customer.phone}
                                </div>
                              )}
                              {customer.country && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <MapPin className="w-3 h-3" />
                                  {customer.country}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={tier.className}>
                              {tier.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <ShoppingBag className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">
                                {customer.total_bookings}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">
                                {formatCurrency(customer.total_spent)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {customer.last_booking_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(
                                  customer.last_booking_date
                                ).toLocaleDateString("vi-VN")}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(customer.created_at).toLocaleDateString(
                              "vi-VN"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(customer.id)}
                                title={t("view")}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {userRole !== "owner" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(customer.id)}
                                    title={t("edit")}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(customer)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title={t("delete")}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CustomerDetailModal
        customerId={selectedCustomerId}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCustomerId(null);
        }}
        onEdit={handleEdit}
      />

      <CustomerFormModal
        customerId={selectedCustomerId}
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedCustomerId(null);
        }}
        onSuccess={() => {
          fetchCustomers();
        }}
      />

      <CustomerExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />

      {/* Tier Info Dialog */}
      <Dialog open={tierInfoOpen} onOpenChange={setTierInfoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {t("tierSystem.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                {t("tierSystem.description")}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Badge className="bg-purple-100 text-purple-700 text-base px-4 py-1">
                  {t("tierSystem.vip")}
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {t("tierSystem.vipDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <Badge className="bg-yellow-100 text-yellow-700 text-base px-4 py-1">
                  {t("tierSystem.gold")}
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {t("tierSystem.goldDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Badge className="bg-gray-100 text-gray-700 text-base px-4 py-1">
                  {t("tierSystem.silver")}
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {t("tierSystem.silverDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Badge className="bg-orange-100 text-orange-700 text-base px-4 py-1">
                  {t("tierSystem.bronze")}
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {t("tierSystem.bronzeDesc")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                {t("tierSystem.benefits")}
              </h4>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
