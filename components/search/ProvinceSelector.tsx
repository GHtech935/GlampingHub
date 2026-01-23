"use client";

import { useState, useMemo } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Campsite {
  id: string;
  name: string;
  province: string;
}

interface ProvinceSelectorProps {
  selectedProvinces: string[];
  onChange: (provinces: string[]) => void;
  campsites: Campsite[];
  className?: string;
}

export function ProvinceSelector({
  selectedProvinces,
  onChange,
  campsites,
  className,
}: ProvinceSelectorProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("search");

  // Derive unique provinces from campsites, alphabetically sorted
  const provinces = useMemo(() => {
    return Array.from(
      new Set(campsites.map((c) => c.province).filter(Boolean))
    ).sort();
  }, [campsites]);

  // Toggle a province selection
  const toggleProvince = (province: string) => {
    if (selectedProvinces.includes(province)) {
      onChange(selectedProvinces.filter((p) => p !== province));
    } else {
      onChange([...selectedProvinces, province]);
    }
  };

  // Clear all selections
  const handleClearAll = () => {
    onChange([]);
  };

  const hasSelection = selectedProvinces.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 px-3 sm:px-4 rounded-lg border bg-white",
            "hover:border-gray-400 transition-colors w-full justify-between",
            open ? "border-primary ring-1 ring-primary" : "border-gray-200",
            className
          )}
        >
          {/* Icon and Label */}
          <div className="flex items-center gap-2 min-w-0">
            <MapPin
              className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-colors",
                hasSelection ? "text-primary" : "text-gray-400"
              )}
            />
            <span
              className={cn(
                "text-sm truncate",
                hasSelection ? "text-gray-900 font-medium" : "text-gray-500"
              )}
            >
              {hasSelection
                ? `${selectedProvinces.length} tỉnh`
                : "Tỉnh thành"}
            </span>
          </div>

          {/* Chevron */}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform flex-shrink-0",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[calc(100vw-24px)] sm:w-80 p-0"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-sm font-medium">Chọn tỉnh/thành phố</h3>
            {hasSelection && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-primary hover:underline"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Province List */}
          <div className="max-h-[300px] overflow-y-auto p-4">
            {provinces.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                Không có tỉnh thành
              </div>
            ) : (
              <div className="space-y-3">
                {provinces.map((province) => (
                  <label
                    key={province}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                  >
                    <Checkbox
                      checked={selectedProvinces.includes(province)}
                      onCheckedChange={() => toggleProvince(province)}
                    />
                    <span className="text-sm text-gray-700">{province}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasSelection && (
            <div className="p-3 border-t text-xs text-gray-500 text-center bg-gray-50">
              {selectedProvinces.length}{" "}
              {selectedProvinces.length === 1 ? "tỉnh" : "tỉnh"} đã chọn
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
