"use client";

import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type BookingFilterType } from "./daily-types";

interface FilterOption {
  id: string;
  name: string;
}

interface DailyBookingFiltersProps {
  variant: "manifest" | "daily-list";
  bookingFilter: BookingFilterType;
  onBookingFilterChange: (value: BookingFilterType) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onReset: () => void;
  categories: FilterOption[];
  items?: FilterOption[];
  itemId?: string;
  onItemChange?: (value: string) => void;
  locale?: string;
}

const BOOKING_STATUSES = [
  { value: "pending", labelEn: "Pending", labelVi: "Chờ xác nhận" },
  { value: "confirmed", labelEn: "Confirmed", labelVi: "Đã xác nhận" },
  { value: "checked_in", labelEn: "Checked In", labelVi: "Đã check-in" },
  { value: "checked_out", labelEn: "Checked Out", labelVi: "Đã check-out" },
  { value: "cancelled", labelEn: "Cancelled", labelVi: "Đã huỷ" },
];

export function DailyBookingFilters({
  variant,
  bookingFilter,
  onBookingFilterChange,
  categoryId,
  onCategoryChange,
  status,
  onStatusChange,
  search,
  onSearchChange,
  onSearchSubmit,
  onReset,
  categories,
  items,
  itemId,
  onItemChange,
  locale = "en",
}: DailyBookingFiltersProps) {
  const isVi = locale === "vi";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 sm:items-end">
        {/* Search */}
        <div className="col-span-2 sm:flex-1 sm:min-w-[200px]">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {isVi ? "Tìm kiếm" : "Search"}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder={isVi ? "Tên, mã booking, email..." : "Name, booking code, email..."}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Booking Filter (Starting/Ending/Staying) */}
        <div className="sm:w-[140px]">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {isVi ? "Đặt chỗ" : "Bookings"}
          </label>
          <Select
            value={bookingFilter}
            onValueChange={(v) => onBookingFilterChange(v as BookingFilterType)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staying">{isVi ? "Đang ở" : "Staying"}</SelectItem>
              <SelectItem value="starting">{isVi ? "Check-in" : "Starting"}</SelectItem>
              <SelectItem value="ending">{isVi ? "Check-out" : "Ending"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="sm:w-[160px]">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {isVi ? "Danh mục" : "Category"}
          </label>
          <Select value={categoryId} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={isVi ? "Tất cả" : "All"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isVi ? "Tất cả" : "All"}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Item filter (manifest only) */}
        {variant === "manifest" && items && onItemChange && (
          <div className="sm:w-[160px]">
            <label className="text-xs text-gray-500 mb-1.5 block">
              {isVi ? "Tent" : "Item"}
            </label>
            <Select value={itemId || "all"} onValueChange={onItemChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={isVi ? "Tất cả" : "All"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isVi ? "Tất cả" : "All"}</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status */}
        <div className="sm:w-[140px]">
          <label className="text-xs text-gray-500 mb-1.5 block">
            {isVi ? "Trạng thái" : "Status"}
          </label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={isVi ? "Tất cả" : "All"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isVi ? "Tất cả" : "All"}</SelectItem>
              {BOOKING_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {isVi ? s.labelVi : s.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset */}
        <div className="flex items-end">
          <Button
            variant="outline"
            size="icon"
            onClick={onReset}
            title={isVi ? "Đặt lại bộ lọc" : "Reset filters"}
            className="h-9 w-9"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
