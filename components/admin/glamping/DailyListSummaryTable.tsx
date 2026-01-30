"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { type DailyListSummaryItem, type DailyListSummaryTotals, type ParameterDef } from "./daily-types";

interface DailyListSummaryTableProps {
  summary: DailyListSummaryItem[];
  totals: DailyListSummaryTotals;
  parameters: ParameterDef[];
  locale: string;
}

function InventoryBar({ percent }: { percent: number }) {
  const color =
    percent >= 100
      ? "bg-red-500"
      : percent >= 75
        ? "bg-orange-500"
        : percent >= 50
          ? "bg-yellow-500"
          : percent > 0
            ? "bg-green-500"
            : "bg-gray-200";

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500 w-8 text-right">{percent}%</span>
    </div>
  );
}

export function DailyListSummaryTable({
  summary,
  totals,
  parameters,
  locale,
}: DailyListSummaryTableProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isVi = locale === "vi";

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
        <h3 className="text-sm font-semibold text-gray-900">
          {isVi ? "Tổng Quan Booking Hàng Ngày" : "Daily Booking Summary"}
        </h3>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  {isVi ? "Tent" : "Item"}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  {isVi ? "Tồn kho" : "Inventory"}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  {isVi ? "Bookings" : "Bookings"}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  {isVi ? "Tổng tiền" : "Total"}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  {isVi ? "Khách" : "Guests"}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  {isVi ? "SL" : "Qty"}
                </th>
                {parameters.map((p) => (
                  <th key={p.id} className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((item) => (
                <tr key={item.itemId} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-xs font-medium text-gray-900">{item.itemName}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <InventoryBar percent={item.inventoryPercent} />
                      <span className="text-[10px] text-gray-500">
                        {item.bookedCount}/{item.inventoryTotal}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-700">{item.bookedCount}</td>
                  <td className="px-3 py-2 text-right text-xs font-medium text-gray-900">
                    {item.totalAmount > 0 ? formatCurrency(item.totalAmount) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-700">{item.totalGuests || 0}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-700">{item.totalQuantity || 0}</td>
                  {parameters.map((p) => (
                    <td key={p.id} className="px-3 py-2 text-right text-xs text-gray-700">
                      {item.parameterBreakdown[p.id] || 0}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                <td className="px-3 py-2 text-xs text-gray-900">
                  {isVi ? "TỔNG" : "TOTALS"}
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] text-gray-600">
                    {totals.totalBooked}/{totals.totalInventory}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-xs">{totals.totalBookings}</td>
                <td className="px-3 py-2 text-right text-xs">{formatCurrency(totals.totalAmount)}</td>
                <td className="px-3 py-2 text-right text-xs">{totals.totalGuests}</td>
                <td className="px-3 py-2 text-right text-xs">{totals.totalQuantity}</td>
                {parameters.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-right text-xs">
                    {totals.parameterBreakdown[p.id] || 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
