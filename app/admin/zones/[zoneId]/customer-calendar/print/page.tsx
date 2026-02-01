"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format, addDays, parseISO, startOfDay } from "date-fns";
import type {
  CustomerCalendarData,
  CustomerCalendarBooking,
} from "@/components/admin/glamping/customer-calendar-types";

// Vietnamese day abbreviations
const WEEKDAY_ABBR_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_ABBR_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CustomerCalendarPrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const zoneId = params.zoneId as string;

  // Get params from URL
  const startDateStr = searchParams.get("startDate") || format(new Date(), "yyyy-MM-dd");
  const endDateStr = searchParams.get("endDate") || format(addDays(new Date(), 13), "yyyy-MM-dd");
  const showEmptyItems = searchParams.get("showEmptyItems") !== "false";
  const categoryIds = searchParams.get("categoryIds") || "";
  const locale = searchParams.get("locale") || "vi";

  const [data, setData] = useState<CustomerCalendarData | null>(null);
  const [zoneName, setZoneName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Generate date range
  const dates = useMemo(() => {
    const result: Date[] = [];
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    let current = new Date(start);

    while (current <= end) {
      result.push(new Date(current));
      current = addDays(current, 1);
    }
    return result;
  }, [startDateStr, endDateStr]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch zone name
        if (zoneId !== "all") {
          const zoneResponse = await fetch(`/api/admin/glamping/zones/${zoneId}`);
          if (zoneResponse.ok) {
            const zoneData = await zoneResponse.json();
            const name =
              typeof zoneData.zone?.name === "object"
                ? zoneData.zone.name.vi || zoneData.zone.name.en || "Unknown"
                : zoneData.zone?.name || "Unknown";
            setZoneName(name);
          }
        } else {
          setZoneName(locale === "vi" ? "Tất cả khu vực" : "All Zones");
        }

        // Fetch calendar data
        const searchParamsObj = new URLSearchParams({
          zoneId: zoneId === "all" ? "all" : zoneId,
          startDate: startDateStr,
          endDate: endDateStr,
          showEmptyItems: String(showEmptyItems),
        });

        if (categoryIds) {
          searchParamsObj.set("categoryIds", categoryIds);
        }

        const response = await fetch(
          `/api/admin/glamping/bookings/customer-calendar?${searchParamsObj}`
        );

        if (response.ok) {
          const responseData = await response.json();
          setData(responseData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [zoneId, startDateStr, endDateStr, showEmptyItems, categoryIds, locale]);

  // Get booking for a specific item and date
  const getBookingForItemAndDate = (
    itemId: string,
    date: Date
  ): CustomerCalendarBooking | null => {
    if (!data) return null;
    const checkDate = startOfDay(date);

    for (const booking of data.bookings) {
      if (booking.itemId !== itemId) continue;

      const bookingStart = startOfDay(parseISO(booking.checkInDate));
      const bookingEnd = startOfDay(parseISO(booking.checkOutDate));

      if (checkDate >= bookingStart && checkDate < bookingEnd) {
        return booking;
      }
    }
    return null;
  };

  // Get day abbreviation
  const getDayAbbr = (date: Date) => {
    const dayIndex = date.getDay();
    return locale === "vi" ? WEEKDAY_ABBR_VI[dayIndex] : WEEKDAY_ABBR_EN[dayIndex];
  };

  // Format header date
  const formatHeaderDate = (date: Date, index: number) => {
    const day = date.getDate();
    const dayAbbr = getDayAbbr(date);

    // Show month for day 1 or first column
    if (day === 1 || index === 0) {
      const monthAbbr = format(date, "MMM");
      return { month: monthAbbr, day, dayAbbr };
    }
    return { month: null, day, dayAbbr };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const dateRangeDisplay = `${format(parseISO(startDateStr), "dd/MM/yyyy")} - ${format(
    parseISO(endDateStr),
    "dd/MM/yyyy"
  )}`;

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }

        .print-table {
          font-size: 9px;
          border-collapse: collapse;
          width: 100%;
        }

        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 2px 4px;
          vertical-align: middle;
        }

        .print-table th {
          background-color: #fff;
          font-weight: bold;
          text-align: center;
        }

        .print-table .category-row {
          background-color: #404040 !important;
          color: #fff;
          font-weight: bold;
          text-transform: uppercase;
        }

        .print-table .item-name {
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .print-table .booking-cell {
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      <div className="p-4">
        {/* Print Button - hidden when printing */}
        <div className="no-print mb-4 flex items-center gap-4">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {locale === "vi" ? "In / Xuất PDF" : "Print / Export PDF"}
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            {locale === "vi" ? "Đóng" : "Close"}
          </button>
          <span className="text-sm text-gray-500">
            {locale === "vi"
              ? "Nhấn Ctrl+P hoặc Cmd+P để in ra PDF"
              : "Press Ctrl+P or Cmd+P to print to PDF"}
          </span>
        </div>

        {/* Header */}
        <h1 className="text-lg font-bold mb-4">
          {zoneName} {dateRangeDisplay}
        </h1>

        {/* Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ minWidth: "150px", textAlign: "left" }}>Item</th>
              {dates.map((date, index) => {
                const { month, day, dayAbbr } = formatHeaderDate(date, index);
                return (
                  <th key={index} style={{ minWidth: "60px" }}>
                    {month && <div>{month} {day}</div>}
                    {!month && <div>{day}</div>}
                    <div>{dayAbbr}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data?.categories.map((category) => (
              <Fragment key={category.id}>
                {/* Category Header Row */}
                <tr className="category-row">
                  <td colSpan={dates.length + 1}>
                    {category.name.toUpperCase()} ({category.items.length})
                  </td>
                </tr>

                {/* Item Rows */}
                {category.items.map((item) => (
                  <tr key={item.id}>
                    <td className="item-name" title={item.name}>
                      {item.name}
                    </td>
                    {dates.map((date, dateIndex) => {
                      const booking = getBookingForItemAndDate(item.id, date);
                      return (
                        <td key={dateIndex} className="booking-cell">
                          {booking ? booking.customerName : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {(!data || data.categories.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            {locale === "vi" ? "Không có dữ liệu" : "No data available"}
          </div>
        )}
      </div>
    </>
  );
}
