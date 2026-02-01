"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Search, RotateCcw, ChevronLeft, ChevronRight, RefreshCw, Eye, Mail, Phone, Calendar, Users, MapPin, Plus, BookOpen, CheckCircle, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";
import { GlampingBookingDetailModal } from "@/components/admin/glamping/GlampingBookingDetailModal";
import { AdminGlampingBookingFormModal } from "@/components/admin/AdminGlampingBookingFormModal";
import { StatCard, StatCardGrid } from "@/components/admin/StatCard";

// Types
interface GlampingBooking {
  id: string;
  bookingCode: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  paymentStatus: 'pending' | 'deposit_paid' | 'fully_paid' | 'refund_pending' | 'refunded' | 'no_refund' | 'expired';
  dates: {
    checkIn: string;
    checkOut: string;
    checkInTime?: string;
    checkOutTime?: string;
    nights: number;
  };
  guests: Record<string, number>;
  totalGuests: number;
  pricing: {
    subtotalAmount: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    depositDue: number;
    balanceDue: number;
    currency: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
  };
  item: {
    id: string;
    name: string;
  };
  zone: {
    id: string;
    name: MultilingualText | string;
  };
  notes: {
    customer?: string;
    internal?: string;
  };
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalBookings: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface BookingFilters {
  status: string;
  paymentStatus: string;
  dateRange: string;
  dateFrom?: string;
  dateTo?: string;
  search: string;
}

// Status configuration - aligned with camping
const BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'deposit_paid', 'fully_paid', 'refund_pending', 'refunded', 'no_refund', 'expired'] as const;

type BookingStatus = typeof BOOKING_STATUSES[number];
type PaymentStatus = typeof PAYMENT_STATUSES[number];

const getStatusVariant = (status: BookingStatus): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    confirmed: "default",
    checked_in: "default",
    checked_out: "default",
    cancelled: "destructive",
  };
  return variants[status] || "secondary";
};

const getStatusLabel = (status: BookingStatus, locale: string): string => {
  const labels: Record<BookingStatus, { vi: string; en: string }> = {
    pending: { vi: "Chờ xác nhận", en: "Pending" },
    confirmed: { vi: "Đã xác nhận", en: "Confirmed" },
    checked_in: { vi: "Đã check-in", en: "Checked In" },
    checked_out: { vi: "Đã check-out", en: "Checked Out" },
    cancelled: { vi: "Đã huỷ", en: "Cancelled" },
  };
  return labels[status]?.[locale as 'vi' | 'en'] || status;
};

const getPaymentStatusVariant = (status: PaymentStatus): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    deposit_paid: "secondary",
    fully_paid: "default",
    refund_pending: "secondary",
    refunded: "secondary",
    no_refund: "outline",
    expired: "destructive",
  };
  return variants[status] || "outline";
};

const getPaymentStatusLabel = (status: PaymentStatus, locale: string): string => {
  const labels: Record<PaymentStatus, { vi: string; en: string }> = {
    pending: { vi: "Chờ thanh toán", en: "Pending" },
    deposit_paid: { vi: "Đã đặt cọc", en: "Deposit Paid" },
    fully_paid: { vi: "Đã thanh toán đủ", en: "Fully Paid" },
    refund_pending: { vi: "Chờ hoàn tiền", en: "Refund Pending" },
    refunded: { vi: "Đã hoàn tiền", en: "Refunded" },
    no_refund: { vi: "Không hoàn tiền", en: "No Refund" },
    expired: { vi: "Hết hạn thanh toán", en: "Expired" },
  };
  return labels[status]?.[locale as 'vi' | 'en'] || status;
};

export default function GlampingBookingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const zoneId = params.zoneId as string;
  const t = useTranslations('admin.bookingsPage');
  const tFilter = useTranslations('admin.bookingsFilter');
  const tTable = useTranslations('admin.bookingsTable');
  const { locale } = useAdminLocale();

  const [bookings, setBookings] = useState<GlampingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalBookings: 0,
    limit: 20,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [filters, setFilters] = useState<BookingFilters>({
    status: "all",
    paymentStatus: "all",
    dateRange: "all",
    search: "",
  });
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);
  const [initialBookingData, setInitialBookingData] = useState<{
    itemId?: string;
    checkIn?: string;
    checkOut?: string;
  } | null>(null);
  const hasHandledQueryParams = useRef(false);
  const [stats, setStats] = useState<{
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    totalRevenue: number;
  } | null>(null);

  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, [filters, pagination.currentPage, zoneId]);

  // Handle query params for auto-opening create modal
  useEffect(() => {
    if (hasHandledQueryParams.current) return;

    const action = searchParams.get('action');
    if (action === 'create') {
      hasHandledQueryParams.current = true;
      const itemId = searchParams.get('itemId');
      const checkIn = searchParams.get('checkIn');
      const checkOut = searchParams.get('checkOut');

      setInitialBookingData({
        itemId: itemId || undefined,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
      });
      setShowCreateBookingModal(true);

      // Clean up URL params
      router.replace(`/admin/zones/${zoneId}/bookings`, { scroll: false });
    }
  }, [searchParams, zoneId, router]);

  const fetchBookings = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      params.append("page", pagination.currentPage.toString());
      params.append("limit", pagination.limit.toString());

      // Add zone filter
      if (zoneId && zoneId !== "all") {
        params.append("zoneId", zoneId);
      }

      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.paymentStatus && filters.paymentStatus !== "all") {
        params.append("paymentStatus", filters.paymentStatus);
      }
      if (filters.dateRange && filters.dateRange !== "all") {
        params.append("dateRange", filters.dateRange);
        if (filters.dateRange === "custom" && filters.dateFrom && filters.dateTo) {
          params.append("dateFrom", filters.dateFrom);
          params.append("dateTo", filters.dateTo);
        }
      }
      if (filters.search) {
        params.append("search", filters.search);
      }

      const response = await fetch(`/api/admin/glamping/bookings?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data.bookings);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      toast.error(t('fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (zoneId && zoneId !== "all") {
        params.append("zoneId", zoneId);
      }
      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.paymentStatus && filters.paymentStatus !== "all") {
        params.append("paymentStatus", filters.paymentStatus);
      }
      if (filters.dateRange && filters.dateRange !== "all") {
        params.append("dateRange", filters.dateRange);
        if (filters.dateRange === "custom" && filters.dateFrom && filters.dateTo) {
          params.append("dateFrom", filters.dateFrom);
          params.append("dateTo", filters.dateTo);
        }
      }
      if (filters.search) {
        params.append("search", filters.search);
      }

      const response = await fetch(`/api/admin/glamping/bookings/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch booking stats:", error);
    }
  };

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleSearchSubmit = () => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleReset = () => {
    setFilters({
      status: "all",
      paymentStatus: "all",
      dateRange: "all",
      search: "",
    });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  const handleViewDetails = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedBookingId(null);
    setIsDetailModalOpen(false);
  };

  const handleUpdateBooking = () => {
    fetchBookings();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            {t('totalBookings', { count: pagination.totalBookings })}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {zoneId !== "all" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowCreateBookingModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 touch-manipulation"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">{locale === 'vi' ? 'Tạo Booking' : 'Create Booking'}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBookings}
            className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 touch-manipulation"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">{t('refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <StatCardGrid>
          <StatCard
            title={locale === 'vi' ? 'Tổng Booking' : 'Total Bookings'}
            value={stats.totalBookings}
            icon={BookOpen}
            color="blue"
          />
          <StatCard
            title={locale === 'vi' ? 'Đã Xác Nhận' : 'Confirmed'}
            value={stats.confirmedBookings}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title={locale === 'vi' ? 'Chờ Xử Lý' : 'Pending'}
            value={stats.pendingBookings}
            icon={Clock}
            color="orange"
          />
          <StatCard
            title={locale === 'vi' ? 'Tổng Doanh Thu' : 'Total Revenue'}
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            color="emerald"
          />
        </StatCardGrid>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        {/* Search bar - full width on mobile */}
        <div className="mb-3 sm:mb-0 sm:hidden">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {tFilter('search')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder={tFilter('searchPlaceholder')}
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Filters grid - responsive */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3 sm:items-end">
          {/* Search bar - desktop only */}
          <div className="hidden sm:block sm:flex-1">
            <label className="text-xs text-gray-500 mb-1.5 block">
              {tFilter('search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder={tFilter('searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                className="pl-10"
              />
            </div>
          </div>

          {/* Booking Status filter */}
          <div className="sm:w-40">
            <label className="text-xs text-gray-500 mb-1.5 block">
              {tFilter('status')}
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder={tFilter('all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilter('all')}</SelectItem>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getStatusLabel(s, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Status filter */}
          <div className="sm:w-40">
            <label className="text-xs text-gray-500 mb-1.5 block">
              {locale === 'vi' ? 'Thanh toán' : 'Payment'}
            </label>
            <Select
              value={filters.paymentStatus}
              onValueChange={(value) => handleFilterChange("paymentStatus", value)}
            >
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder={tFilter('all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilter('all')}</SelectItem>
                {PAYMENT_STATUSES.map((ps) => (
                  <SelectItem key={ps} value={ps}>
                    {getPaymentStatusLabel(ps, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range filter */}
          <div className="sm:w-40">
            <label className="text-xs text-gray-500 mb-1.5 block">
              {tFilter('dateRange')}
            </label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => handleFilterChange("dateRange", value)}
            >
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder={tFilter('all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilter('all')}</SelectItem>
                <SelectItem value="today">{tFilter('today')}</SelectItem>
                <SelectItem value="this_week">{tFilter('thisWeek')}</SelectItem>
                <SelectItem value="this_month">{tFilter('thisMonth')}</SelectItem>
                <SelectItem value="custom">{tFilter('custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset button */}
          <div className="flex items-end col-span-2 sm:col-span-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              title={tFilter('resetFilters')}
              className="h-9 sm:h-10 w-full sm:w-10"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Custom date range inputs (if selected) */}
        {filters.dateRange === "custom" && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {tFilter('fromDate')}
              </label>
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {tFilter('toDate')}
              </label>
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-gray-600">{tTable('loading')}</span>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">{tTable('noBookings')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTable('bookingCode')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTable('customer')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {locale === 'vi' ? 'Khu vực / Tent' : 'Zone / Item'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTable('stayDates')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTable('guests')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTable('status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTable('totalAmount')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTable('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => {
                  const zoneName = getLocalizedText(booking.zone.name, locale);
                  const itemName = booking.item.name;

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Booking Code */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {booking.bookingCode}
                        </span>
                        <div className="text-xs text-gray-500">
                          {formatDate(booking.createdAt)}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.customer.fullName || '-'}
                        </div>
                        {booking.customer.email && (
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {booking.customer.email}
                            </span>
                          </div>
                        )}
                        {booking.customer.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {booking.customer.phone}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Zone / Item */}
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {zoneName || '-'}
                            </div>
                            <div className="text-xs text-gray-600">
                              {itemName || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {formatDate(booking.dates.checkIn)} - {formatDate(booking.dates.checkOut)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {tTable('nights', { count: booking.dates.nights })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Guests */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <div className="text-sm text-gray-900">
                            {booking.totalGuests || 0}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <Badge variant={getStatusVariant(booking.status)} className="text-xs">
                            {getStatusLabel(booking.status, locale)}
                          </Badge>
                          <Badge variant={getPaymentStatusVariant(booking.paymentStatus)} className="text-xs">
                            {getPaymentStatusLabel(booking.paymentStatus, locale)}
                          </Badge>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(booking.pricing.totalAmount)}
                        </div>
                        {booking.pricing.balanceDue > 0 && (
                          <div className="text-xs text-gray-600">
                            {tTable('remaining', { amount: formatCurrency(booking.pricing.balanceDue) })}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(booking.id)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          {tTable('view')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            {t('pageInfo', { current: pagination.currentPage, total: pagination.totalPages })} •{" "}
            <span className="hidden sm:inline">{t('showing')} </span>
            {bookings.length} / {pagination.totalBookings}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              className="h-9 sm:h-10 touch-manipulation"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">{t('previous')}</span>
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    page === 1 ||
                    page === pagination.totalPages ||
                    Math.abs(page - pagination.currentPage) <= 2
                  );
                })
                .map((page, index, array) => {
                  const showEllipsisBefore =
                    index > 0 && page - array[index - 1] > 1;

                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsisBefore && (
                        <span className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">...</span>
                      )}
                      <Button
                        variant={
                          page === pagination.currentPage ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="min-w-[32px] sm:min-w-[40px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation"
                      >
                        {page}
                      </Button>
                    </div>
                  );
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="h-9 sm:h-10 touch-manipulation"
            >
              <span className="hidden sm:inline text-xs sm:text-sm">{t('next')}</span>
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      <GlampingBookingDetailModal
        bookingId={selectedBookingId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdate={handleUpdateBooking}
      />

      {/* Create Booking Modal */}
      <AdminGlampingBookingFormModal
        open={showCreateBookingModal}
        onClose={() => {
          setShowCreateBookingModal(false);
          setInitialBookingData(null);
        }}
        onSuccess={() => {
          setShowCreateBookingModal(false);
          setInitialBookingData(null);
          fetchBookings();
          toast.success(locale === 'vi' ? 'Tạo booking thành công' : 'Booking created successfully');
        }}
        zoneId={zoneId}
        locale={locale}
        initialData={initialBookingData}
      />
    </div>
  );
}
