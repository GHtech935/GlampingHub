"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import type {
  CustomerCalendarFilters as FilterType,
  ViewWeeks,
  CustomerCalendarCategory,
} from "./customer-calendar-types";
import { VIEW_WEEK_OPTIONS } from "./customer-calendar-types";

interface CustomerCalendarFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  categories: CustomerCalendarCategory[];
  locale: string;
  onExportPDF?: () => void;
  exportLoading?: boolean;
}

export function CustomerCalendarFilters({
  filters,
  onFiltersChange,
  categories,
  locale,
  onExportPDF,
  exportLoading = false,
}: CustomerCalendarFiltersProps) {
  const dateLocale = locale === "vi" ? vi : enUS;

  const updateFilter = <K extends keyof FilterType>(
    key: K,
    value: FilterType[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Calculate end date based on start date and view weeks
  const endDate = useMemo(() => {
    const end = new Date(filters.startDate);
    end.setDate(end.getDate() + filters.viewWeeks * 7 - 1);
    return end;
  }, [filters.startDate, filters.viewWeeks]);

  // Format date range for display
  const dateRangeDisplay = useMemo(() => {
    const startStr = format(filters.startDate, "d 'thg' M", { locale: dateLocale });
    const endStr = format(endDate, "d 'thg' M yyyy", { locale: dateLocale });
    return `${startStr} - ${endStr}`;
  }, [filters.startDate, endDate, dateLocale]);

  // Navigate to previous/next period
  const goToPrevious = () => {
    const newDate = new Date(filters.startDate);
    newDate.setDate(newDate.getDate() - filters.viewWeeks * 7);
    updateFilter("startDate", newDate);
  };

  const goToNext = () => {
    const newDate = new Date(filters.startDate);
    newDate.setDate(newDate.getDate() + filters.viewWeeks * 7);
    updateFilter("startDate", newDate);
  };

  const goToToday = () => {
    updateFilter("startDate", new Date());
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    const newCategoryIds = filters.categoryIds.includes(categoryId)
      ? filters.categoryIds.filter((id) => id !== categoryId)
      : [...filters.categoryIds, categoryId];
    updateFilter("categoryIds", newCategoryIds);
  };

  // Check if all categories are selected (or none = all)
  const allCategoriesSelected =
    filters.categoryIds.length === 0 ||
    filters.categoryIds.length === categories.length;

  const toggleAllCategories = () => {
    if (allCategoriesSelected) {
      if (categories.length > 0) {
        updateFilter("categoryIds", [categories[0].id]);
      }
    } else {
      updateFilter("categoryIds", []);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Single Row: All filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Navigation */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[180px] justify-center font-normal"
              >
                {dateRangeDisplay}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => date && updateFilter("startDate", date)}
                locale={dateLocale}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Today Button */}
        <Button variant="outline" onClick={goToToday}>
          {locale === "vi" ? "Hôm nay" : "Today"}
        </Button>

        {/* View Weeks Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {locale === "vi" ? "Xem:" : "View:"}
          </span>
          <Select
            value={String(filters.viewWeeks)}
            onValueChange={(value) =>
              updateFilter("viewWeeks", Number(value) as ViewWeeks)
            }
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_WEEK_OPTIONS.map((weeks) => (
                <SelectItem key={weeks} value={String(weeks)}>
                  {weeks} {locale === "vi" ? "tuần" : weeks === 1 ? "week" : "weeks"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[150px] justify-between">
              <span>
                {allCategoriesSelected
                  ? locale === "vi"
                    ? "Tất cả danh mục"
                    : "All Categories"
                  : `${filters.categoryIds.length} ${
                      locale === "vi" ? "đã chọn" : "selected"
                    }`}
              </span>
              <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <div className="p-2 border-b">
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer">
                <Checkbox
                  checked={allCategoriesSelected}
                  onCheckedChange={toggleAllCategories}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  {locale === "vi" ? "Tất cả" : "All"}
                </span>
              </label>
            </div>
            <div className="p-2 max-h-[200px] overflow-y-auto">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer"
                >
                  <Checkbox
                    checked={
                      filters.categoryIds.length === 0 ||
                      filters.categoryIds.includes(category.id)
                    }
                    onCheckedChange={() => toggleCategory(category.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Show Empty Items Toggle - same row */}
        <div className="flex items-center gap-2 ml-2">
          <Checkbox
            id="show-empty-items"
            checked={filters.showEmptyItems}
            onCheckedChange={(checked) =>
              updateFilter("showEmptyItems", checked === true)
            }
          />
          <Label htmlFor="show-empty-items" className="text-sm cursor-pointer">
            {locale === "vi" ? "Hiển thị mục trống" : "Show empty items"}
          </Label>
        </div>

        {/* Spacer to push export button to right */}
        <div className="flex-1" />

        {/* Payment Status Legend */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Info className="h-4 w-4 text-gray-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-3" align="end">
            <p className="text-sm font-medium mb-2">
              {locale === "vi" ? "Trạng thái thanh toán" : "Payment Status"}
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-500 shrink-0" />
                <span className="text-sm text-gray-700">
                  {locale === "vi" ? "Chờ thanh toán" : "Pending"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
                <span className="text-sm text-gray-700">
                  {locale === "vi" ? "Đã cọc" : "Deposit Paid"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500 shrink-0" />
                <span className="text-sm text-gray-700">
                  {locale === "vi" ? "Đã thanh toán" : "Fully Paid"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-gray-400 shrink-0" />
                <span className="text-sm text-gray-700">
                  {locale === "vi" ? "Đã hoàn tiền" : "Refunded"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-gray-600 shrink-0" />
                <span className="text-sm text-gray-700">
                  {locale === "vi" ? "Hết hạn" : "Expired"}
                </span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export PDF Button */}
        {onExportPDF && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            disabled={exportLoading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exportLoading
              ? locale === "vi"
                ? "Đang xuất..."
                : "Exporting..."
              : locale === "vi"
              ? "Xuất PDF"
              : "Export PDF"}
          </Button>
        )}
      </div>
    </div>
  );
}
