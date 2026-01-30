"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
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
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
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
        <div className="flex items-center justify-between">
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
          <button
            disabled
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed"
            title={isVi ? "Sắp có" : "Coming soon"}
          >
            + {isVi ? "Gán" : "Assign"}
          </button>
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
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
}: BookingRowProps) {
  return (
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
        {/* Guests */}
        <td className="px-3 py-2 text-xs text-gray-700">
          {booking.parameters && booking.parameters.length > 0
            ? booking.parameters.map(p => `${p.label}: ${p.quantity}`).join(", ")
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
        {/* Notes */}
        <td className="px-3 py-2 text-xs text-gray-500 max-w-[120px] truncate">
          {booking.internalNotes || booking.customerNotes || "-"}
        </td>
      </tr>
  );
}
