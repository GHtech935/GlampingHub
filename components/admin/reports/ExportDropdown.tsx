"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ExportDropdownProps {
  onExportExcel: () => void;
  onExportCSV: () => void;
  labelExport?: string;
  labelExcel?: string;
  labelCSV?: string;
  disabled?: boolean;
}

export function ExportDropdown({
  onExportExcel,
  onExportCSV,
  labelExport = "Export",
  labelExcel = "Export Excel",
  labelCSV = "Export CSV",
  disabled,
}: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled={disabled}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{labelExport}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {labelExcel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportCSV}>
          <FileText className="h-4 w-4 mr-2" />
          {labelCSV}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
