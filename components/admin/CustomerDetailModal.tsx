"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  RefreshCcw,
  Edit,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";

interface CustomerDetailModalProps {
  customerId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (customerId: string) => void;
}

interface CustomerDetail {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  country: string;
  address_line1: string;
  city: string;
  postal_code: string;
  marketing_consent: boolean;
  email_verified: boolean;
  is_registered: boolean;
  total_bookings: number;
  total_spent: number;
  last_booking_date: string;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  booking_reference: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  created_at: string;
  campsite_name: MultilingualText | string;
}

export default function CustomerDetailModal({
  customerId,
  open,
  onClose,
  onEdit,
}: CustomerDetailModalProps) {
  const t = useTranslations("admin.customerDetail");
  const tCommon = useTranslations("common");
  const tAdmin = useTranslations("admin");
  const { toast } = useToast();
  const { locale } = useAdminLocale();
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (customerId && open) {
      fetchCustomerDetail();
    }
  }, [customerId, open]);

  const fetchCustomerDetail = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`);
      const data = await response.json();

      if (data.success) {
        setCustomer(data.data.customer);
        setBookings(data.data.bookings);
      } else {
        toast({
          title: t("error"),
          description: t("fetchError"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching customer detail:", error);
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      confirmed: { label: tAdmin("confirmed"), className: "bg-green-100 text-green-700" },
      pending: { label: tAdmin("pending"), className: "bg-yellow-100 text-yellow-700" },
      cancelled: { label: tAdmin("cancelled"), className: "bg-red-100 text-red-700" },
      completed: { label: tAdmin("completed"), className: "bg-blue-100 text-blue-700" },
    };
    return statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  };

  if (!customer) {
    return null;
  }

  const tier = getCustomerTier(customer.total_spent);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(customer.id);
                  onClose();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t("edit")}
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCcw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={tier.className}>{tier.label}</Badge>
                        {customer.is_registered && (
                          <Badge className="bg-blue-100 text-blue-700">
                            {tAdmin("confirmed")}
                          </Badge>
                        )}
                        {customer.email_verified && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Email verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{t("email")}:</span>
                        <span className="text-sm font-medium">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{t("phone")}:</span>
                          <span className="text-sm font-medium">{customer.phone}</span>
                        </div>
                      )}
                      {customer.country && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{t("country")}:</span>
                          <span className="text-sm font-medium">{customer.country}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{t("totalBookings")}:</span>
                        <span className="text-sm font-medium">{customer.total_bookings}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{t("totalSpent")}:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(customer.total_spent)}
                        </span>
                      </div>
                      {customer.last_booking_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{tAdmin("customersPage.lastBooking")}:</span>
                          <span className="text-sm font-medium">
                            {new Date(customer.last_booking_date).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  {(customer.address_line1 || customer.city || customer.postal_code) && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        {t("address")}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {[customer.address_line1, customer.city, customer.postal_code]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="pt-4 border-t text-xs text-gray-500">
                    <p>{tAdmin("customersPage.createdAt")}: {new Date(customer.created_at).toLocaleString("vi-VN")}</p>
                    <p>{tCommon("refresh")}: {new Date(customer.updated_at).toLocaleString("vi-VN")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking History */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                {t("bookingHistory")} ({bookings.length})
              </h3>
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    {t("noBookings")}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => {
                    const statusBadge = getStatusBadge(booking.status);
                    return (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-gray-900">
                                  {booking.booking_reference}
                                </span>
                                <Badge className={statusBadge.className}>
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <div className="text-gray-600">
                                  <span className="font-medium">{t("campsite")}:</span>{" "}
                                  {getLocalizedText(booking.campsite_name, locale) || "N/A"}
                                </div>
                                <div className="text-gray-600">
                                  <span className="font-medium">{t("checkIn")}:</span>{" "}
                                  {new Date(booking.check_in_date).toLocaleDateString("vi-VN")}
                                </div>
                                <div className="text-gray-600">
                                  <span className="font-medium">{t("checkOut")}:</span>{" "}
                                  {new Date(booking.check_out_date).toLocaleDateString("vi-VN")}
                                </div>
                                <div className="text-gray-600">
                                  <span className="font-medium">{t("amount")}:</span>{" "}
                                  {formatCurrency(booking.total_amount)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
