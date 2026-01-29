"use client";

import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ColumnDef<T = any> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  hidden?: boolean;
}

interface ReportDataTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectRow?: (id: string, checked: boolean) => void;
  getRowId?: (row: T) => string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (columnKey: string) => void;
}

export function ReportDataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = "No data found",
  selectable,
  selectedIds,
  onSelectAll,
  onSelectRow,
  getRowId,
  sortBy,
  sortOrder,
  onSort,
}: ReportDataTableProps<T>) {
  const visibleColumns = columns.filter(c => !c.hidden);
  const allSelected = data.length > 0 && selectedIds && data.every(r => getRowId && selectedIds.has(getRowId(r)));

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => onSelectAll?.(!!checked)}
                  />
                </TableHead>
              )}
              {visibleColumns.map(col => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-semibold text-gray-600 whitespace-nowrap",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.sortable && "cursor-pointer select-none hover:text-gray-900",
                    col.className
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortBy === col.key
                        ? (sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                        : <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="h-32">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="h-32">
                  <div className="flex items-center justify-center text-gray-500 text-sm">
                    {emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => {
                const rowId = getRowId?.(row) || String(idx);
                return (
                  <TableRow key={rowId} className="hover:bg-gray-50">
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds?.has(rowId)}
                          onCheckedChange={(checked) => onSelectRow?.(rowId, !!checked)}
                        />
                      </TableCell>
                    )}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
