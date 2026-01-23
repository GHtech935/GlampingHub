"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Download, FileSpreadsheet, FileText, Loader2, Users, Search } from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

interface Campsite {
  id: string;
  name: string | { en?: string; vi?: string };
}

interface CustomerExportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ExportCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  booking_count: number;
}

type DateFilterType = "day" | "month" | "year" | "custom";

// Generate years for dropdown (current year and 5 years back)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

export default function CustomerExportModal({
  open,
  onClose,
}: CustomerExportModalProps) {
  const locale = useLocale();
  const t = useTranslations("admin.customerExport");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  // Date filter states
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("month");
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Computed date range
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [campsiteId, setCampsiteId] = useState<string>("all");
  const [checkedOutOnly, setCheckedOutOnly] = useState<boolean>(true);
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [loadingCampsites, setLoadingCampsites] = useState(false);

  // Preview states
  const [customers, setCustomers] = useState<ExportCustomer[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Export states
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const dateLocale = locale === "vi" ? vi : enUS;

  // Update date range when filter type or values change
  useEffect(() => {
    switch (dateFilterType) {
      case "day":
        setStartDate(startOfDay(selectedDay));
        setEndDate(endOfDay(selectedDay));
        break;
      case "month":
        const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
        setStartDate(startOfMonth(monthDate));
        setEndDate(endOfMonth(monthDate));
        break;
      case "year":
        const yearDate = new Date(selectedYear, 0, 1);
        setStartDate(startOfYear(yearDate));
        setEndDate(endOfYear(yearDate));
        break;
      case "custom":
        setStartDate(customDateRange.from);
        setEndDate(customDateRange.to);
        break;
    }
  }, [dateFilterType, selectedDay, selectedMonth, selectedYear, customDateRange]);

  // Fetch campsites on mount
  useEffect(() => {
    if (open) {
      setLoadingCampsites(true);
      fetch("/api/admin/campsites")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCampsites(data);
          } else if (data.error) {
            console.error("Error fetching campsites:", data.error);
          }
        })
        .catch((error) => {
          console.error("Error fetching campsites:", error);
        })
        .finally(() => {
          setLoadingCampsites(false);
        });
    }
  }, [open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDateFilterType("month");
      setSelectedDay(new Date());
      setSelectedMonth(new Date().getMonth() + 1);
      setSelectedYear(new Date().getFullYear());
      setCustomDateRange({ from: undefined, to: undefined });
      setCampsiteId("all");
      setCheckedOutOnly(true);
      setCustomers([]);
      setHasSearched(false);
    }
  }, [open]);

  // Handle filter type change
  const handleFilterTypeChange = (type: DateFilterType) => {
    setDateFilterType(type);
    if (type === "custom") {
      setCalendarOpen(true);
    }
    // Reset preview when filter changes
    setCustomers([]);
    setHasSearched(false);
  };

  // Fetch preview data
  const handleSearch = useCallback(async () => {
    if (!startDate || !endDate) {
      toast({
        title: t("error"),
        description: t("dateRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoadingPreview(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      params.append("startDate", format(startDate, "yyyy-MM-dd"));
      params.append("endDate", format(endDate, "yyyy-MM-dd"));
      if (campsiteId && campsiteId !== "all") {
        params.append("campsiteId", campsiteId);
      }
      params.append("checkedOutOnly", checkedOutOnly.toString());

      const response = await fetch(`/api/admin/customers/export?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setCustomers(result.data);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: t("error"),
        description: t("searchFailed"),
        variant: "destructive",
      });
      setCustomers([]);
    } finally {
      setLoadingPreview(false);
    }
  }, [startDate, endDate, campsiteId, checkedOutOnly, t, toast]);

  // Export function
  const handleExport = async (exportFormat: "excel" | "csv") => {
    if (customers.length === 0) {
      toast({
        title: t("noData"),
        description: t("noDataDescription"),
        variant: "destructive",
      });
      return;
    }

    if (exportFormat === "excel") {
      setExportingExcel(true);
    } else {
      setExportingCsv(true);
    }

    try {
      // Prepare export data
      const exportData = customers.map((c) => ({
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone || "",
        country: c.country || "",
        booking_count: c.booking_count,
      }));

      // Define columns
      const columns = [
        { header: t("columns.firstName"), key: "first_name", width: 15 },
        { header: t("columns.lastName"), key: "last_name", width: 15 },
        { header: t("columns.email"), key: "email", width: 30 },
        { header: t("columns.phone"), key: "phone", width: 15 },
        { header: t("columns.country"), key: "country", width: 15 },
        { header: t("columns.bookingCount"), key: "booking_count", width: 15 },
      ];

      // Date range string
      const dateRangeStr = startDate && endDate
        ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`
        : "";

      // Filename
      const filename = startDate && endDate
        ? `customers_${format(startDate, "yyyyMMdd")}_${format(endDate, "yyyyMMdd")}`
        : `customers_${format(new Date(), "yyyyMMdd")}`;

      // Export options
      const options = {
        title: t("exportTitle"),
        subtitle: checkedOutOnly ? t("checkedOutOnly") : undefined,
        dateRange: dateRangeStr,
        filename,
      };

      // Export
      if (exportFormat === "excel") {
        await exportToExcel(exportData, columns, options);
      } else {
        exportToCSV(exportData, columns, options);
      }

      toast({
        title: t("success"),
        description: t("exportSuccess", { count: customers.length }),
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: t("error"),
        description: t("exportFailed"),
        variant: "destructive",
      });
    } finally {
      setExportingExcel(false);
      setExportingCsv(false);
    }
  };

  // Helper to get campsite name from localized object
  const getCampsiteName = (name: string | { en?: string; vi?: string }): string => {
    if (typeof name === "string") {
      return name;
    }
    return (locale === "vi" ? name.vi : name.en) || name.vi || name.en || "";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Date Filter Type */}
            <div className="space-y-2">
              <Label>{t("dateFilter")}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={dateFilterType} onValueChange={(v) => handleFilterTypeChange(v as DateFilterType)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">{t("byDay")}</SelectItem>
                    <SelectItem value="month">{t("byMonth")}</SelectItem>
                    <SelectItem value="year">{t("byYear")}</SelectItem>
                    <SelectItem value="custom">{t("custom")}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Day Picker */}
                {dateFilterType === "day" && (
                  <Popover open={dayPickerOpen} onOpenChange={setDayPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[150px] justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(selectedDay, "dd/MM/yyyy", { locale: dateLocale })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDay}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDay(date);
                            setDayPickerOpen(false);
                            setCustomers([]);
                            setHasSearched(false);
                          }
                        }}
                        locale={dateLocale}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {/* Month Picker */}
                {dateFilterType === "month" && (
                  <>
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(v) => {
                        setSelectedMonth(parseInt(v));
                        setCustomers([]);
                        setHasSearched(false);
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            {t("month")} {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(v) => {
                        setSelectedYear(parseInt(v));
                        setCustomers([]);
                        setHasSearched(false);
                      }}
                    >
                      <SelectTrigger className="w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}

                {/* Year Picker */}
                {dateFilterType === "year" && (
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(v) => {
                      setSelectedYear(parseInt(v));
                      setCustomers([]);
                      setHasSearched(false);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Custom Date Range Picker */}
                {dateFilterType === "custom" && (
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[200px] justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {customDateRange.from && customDateRange.to
                          ? `${format(customDateRange.from, "dd/MM/yyyy")} - ${format(customDateRange.to, "dd/MM/yyyy")}`
                          : t("selectDateRange")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                      <Calendar
                        mode="range"
                        selected={{ from: customDateRange.from, to: customDateRange.to }}
                        onSelect={(range) => {
                          setCustomDateRange({ from: range?.from, to: range?.to });
                          setCustomers([]);
                          setHasSearched(false);
                          if (range?.from && range?.to) {
                            setCalendarOpen(false);
                          }
                        }}
                        locale={dateLocale}
                        numberOfMonths={2}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Campsite Filter */}
            <div className="space-y-2">
              <Label>{t("campsite")}</Label>
              <Select
                value={campsiteId}
                onValueChange={(v) => {
                  setCampsiteId(v);
                  setCustomers([]);
                  setHasSearched(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCampsite")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCampsites")}</SelectItem>
                  {loadingCampsites ? (
                    <SelectItem value="_loading" disabled>
                      {tCommon("loading")}...
                    </SelectItem>
                  ) : (
                    campsites.map((campsite) => (
                      <SelectItem key={campsite.id} value={campsite.id}>
                        {getCampsiteName(campsite.name)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Checked Out Only + Search Button */}
            <div className="flex items-end gap-4 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkedOutOnly"
                  checked={checkedOutOnly}
                  onCheckedChange={(checked) => {
                    setCheckedOutOnly(checked === true);
                    setCustomers([]);
                    setHasSearched(false);
                  }}
                />
                <Label htmlFor="checkedOutOnly" className="cursor-pointer">
                  {t("checkedOutOnly")}
                </Label>
              </div>
              <Button
                onClick={handleSearch}
                disabled={loadingPreview || !startDate || !endDate}
                className="ml-auto"
              >
                {loadingPreview ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {t("search")}
              </Button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border rounded-lg">
            <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{t("preview")}</span>
                {hasSearched && (
                  <span className="text-sm text-gray-500">
                    ({customers.length} {t("customers")})
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {!hasSearched ? (
                <div className="p-8 text-center text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>{t("searchPrompt")}</p>
                </div>
              ) : loadingPreview ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-gray-400" />
                </div>
              ) : customers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>{t("noDataDescription")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>{t("columns.firstName")}</TableHead>
                      <TableHead>{t("columns.lastName")}</TableHead>
                      <TableHead>{t("columns.email")}</TableHead>
                      <TableHead>{t("columns.phone")}</TableHead>
                      <TableHead>{t("columns.country")}</TableHead>
                      <TableHead className="text-right">{t("columns.bookingCount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell className="text-gray-500">{index + 1}</TableCell>
                        <TableCell>{customer.first_name}</TableCell>
                        <TableCell>{customer.last_name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.phone || "-"}</TableCell>
                        <TableCell>{customer.country || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{customer.booking_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={customers.length === 0 || exportingCsv || exportingExcel}
            >
              {exportingCsv ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {t("exportCsv")}
            </Button>
            <Button
              onClick={() => handleExport("excel")}
              disabled={customers.length === 0 || exportingCsv || exportingExcel}
            >
              {exportingExcel ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              {t("exportExcel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
