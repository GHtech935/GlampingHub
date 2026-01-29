"use client";

import { Loader2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type ColumnDef } from "./ReportDataTable";

interface SalesTabTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  summary?: Record<string, any>;
  summaryLabel?: string;
}

export function SalesTabTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = "No data found",
  summary,
  summaryLabel = "Total",
}: SalesTabTableProps<T>) {
  const visibleColumns = columns.filter(c => !c.hidden);

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {visibleColumns.map(col => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-semibold text-gray-600 whitespace-nowrap",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-32">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-32">
                  <div className="flex items-center justify-center text-gray-500 text-sm">
                    {emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-gray-50">
                  {visibleColumns.map(col => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "text-sm",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.render ? col.render(row, idx) : (row[col.key] ?? "-")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {summary && data.length > 0 && (
            <TableFooter>
              <TableRow className="bg-gray-100 font-semibold">
                {visibleColumns.map((col, i) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "text-sm",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center"
                    )}
                  >
                    {i === 0
                      ? summaryLabel
                      : summary[col.key] !== undefined
                        ? (col.render
                          ? col.render(summary as unknown as T, -1)
                          : summary[col.key])
                        : ""}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
