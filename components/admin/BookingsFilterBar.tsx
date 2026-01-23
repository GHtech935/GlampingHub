"use client";

import { useState, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BOOKING_STATUSES, PAYMENT_STATUSES, getStatusLabel, getPaymentStatusLabel } from "@/lib/booking-status";
import type { BookingStatus, PaymentStatus } from "@/lib/booking-status";
import { useTranslations } from "next-intl";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";

interface BookingsFilterBarProps {
  onFilterChange: (filters: BookingFilters) => void;
}

export interface BookingFilters {
  status: string;  // booking status (can be 'all' or BookingStatus)
  paymentStatus: string; // payment status (can be 'all' or PaymentStatus)
  campsiteId: string;
  dateRange: string;
  dateFrom?: string;
  dateTo?: string;
  search: string;
}

interface Campsite {
  id: string;
  name: { vi: string; en: string } | string;
}

export function BookingsFilterBar({ onFilterChange }: BookingsFilterBarProps) {
  const t = useTranslations('admin.bookingsFilter');
  const { locale } = useAdminLocale();
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [filters, setFilters] = useState<BookingFilters>({
    status: "all",
    paymentStatus: "all",
    campsiteId: "all",
    dateRange: "all",
    search: "",
  });

  // Load campsites for filter dropdown
  useEffect(() => {
    fetchCampsites();
  }, []);

  const fetchCampsites = async () => {
    try {
      const response = await fetch("/api/admin/campsites");
      const result = await response.json();
      // API returns array directly, not { campsites: [...] }
      setCampsites(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Failed to fetch campsites:", error);
    }
  };

  // Helper to get campsite name from JSONB or string
  const getCampsiteName = (campsite: Campsite): string => {
    if (typeof campsite.name === 'string') return campsite.name;
    return campsite.name?.[locale as 'vi' | 'en'] || campsite.name?.vi || '';
  };

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    const updatedFilters = {
      ...filters,
      [key]: value,
    };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleSearchChange = (value: string) => {
    const updatedFilters = {
      ...filters,
      search: value,
    };
    setFilters(updatedFilters);

    // Debounce search
    const timeoutId = setTimeout(() => {
      onFilterChange(updatedFilters);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleReset = () => {
    const resetFilters: BookingFilters = {
      status: "all",
      paymentStatus: "all",
      campsiteId: "all",
      dateRange: "all",
      search: "",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      {/* Search bar - full width on mobile */}
      <div className="mb-3 sm:mb-0 sm:hidden">
        <label className="text-xs text-gray-500 mb-1.5 block">
          {t('search')}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Filters grid - responsive */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3 sm:items-end">
        {/* Search bar - desktop only */}
        <div className="hidden sm:block sm:flex-1">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {t('search')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Booking Status filter */}
        <div className="sm:w-40">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {t('status')}
          </label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger className="h-9 sm:h-10 text-sm">
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
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
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              {PAYMENT_STATUSES.map((ps) => (
                <SelectItem key={ps} value={ps}>
                  {getPaymentStatusLabel(ps, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campsite filter */}
        <div className="sm:w-40">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {t('campsite')}
          </label>
          <Select
            value={filters.campsiteId}
            onValueChange={(value) => handleFilterChange("campsiteId", value)}
          >
            <SelectTrigger className="h-9 sm:h-10 text-sm">
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              {campsites.map((campsite) => (
                <SelectItem key={campsite.id} value={campsite.id}>
                  {getCampsiteName(campsite)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range filter */}
        <div className="sm:w-40">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {t('dateRange')}
          </label>
          <Select
            value={filters.dateRange}
            onValueChange={(value) => handleFilterChange("dateRange", value)}
          >
            <SelectTrigger className="h-9 sm:h-10 text-sm">
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="today">{t('today')}</SelectItem>
              <SelectItem value="this_week">{t('thisWeek')}</SelectItem>
              <SelectItem value="this_month">{t('thisMonth')}</SelectItem>
              <SelectItem value="custom">{t('custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset button - Icon only */}
        <div className="flex items-end col-span-2 sm:col-span-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            title={t('resetFilters')}
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
              {t('fromDate')}
            </label>
            <Input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) =>
                handleFilterChange("dateFrom", e.target.value)
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {t('toDate')}
            </label>
            <Input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) =>
                handleFilterChange("dateTo", e.target.value)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
