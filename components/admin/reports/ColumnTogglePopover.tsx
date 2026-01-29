"use client";

import { Columns } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ColumnTogglePopoverProps {
  columns: { key: string; header: string; hidden?: boolean }[];
  hiddenColumns: Set<string>;
  onToggle: (key: string) => void;
  label?: string;
}

export function ColumnTogglePopover({
  columns,
  hiddenColumns,
  onToggle,
  label = "Columns",
}: ColumnTogglePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Columns className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="end">
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {columns.map(col => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={!hiddenColumns.has(col.key)}
                onCheckedChange={() => onToggle(col.key)}
              />
              {col.header}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
