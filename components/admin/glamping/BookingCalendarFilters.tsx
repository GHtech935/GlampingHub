"use client";

import { useState } from "react";
import { Search, Plus, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { CalendarFilters, CalendarFilterOptions } from "./calendar-types";
import { DEFAULT_CALENDAR_FILTERS, DEFAULT_STATUSES } from "./calendar-types";
import type { BookingStatus } from "./types";

interface BookingCalendarFiltersProps {
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  filterOptions: CalendarFilterOptions;
  onNewBooking?: () => void;
  locale: string;
}

const BOOKING_STATUSES: { value: BookingStatus; labelVi: string; labelEn: string; color: string }[] = [
  { value: 'pending', labelVi: 'Chờ xác nhận', labelEn: 'Pending', color: 'bg-orange-500' },
  { value: 'confirmed', labelVi: 'Đã xác nhận', labelEn: 'Confirmed', color: 'bg-blue-500' },
  { value: 'checked_in', labelVi: 'Đã check-in', labelEn: 'Checked In', color: 'bg-green-500' },
  { value: 'checked_out', labelVi: 'Đã check-out', labelEn: 'Checked Out', color: 'bg-gray-400' },
  { value: 'cancelled', labelVi: 'Đã hủy', labelEn: 'Cancelled', color: 'bg-red-500' },
];

export function BookingCalendarFilters({
  filters,
  onFiltersChange,
  filterOptions,
  onNewBooking,
  locale,
}: BookingCalendarFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  const updateFilter = <K extends keyof CalendarFilters>(
    key: K,
    value: CalendarFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchValue);
  };

  const clearSearch = () => {
    setSearchValue('');
    updateFilter('search', '');
  };

  const resetFilters = () => {
    setSearchValue('');
    onFiltersChange(DEFAULT_CALENDAR_FILTERS);
  };

  // Check if statuses differ from default (not just length, but actual values)
  const statusesChanged = filters.statuses.length !== DEFAULT_STATUSES.length ||
    !filters.statuses.every(s => DEFAULT_STATUSES.includes(s));

  const hasActiveFilters =
    filters.categoryId !== 'all' ||
    filters.itemId !== 'all' ||
    statusesChanged ||
    filters.source !== 'all' ||
    filters.search !== '';

  // Toggle a status in the filter
  const toggleStatus = (status: BookingStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    // Don't allow empty selection - keep at least one
    if (newStatuses.length > 0) {
      updateFilter('statuses', newStatuses);
    }
  };

  // Filter items by selected category
  const filteredItems = filters.categoryId !== 'all'
    ? filterOptions.items.filter(item => item.categoryId === filters.categoryId)
    : filterOptions.items;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Top Row: Search and New Booking */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={
                filters.searchType === 'customer'
                  ? (locale === 'vi' ? 'Tìm theo tên, email, SĐT, mã booking...' : 'Search by name, email, phone, booking code...')
                  : (locale === 'vi' ? 'Tìm theo tên lều, SKU...' : 'Search by tent name, SKU...')
              }
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={filters.searchType}
            onValueChange={(value: 'customer' | 'item') => updateFilter('searchType', value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">{locale === 'vi' ? 'Khách' : 'Customer'}</SelectItem>
              <SelectItem value="item">{locale === 'vi' ? 'Lều' : 'Item'}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            {locale === 'vi' ? 'Tìm' : 'Search'}
          </Button>
        </form>

        {/* New Booking Button */}
        {onNewBooking && (
          <Button onClick={onNewBooking} className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            {locale === 'vi' ? 'Đặt mới' : 'New Booking'}
          </Button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Category Filter */}
        <div className="w-[180px]">
          <Label className="text-xs text-gray-500 mb-1 block">
            {locale === 'vi' ? 'Danh mục' : 'Category'}
          </Label>
          <Select
            value={filters.categoryId}
            onValueChange={(value) => {
              updateFilter('categoryId', value);
              // Reset item filter when category changes
              if (value !== filters.categoryId) {
                updateFilter('itemId', 'all');
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={locale === 'vi' ? 'Tất cả' : 'All'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{locale === 'vi' ? 'Tất cả danh mục' : 'All Categories'}</SelectItem>
              {filterOptions.categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Item Filter */}
        <div className="w-[180px]">
          <Label className="text-xs text-gray-500 mb-1 block">
            {locale === 'vi' ? 'Lều' : 'Item'}
          </Label>
          <Select
            value={filters.itemId}
            onValueChange={(value) => updateFilter('itemId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={locale === 'vi' ? 'Tất cả' : 'All'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{locale === 'vi' ? 'Tất cả lều' : 'All Items'}</SelectItem>
              {filteredItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter - Dropdown with Checkboxes */}
        <div className="w-[200px]">
          <Label className="text-xs text-gray-500 mb-1 block">
            {locale === 'vi' ? 'Trạng thái' : 'Status'}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between font-normal"
              >
                <span className="truncate">
                  {filters.statuses.length === BOOKING_STATUSES.length
                    ? (locale === 'vi' ? 'Tất cả trạng thái' : 'All statuses')
                    : filters.statuses.length === 0
                    ? (locale === 'vi' ? 'Chọn trạng thái' : 'Select status')
                    : `${filters.statuses.length} ${locale === 'vi' ? 'đã chọn' : 'selected'}`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <div className="p-2 space-y-1">
                {BOOKING_STATUSES.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.statuses.includes(status.value)}
                      onCheckedChange={() => toggleStatus(status.value)}
                      className="h-4 w-4"
                    />
                    <span className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                    <span className="text-sm text-gray-700">
                      {locale === 'vi' ? status.labelVi : status.labelEn}
                    </span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Source Filter */}
        <div className="w-[180px]">
          <Label className="text-xs text-gray-500 mb-1 block">
            {locale === 'vi' ? 'Nguồn' : 'Source'}
          </Label>
          <Select
            value={filters.source}
            onValueChange={(value) => updateFilter('source', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={locale === 'vi' ? 'Tất cả' : 'All'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{locale === 'vi' ? 'Tất cả nguồn' : 'All Sources'}</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="admin">{locale === 'vi' ? 'Admin (tất cả)' : 'Admin (all)'}</SelectItem>
              {filterOptions.adminUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Show All Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <Switch
            id="show-all"
            checked={filters.showAllBookings}
            onCheckedChange={(checked) => updateFilter('showAllBookings', checked)}
          />
          <Label htmlFor="show-all" className="text-sm cursor-pointer whitespace-nowrap">
            {locale === 'vi' ? 'Hiện tất cả' : 'Show all'}
          </Label>
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-gray-500"
          >
            <X className="h-4 w-4 mr-1" />
            {locale === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
          </Button>
        )}
      </div>
    </div>
  );
}
