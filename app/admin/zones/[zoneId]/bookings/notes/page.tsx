"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Search, RotateCcw, RefreshCw, ArrowUpDown, User, MessageSquare } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { GlampingBookingDetailModal } from "@/components/admin/glamping/GlampingBookingDetailModal";

// Types
interface BookingNote {
  noteId: string;
  content: string;
  noteDate: string;
  bookingId: string;
  bookingCode: string;
  staffId: string;
  staffName: string;
  customerName: string;
}

interface StaffOption {
  id: string;
  name: string;
}

interface NotesFilters {
  dateRange: string;
  dateFrom?: string;
  dateTo?: string;
  staffId: string;
  search: string;
}

// Date range options
const DATE_RANGE_OPTIONS = [
  { value: "today", key: "today" },
  { value: "last_7_days", key: "last7Days" },
  { value: "last_30_days", key: "last30Days" },
  { value: "custom", key: "custom" },
];

// Format date and time
const formatDateTime = (dateString: string): { date: string; time: string } => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}`,
  };
};

export default function BookingNotesPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const t = useTranslations("admin");

  const [notes, setNotes] = useState<BookingNote[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<NotesFilters>({
    dateRange: "last_30_days",
    staffId: "all",
    search: "",
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [allNotesBookingId, setAllNotesBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [filters.dateRange, filters.dateFrom, filters.dateTo, filters.staffId, zoneId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (zoneId && zoneId !== "all") {
        params.append("zoneId", zoneId);
      }
      params.append("dateRange", filters.dateRange);
      if (filters.dateRange === "custom") {
        if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.append("dateTo", filters.dateTo);
      }
      if (filters.staffId && filters.staffId !== "all") {
        params.append("staffId", filters.staffId);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }

      const response = await fetch(`/api/admin/glamping/bookings/notes?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const data = await response.json();
      setNotes(data.notes || []);
      setStaffOptions(data.staffOptions || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      toast.error(t("bookingNotesPage.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof NotesFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    fetchNotes();
  };

  const handleReset = () => {
    setFilters({
      dateRange: "last_30_days",
      staffId: "all",
      search: "",
    });
  };

  const handleViewBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedBookingId(null);
    setIsDetailModalOpen(false);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Sort notes by date
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = new Date(a.noteDate).getTime();
    const dateB = new Date(b.noteDate).getTime();
    return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
  });

  // Truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t("bookingNotesPage.title")}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              {t("bookingNotesPage.subtitle", { count: totalCount })}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotes}
            className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 touch-manipulation"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">
              {t("bookingNotesPage.refresh")}
            </span>
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          {/* Search bar - full width on mobile */}
          <div className="mb-3 sm:mb-0 sm:hidden">
            <label className="text-xs text-gray-500 mb-1.5 block">
              {t("bookingNotesPage.search")}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder={t("bookingNotesPage.searchPlaceholder")}
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Filters grid */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3 sm:items-end">
            {/* Search bar - desktop only */}
            <div className="hidden sm:block sm:flex-1">
              <label className="text-xs text-gray-500 mb-1.5 block">
                {t("bookingNotesPage.search")}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder={t("bookingNotesPage.searchPlaceholder")}
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range filter */}
            <div className="sm:w-40">
              <label className="text-xs text-gray-500 mb-1.5 block">
                {t("bookingNotesPage.dateRange")}
              </label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => handleFilterChange("dateRange", value)}
              >
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`bookingNotesPage.dateRangeOptions.${option.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staff filter */}
            <div className="sm:w-40">
              <label className="text-xs text-gray-500 mb-1.5 block">
                {t("bookingNotesPage.staff")}
              </label>
              <Select
                value={filters.staffId}
                onValueChange={(value) => handleFilterChange("staffId", value)}
              >
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder={t("bookingNotesPage.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("bookingNotesPage.all")}
                  </SelectItem>
                  {staffOptions.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search button */}
            <div className="hidden sm:block">
              <Button
                variant="default"
                size="sm"
                onClick={handleSearch}
                className="h-10"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Reset button */}
            <div className="flex items-end col-span-2 sm:col-span-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                title={t("bookingNotesPage.resetFilters")}
                className="h-9 sm:h-10 w-full sm:w-10"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Custom date range inputs */}
          {filters.dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {t("bookingNotesPage.fromDate")}
                </label>
                <Input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {t("bookingNotesPage.toDate")}
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

        {/* Notes Table */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-600">
                {t("bookingNotesPage.loading")}
              </span>
            </div>
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">
              {t("bookingNotesPage.noNotes")}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={toggleSortDirection}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        {t("bookingNotesPage.date")}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bookingNotesPage.staff")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bookingNotesPage.customer")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bookingNotesPage.note")}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Tất cả</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedNotes.map((note) => {
                    const { date, time } = formatDateTime(note.noteDate);

                    return (
                      <tr
                        key={note.noteId}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Date */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {date}
                          </div>
                          <div className="text-xs text-gray-500">{time}</div>
                        </td>

                        {/* Booking Code */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewBooking(note.bookingId)}
                            className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                          >
                            {note.bookingCode}
                          </button>
                        </td>

                        {/* Staff */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <User className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <span className="text-sm text-gray-900">
                              {truncateText(note.staffName, 20)}
                            </span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {note.customerName}
                          </span>
                        </td>

                        {/* Note Content */}
                        <td className="px-4 py-4">
                          {note.content.length > 50 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-gray-700 cursor-help">
                                  {truncateText(note.content, 50)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-sm whitespace-pre-wrap"
                              >
                                {note.content}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-sm text-gray-700">
                              {note.content}
                            </span>
                          )}
                        </td>

                        {/* All Notes for this booking */}
                        <td className="px-4 py-4 text-center">
                          {(() => {
                            const count = notes.filter(n => n.bookingId === note.bookingId).length;
                            return (
                              <button
                                onClick={() => setAllNotesBookingId(note.bookingId)}
                                className="relative inline-flex items-center justify-center w-7 h-7 rounded-md text-primary hover:bg-primary/10 transition-colors"
                                title="Xem tất cả ghi chú"
                              >
                                <MessageSquare className="w-4 h-4" />
                                {count > 0 && (
                                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-medium leading-none">
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Booking Detail Modal */}
        <GlampingBookingDetailModal
          bookingId={selectedBookingId}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          onUpdate={fetchNotes}
        />

        {/* All Notes Modal */}
        <Dialog open={!!allNotesBookingId} onOpenChange={(open) => { if (!open) setAllNotesBookingId(null); }}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">
                Tất cả ghi chú - {notes.find(n => n.bookingId === allNotesBookingId)?.bookingCode || ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {notes
                .filter(n => n.bookingId === allNotesBookingId)
                .sort((a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime())
                .map((note) => {
                  const { date, time } = formatDateTime(note.noteDate);
                  return (
                    <div key={note.noteId} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="h-3 w-3 text-gray-500" />
                          </div>
                          <span className="text-xs font-medium text-gray-900">{note.staffName}</span>
                        </div>
                        <span className="text-xs text-gray-500">{date} {time}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  );
                })}
              {allNotesBookingId && notes.filter(n => n.bookingId === allNotesBookingId).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Không có ghi chú</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
