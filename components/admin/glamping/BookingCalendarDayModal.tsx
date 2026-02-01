"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  Phone,
  Mail,
  Users,
  Calendar,
  CreditCard,
  User,
  LogIn,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CalendarEvent } from "./calendar-types";
import { STATUS_COLORS } from "./calendar-types";
import type { BookingStatus } from "./types";

interface BookingCalendarDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onStatusChange?: (eventId: string, newStatus: BookingStatus) => Promise<void>;
  onCheckIn?: (eventId: string) => Promise<void>;
  locale: string;
}

const BOOKING_STATUSES: { value: BookingStatus; labelVi: string; labelEn: string }[] = [
  { value: 'pending', labelVi: 'Chờ xác nhận', labelEn: 'Pending' },
  { value: 'confirmed', labelVi: 'Đã xác nhận', labelEn: 'Confirmed' },
  { value: 'checked_in', labelVi: 'Đã check-in', labelEn: 'Checked In' },
  { value: 'checked_out', labelVi: 'Đã check-out', labelEn: 'Checked Out' },
  { value: 'cancelled', labelVi: 'Đã hủy', labelEn: 'Cancelled' },
];

export function BookingCalendarDayModal({
  isOpen,
  onClose,
  date,
  events,
  onEventClick,
  onStatusChange,
  onCheckIn,
  locale,
}: BookingCalendarDayModalProps) {
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Format date for display
  const formattedDate = useMemo(() => {
    const d = new Date(date);
    const weekdays = locale === 'vi'
      ? ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = locale === 'vi'
      ? ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayOfWeek = weekdays[d.getDay()];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    if (locale === 'vi') {
      return `${dayOfWeek}, ngày ${day} ${month}, ${year}`;
    }
    // English ordinal suffix
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
      : day === 2 || day === 22 ? 'nd'
      : day === 3 || day === 23 ? 'rd'
      : 'th';
    return `${dayOfWeek}, ${month} ${day}${suffix}, ${year}`;
  }, [date, locale]);

  // Filter events by search
  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events;
    const searchLower = search.toLowerCase();
    return events.filter(event =>
      event.customerName.toLowerCase().includes(searchLower) ||
      event.bookingCode.toLowerCase().includes(searchLower) ||
      event.customerEmail?.toLowerCase().includes(searchLower) ||
      event.itemName.toLowerCase().includes(searchLower)
    );
  }, [events, search]);

  // Calculate summary
  const summary = useMemo(() => {
    const uniqueBookings = new Set(events.map(e => e.id));
    const totalGuests = events.reduce((sum, e) => {
      if (!uniqueBookings.has(e.id)) return sum;
      uniqueBookings.delete(e.id);
      return sum + (e.totalGuests || 0);
    }, 0);

    // Reset for amount calculation
    const uniqueBookingsForAmount = new Set(events.map(e => e.id));
    const totalPaid = events.reduce((sum, e) => {
      if (!uniqueBookingsForAmount.has(e.id)) return sum;
      uniqueBookingsForAmount.delete(e.id);
      if (e.paymentStatus === 'fully_paid' || e.paymentStatus === 'deposit_paid') {
        return sum + e.totalAmount;
      }
      return sum;
    }, 0);

    // Guest breakdown
    const guestBreakdown: Record<string, number> = {};
    events.forEach(e => {
      if (e.parameters) {
        e.parameters.forEach(p => {
          guestBreakdown[p.label] = (guestBreakdown[p.label] || 0) + p.quantity;
        });
      }
    });

    return {
      totalBookings: new Set(events.map(e => e.id)).size,
      totalGuests,
      totalPaid,
      guestBreakdown,
    };
  }, [events]);

  const handleStatusChange = async (eventId: string, newStatus: BookingStatus) => {
    if (!onStatusChange) return;
    setUpdatingId(eventId);
    try {
      await onStatusChange(eventId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCheckIn = async (eventId: string) => {
    if (!onCheckIn) return;
    setUpdatingId(eventId);
    try {
      await onCheckIn(eventId);
    } finally {
      setUpdatingId(null);
    }
  };

  // Format date range
  const formatDateRange = (checkIn: string, checkOut: string) => {
    const formatDate = (d: string) => {
      const date = new Date(d);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };
    return `${formatDate(checkIn)} - ${formatDate(checkOut)}`;
  };

  // Get guest breakdown string
  const getGuestBreakdownString = () => {
    const parts = Object.entries(summary.guestBreakdown)
      .filter(([_, count]) => count > 0)
      .map(([label, count]) => `${count} ${label}`);
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">{formattedDate}</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="flex-shrink-0 bg-gray-50 rounded-lg p-3 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
            <span>
              <strong>{summary.totalBookings}</strong> {locale === 'vi' ? 'Booking' : 'Bookings'}
            </span>
            <span className="text-gray-300">|</span>
            <span>
              <strong>{summary.totalGuests}</strong> {locale === 'vi' ? 'Khách' : 'Guests'} {getGuestBreakdownString()}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-green-600">
              <strong>{formatCurrency(summary.totalPaid)}</strong> {locale === 'vi' ? '(Đã thanh toán)' : '(Paid)'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={locale === 'vi' ? 'Tìm trong ngày...' : 'Search within day...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Booking Cards */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {search
                ? (locale === 'vi' ? 'Không tìm thấy booking' : 'No bookings found')
                : (locale === 'vi' ? 'Không có booking trong ngày này' : 'No bookings on this day')
              }
            </div>
          ) : (
            filteredEvents.map((event) => {
              const statusColors = STATUS_COLORS[event.status] || STATUS_COLORS.pending;
              const isUpdating = updatingId === event.id;
              const canCheckIn = event.status === 'confirmed';

              return (
                <div
                  key={`${event.id}-${event.itemId}`}
                  className="border border-gray-200 rounded-lg p-4 space-y-3 hover:border-gray-300 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onEventClick(event)}
                      className="text-left hover:underline"
                    >
                      <span className="font-semibold text-primary">{event.bookingCode}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                        {BOOKING_STATUSES.find(s => s.value === event.status)?.[locale === 'vi' ? 'labelVi' : 'labelEn'] || event.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Item and Guest Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-900">{event.itemName}</span>
                      {event.parameters && event.parameters.length > 0 && (
                        <span className="text-gray-500">
                          ({event.parameters.map(p => `${p.quantity} ${p.label}`).join(', ')})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span>{event.customerName}</span>
                      <span className="text-gray-400">|</span>
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>{event.totalGuests} {locale === 'vi' ? 'khách' : 'guests'}</span>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500">
                      {event.customerPhone && (
                        <a href={`tel:${event.customerPhone}`} className="flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{event.customerPhone}</span>
                        </a>
                      )}
                      {event.customerEmail && (
                        <a href={`mailto:${event.customerEmail}`} className="flex items-center gap-1 hover:text-primary">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[200px]">{event.customerEmail}</span>
                        </a>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDateRange(event.checkInDate, event.checkOutDate)}</span>
                    </div>

                    {/* Payment */}
                    <div className="flex items-center gap-2 text-gray-500">
                      <CreditCard className="h-4 w-4 flex-shrink-0" />
                      <span>{formatCurrency(event.totalAmount)}</span>
                      <Badge variant={event.paymentStatus === 'fully_paid' ? 'default' : event.paymentStatus === 'deposit_paid' ? 'secondary' : 'outline'} className="text-xs">
                        {event.paymentStatus === 'fully_paid' ? (locale === 'vi' ? 'Đã thanh toán' : 'Paid')
                          : event.paymentStatus === 'deposit_paid' ? (locale === 'vi' ? 'Đã cọc' : 'Deposit')
                          : (locale === 'vi' ? 'Chưa thanh toán' : 'Unpaid')}
                      </Badge>
                    </div>

                    {/* Source */}
                    <div className="text-xs text-gray-400">
                      {locale === 'vi' ? 'Nguồn:' : 'Source:'}{' '}
                      {event.source === 'admin' ? event.createdBy || 'Admin' : 'Web'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    {/* Status Dropdown */}
                    {onStatusChange && (
                      <Select
                        value={event.status}
                        onValueChange={(value) => handleStatusChange(event.id, value as BookingStatus)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[160px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOOKING_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {locale === 'vi' ? status.labelVi : status.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Check-in Button */}
                      {canCheckIn && onCheckIn && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(event.id)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                          ) : (
                            <LogIn className="h-4 w-4 mr-1" />
                          )}
                          Check-in
                        </Button>
                      )}

                      {/* View Details */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEventClick(event)}
                      >
                        {locale === 'vi' ? 'Chi tiết' : 'Details'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Close Button */}
        <div className="flex-shrink-0 flex justify-end pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            {locale === 'vi' ? 'Đóng' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
