"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableDropdownFilter, type DropdownOption } from "./SearchableDropdownFilter";

const DATE_RANGE_OPTIONS = [
  { value: "all_time", labelKey: "allTime" },
  { value: "today", labelKey: "today" },
  { value: "yesterday", labelKey: "yesterday" },
  { value: "this_week", labelKey: "thisWeek" },
  { value: "this_month", labelKey: "thisMonth" },
  { value: "last_month", labelKey: "lastMonth" },
  { value: "last_30_days", labelKey: "last30Days" },
  { value: "last_90_days", labelKey: "last90Days" },
  { value: "this_year", labelKey: "thisYear" },
  { value: "custom", labelKey: "custom" },
];

export interface BookingIndexFilters {
  dateSource: string;
  dateRange: string;
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  tagId: string;
  itemId: string;
  status: string;
  source: string;
  search: string;
}

export interface BookingSalesFilters {
  dateSource: string;
  dateRange: string;
  dateFrom: string;
  dateTo: string;
  staffId: string;
  categoryId: string;
  itemId: string;
}

export interface TransactionFilters {
  dateRange: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  paymentMethod: string;
  search: string;
}

interface FilterOptions {
  categories?: DropdownOption[];
  tags?: DropdownOption[];
  items?: DropdownOption[];
  statuses?: DropdownOption[];
  sources?: DropdownOption[];
  staff?: DropdownOption[];
  paymentMethods?: DropdownOption[];
}

interface ReportFilterBarProps {
  variant: "booking-index" | "sales" | "transactions";
  filters: BookingIndexFilters | BookingSalesFilters | TransactionFilters;
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
  filterOptions: FilterOptions;
  t: (key: string) => string;
}

export function ReportFilterBar({
  variant,
  filters,
  onFilterChange,
  onReset,
  filterOptions,
  t,
}: ReportFilterBarProps) {
  const isIndex = variant === "booking-index";
  const isTransactions = variant === "transactions";
  const indexFilters = filters as BookingIndexFilters;
  const salesFilters = filters as BookingSalesFilters;
  const txFilters = filters as TransactionFilters;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 sm:items-end">
        {/* Date Source (not for transactions) */}
        {!isTransactions && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t("dateSource")}</label>
            <Select value={(filters as any).dateSource} onValueChange={(v) => onFilterChange("dateSource", v)}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">{t("dateSourceCreated")}</SelectItem>
                <SelectItem value="check_in">{t("dateSourceCheckIn")}</SelectItem>
                {isIndex && <SelectItem value="check_out">{t("dateSourceCheckOut")}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t("dateRange")}</label>
          <Select value={filters.dateRange} onValueChange={(v) => onFilterChange("dateRange", v)}>
            <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom date from/to */}
        {filters.dateRange === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">{t("from")}</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                className="h-9 text-sm w-full sm:w-[140px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">{t("to")}</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange("dateTo", e.target.value)}
                className="h-9 text-sm w-full sm:w-[140px]"
              />
            </div>
          </>
        )}

        {/* Status (transactions) */}
        {isTransactions && filterOptions.statuses && (
          <SearchableDropdownFilter
            label={t("status")}
            options={filterOptions.statuses}
            value={txFilters.status}
            onChange={(v) => onFilterChange("status", v)}
            allLabel={t("allStatuses")}
            className="sm:w-[140px]"
          />
        )}

        {/* Payment Method (transactions) */}
        {isTransactions && filterOptions.paymentMethods && (
          <SearchableDropdownFilter
            label={t("method")}
            options={filterOptions.paymentMethods}
            value={txFilters.paymentMethod}
            onChange={(v) => onFilterChange("paymentMethod", v)}
            allLabel={t("allMethods")}
            className="sm:w-[160px]"
          />
        )}

        {/* Staff (sales only) */}
        {!isIndex && !isTransactions && filterOptions.staff && (
          <SearchableDropdownFilter
            label={t("staff")}
            options={filterOptions.staff}
            value={salesFilters.staffId}
            onChange={(v) => onFilterChange("staffId", v)}
            allLabel={t("allStaff")}
            className="sm:w-[160px]"
          />
        )}

        {/* Category (not transactions) */}
        {!isTransactions && filterOptions.categories && (
          <SearchableDropdownFilter
            label={t("category")}
            options={filterOptions.categories}
            value={isIndex ? indexFilters.categoryId : salesFilters.categoryId}
            onChange={(v) => onFilterChange("categoryId", v)}
            allLabel={t("allCategories")}
            className="sm:w-[160px]"
          />
        )}

        {/* Tag (index only) */}
        {isIndex && filterOptions.tags && (
          <SearchableDropdownFilter
            label={t("tag")}
            options={filterOptions.tags}
            value={indexFilters.tagId}
            onChange={(v) => onFilterChange("tagId", v)}
            allLabel={t("allTags")}
            className="sm:w-[140px]"
          />
        )}

        {/* Item (not transactions) */}
        {!isTransactions && filterOptions.items && (
          <SearchableDropdownFilter
            label={t("item")}
            options={filterOptions.items}
            value={isIndex ? indexFilters.itemId : salesFilters.itemId}
            onChange={(v) => onFilterChange("itemId", v)}
            allLabel={t("allItems")}
            className="sm:w-[160px]"
          />
        )}

        {/* Status (index only) */}
        {isIndex && filterOptions.statuses && (
          <SearchableDropdownFilter
            label={t("status")}
            options={filterOptions.statuses}
            value={indexFilters.status}
            onChange={(v) => onFilterChange("status", v)}
            allLabel={t("allStatuses")}
            className="sm:w-[140px]"
          />
        )}

        {/* Source (index only) */}
        {isIndex && filterOptions.sources && (
          <SearchableDropdownFilter
            label={t("source")}
            options={filterOptions.sources}
            value={indexFilters.source}
            onChange={(v) => onFilterChange("source", v)}
            allLabel={t("allSources")}
            className="sm:w-[140px]"
          />
        )}

        {/* Search (transactions - inline) */}
        {isTransactions && (
          <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-medium text-gray-500">{t("search")}</label>
            <Input
              placeholder={t("searchPlaceholder")}
              value={txFilters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              className="h-9 text-sm w-full sm:w-[200px]"
            />
          </div>
        )}

        {/* Reset */}
        <div className="flex items-end">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onReset} title={t("reset")}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Text search (index only - separate row) */}
      {isIndex && (
        <div className="mt-3">
          <Input
            placeholder={t("searchPlaceholder")}
            value={indexFilters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="h-9 text-sm max-w-sm"
          />
        </div>
      )}
    </div>
  );
}
