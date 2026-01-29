"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { type DailyListCategoryGroup, type DailyListBooking, type ParameterDef } from "./daily-types";

interface DailyListBookingGroupProps {
  categories: DailyListCategoryGroup[];
  parameters: ParameterDef[];
  locale: string;
  onViewBooking: (bookingId: string) => void;
  selectedBookingIds: Set<string>;
  onToggleBooking: (bookingId: string) => void;
}

const statusConfig: Record<string, { label: { en: string; vi: string }; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: { en: "Pending", vi: "Chờ xác nhận" }, variant: "secondary" },
  confirmed: { label: { en: "Confirmed", vi: "Đã xác nhận" }, variant: "default" },
  checked_in: { label: { en: "Checked In", vi: "Đã check-in" }, variant: "default" },
  checked_out: { label: { en: "Checked Out", vi: "Đã check-out" }, variant: "outline" },
  cancelled: { label: { en: "Cancelled", vi: "Đã huỷ" }, variant: "destructive" },
};

export function DailyListBookingGroup({
  categories,
  parameters,
  locale,
  onViewBooking,
  selectedBookingIds,
  onToggleBooking,
}: DailyListBookingGroupProps) {
  const isVi = locale === "vi";

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          {isVi ? "Không có booking nào" : "No bookings found"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.categoryId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Category Header */}
          <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              {category.categoryName}
            </h3>
          </div>

          {category.items.map((item) => (
            <div key={item.itemId}>
              {/* Item Sub-header */}
              <div className="px-4 py-2 bg-gray-50/70 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-700">
                  {item.itemName}
                </span>
              </div>

              {/* Bookings Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {item.bookings.map((booking) => {
                      const statusCfg = statusConfig[booking.status] || statusConfig.pending;
                      return (
                        <tr
                          key={booking.id}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-2 w-8">
                            <input
                              type="checkbox"
                              checked={selectedBookingIds.has(booking.id)}
                              onChange={() => onToggleBooking(booking.id)}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                          {/* Booking Code */}
                          <td className="px-3 py-2">
                            <button
                              onClick={() => onViewBooking(booking.id)}
                              className="text-primary hover:underline font-medium"
                            >
                              {booking.bookingCode}
                            </button>
                          </td>
                          {/* Customer */}
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{booking.customerName}</div>
                            <div className="text-gray-500 truncate max-w-[150px]">{booking.customerEmail}</div>
                          </td>
                          {/* Source */}
                          <td className="px-3 py-2 text-gray-600">
                            {booking.source || "-"}
                          </td>
                          {/* Status */}
                          <td className="px-3 py-2">
                            <Badge variant={statusCfg.variant} className="text-[10px] px-1.5 py-0.5">
                              {isVi ? statusCfg.label.vi : statusCfg.label.en}
                            </Badge>
                          </td>
                          {/* Total */}
                          <td className="px-3 py-2 text-right font-medium text-gray-900">
                            {formatCurrency(booking.totalAmount)}
                          </td>
                          {/* Adults */}
                          <td className="px-3 py-2 text-right text-gray-700">
                            {booking.adults}
                          </td>
                          {/* Children */}
                          <td className="px-3 py-2 text-right text-gray-700">
                            {booking.children}
                          </td>
                          {/* Quantity */}
                          <td className="px-3 py-2 text-right text-gray-700">
                            {booking.totalQuantity}
                          </td>
                          {/* Dynamic parameter columns */}
                          {parameters.map((p) => (
                            <td key={p.id} className="px-3 py-2 text-right text-gray-700">
                              {booking.parameterBreakdown[p.id] || 0}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {/* Item Subtotals */}
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <td colSpan={2} className="px-3 py-2"></td>
                      <td colSpan={3} className="px-3 py-2 text-xs font-medium text-gray-600">
                        {isVi ? "Tổng phụ" : "Subtotals"}: {item.bookings.length} {isVi ? "booking" : "bookings"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                        {formatCurrency(item.subtotals.totalAmount)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold">
                        {item.subtotals.adults}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold">
                        {item.subtotals.children}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold">
                        {item.subtotals.totalQuantity}
                      </td>
                      {parameters.map((p) => (
                        <td key={p.id} className="px-3 py-2 text-right text-xs font-semibold">
                          {item.subtotals.parameterBreakdown[p.id] || 0}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
