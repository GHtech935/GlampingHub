"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { type ManifestItem, type ManifestBooking } from "./daily-types";

interface ManifestItemGroupProps {
  item: ManifestItem;
  locale: string;
  onViewBooking: (bookingId: string) => void;
}

const statusConfig: Record<string, { label: { en: string; vi: string }; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: { en: "Pending", vi: "Chờ xác nhận" }, variant: "secondary" },
  confirmed: { label: { en: "Confirmed", vi: "Đã xác nhận" }, variant: "default" },
  checked_in: { label: { en: "Checked In", vi: "Đã check-in" }, variant: "default" },
  checked_out: { label: { en: "Checked Out", vi: "Đã check-out" }, variant: "outline" },
  cancelled: { label: { en: "Cancelled", vi: "Đã huỷ" }, variant: "destructive" },
};

const paymentStatusConfig: Record<string, { label: { en: string; vi: string } }> = {
  pending: { label: { en: "Pending", vi: "Chờ thanh toán" } },
  deposit_paid: { label: { en: "Deposit Paid", vi: "Đã đặt cọc" } },
  fully_paid: { label: { en: "Fully Paid", vi: "Đã thanh toán đủ" } },
  refund_pending: { label: { en: "Refund Pending", vi: "Chờ hoàn tiền" } },
  refunded: { label: { en: "Refunded", vi: "Đã hoàn tiền" } },
  no_refund: { label: { en: "No Refund", vi: "Không hoàn tiền" } },
  expired: { label: { en: "Expired", vi: "Hết hạn" } },
};

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function ManifestItemGroup({ item, locale, onViewBooking }: ManifestItemGroupProps) {
  const isVi = locale === "vi";

  // Build parameters summary string
  const paramsSummary = item.parameterTotals
    ? Object.entries(item.parameterTotals)
        .map(([label, qty]) => `${label}: ${qty}`)
        .join(", ")
    : "";

  const summaryParts = [
    `${item.totalBookings} ${isVi ? "Booking" : item.totalBookings === 1 ? "Booking" : "Bookings"}`,
    `${item.totalGuests} ${isVi ? "Khách" : "Guests"}${paramsSummary ? ` (${paramsSummary})` : ""}`,
    `${formatCurrency(item.totalPaid)} ${isVi ? "Đã thanh toán" : "Paid"}`,
    item.totalDue > 0 ? `${formatCurrency(item.totalDue)} ${isVi ? "Còn nợ" : "Due"}` : null,
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Item Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {item.categoryName && <span className="text-gray-500">{item.categoryName} | </span>}
            {item.itemName}
            {item.itemSku && <span className="text-gray-400 ml-1">({item.itemSku})</span>}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {summaryParts.join(" | ")}
          </p>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                {isVi ? "Mã" : "Code"}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                {isVi ? "Bắt đầu" : "Start"}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                {isVi ? "Kết thúc" : "End"}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                {isVi ? "Khách" : "Guests"}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                {isVi ? "Thanh toán" : "Payment"}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                {isVi ? "Trạng thái" : "Status"}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                {isVi ? "Giảm giá" : "Discount"}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                {isVi ? "Người đặt" : "Booker"}
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                {isVi ? "Ghi chú" : "Notes"}
              </th>
            </tr>
          </thead>
          <tbody>
            {item.bookings.map((booking) => {
              const statusCfg = statusConfig[booking.status] || statusConfig.pending;
              const paymentCfg = paymentStatusConfig[booking.paymentStatus] || paymentStatusConfig.pending;

              return (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onViewBooking={onViewBooking}
                  statusLabel={isVi ? statusCfg.label.vi : statusCfg.label.en}
                  statusVariant={statusCfg.variant}
                  paymentLabel={isVi ? paymentCfg.label.vi : paymentCfg.label.en}
                  locale={locale}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface BookingRowProps {
  booking: ManifestBooking;
  onViewBooking: (bookingId: string) => void;
  statusLabel: string;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
  paymentLabel: string;
  locale: string;
}

function BookingRow({
  booking,
  onViewBooking,
  statusLabel,
  statusVariant,
  paymentLabel,
  locale,
}: BookingRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const isVi = locale === "vi";
  const hasNotes = !!(booking.internalNotes || booking.customerNotes);

  // Sort parameters by displayOrder
  const sortedParams = booking.parameters
    ? [...booking.parameters].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    : [];

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
        {/* Booking Code */}
        <td className="px-3 py-2">
          <button
            onClick={() => onViewBooking(booking.id)}
            className="text-primary hover:underline font-medium text-xs"
          >
            {booking.bookingCode}
          </button>
        </td>
        {/* Start */}
        <td className="px-3 py-2 text-xs text-gray-700">
          {formatShortDate(booking.checkInDate)}
        </td>
        {/* End */}
        <td className="px-3 py-2 text-xs text-gray-700">
          {formatShortDate(booking.checkOutDate)}
        </td>
        {/* Guests - each param on a new line, sorted by displayOrder */}
        <td className="px-3 py-2 text-xs text-gray-700">
          {sortedParams.length > 0
            ? sortedParams.map((p, idx) => (
                <div key={idx}>
                  {p.label}: {p.quantity}
                </div>
              ))
            : booking.totalGuests}
        </td>
        {/* Payment */}
        <td className="px-3 py-2 text-xs">
          <span className="font-medium">{formatCurrency(booking.paidAmount)}</span>
        </td>
        {/* Status */}
        <td className="px-3 py-2">
          <Badge variant={statusVariant} className="text-[10px] px-1.5 py-0.5">
            {statusLabel}
          </Badge>
          <div className="mt-0.5">
            <span className="text-[10px] text-gray-500">{paymentLabel}</span>
          </div>
        </td>
        {/* Discount */}
        <td className="px-3 py-2 text-xs text-gray-700">
          {booking.discountAmount > 0 ? formatCurrency(booking.discountAmount) : "-"}
        </td>
        {/* Booker */}
        <td className="px-3 py-2">
          <div className="text-xs font-medium text-gray-900">{booking.customerName}</div>
          {booking.customerEmail && (
            <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{booking.customerEmail}</div>
          )}
        </td>
        {/* Notes - chat icon */}
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => setNotesOpen(true)}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
              hasNotes
                ? "text-primary hover:bg-primary/10"
                : "text-gray-300 hover:bg-gray-100 hover:text-gray-400"
            }`}
            title={isVi ? "Xem ghi chú" : "View notes"}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </td>
      </tr>

      {/* Notes Modal */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {isVi ? "Ghi chú" : "Notes"} - {booking.bookingCode}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {booking.internalNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {isVi ? "Ghi chú nội bộ" : "Internal Notes"}
                </p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{booking.internalNotes}</p>
              </div>
            )}
            {booking.customerNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {isVi ? "Ghi chú khách hàng" : "Customer Notes"}
                </p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{booking.customerNotes}</p>
              </div>
            )}
            {!hasNotes && (
              <p className="text-sm text-gray-500 text-center py-4">
                {isVi ? "Không có ghi chú" : "No notes"}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
