"use client";

import { useState } from "react";
import { Tent, Truck, Bus, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Pitch type configuration
interface PitchTypeConfig {
  value: string;
  icon: React.ReactNode;
  group: "tent" | "vehicle" | "caravan";
}

const pitchTypeConfigs: PitchTypeConfig[] = [
  { value: "tent", icon: <Tent className="w-5 h-5" />, group: "tent" },
  { value: "roof_tent", icon: <Tent className="w-5 h-5" />, group: "tent" },
  { value: "trailer_tent", icon: <Tent className="w-5 h-5" />, group: "tent" },
  { value: "campervan", icon: <Truck className="w-5 h-5" />, group: "vehicle" },
  { value: "motorhome", icon: <Truck className="w-5 h-5" />, group: "vehicle" },
  { value: "touring_caravan", icon: <Bus className="w-5 h-5" />, group: "caravan" },
];

// Group configuration
interface GroupConfig {
  id: "tent" | "vehicle" | "caravan";
  icon: React.ReactNode;
  types: string[];
}

const groupConfigs: GroupConfig[] = [
  {
    id: "tent",
    icon: <Tent className="w-5 h-5" />,
    types: ["tent", "roof_tent", "trailer_tent"],
  },
  {
    id: "vehicle",
    icon: <Truck className="w-5 h-5" />,
    types: ["campervan", "motorhome"],
  },
  {
    id: "caravan",
    icon: <Bus className="w-5 h-5" />,
    types: ["touring_caravan"],
  },
];

interface PitchTypePopoverSelectorProps {
  selectedTypes: string[];
  onChange: (types: string[]) => void;
  className?: string;
}

export function PitchTypePopoverSelector({
  selectedTypes,
  onChange,
  className,
}: PitchTypePopoverSelectorProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("search");
  const tTypes = useTranslations("pitch.types");

  // Check if a group has any selected types
  const isGroupActive = (groupId: string) => {
    const group = groupConfigs.find((g) => g.id === groupId);
    if (!group) return false;
    return group.types.some((type) => selectedTypes.includes(type));
  };

  // Toggle a single pitch type
  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 h-12 sm:h-14 px-3 sm:px-4 rounded-lg border bg-white",
            "hover:border-gray-400 transition-colors",
            open ? "border-primary ring-1 ring-primary" : "border-gray-200",
            className
          )}
        >
          {/* Group icons */}
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "transition-colors",
                isGroupActive("tent") ? "text-primary" : "text-gray-400"
              )}
            >
              <Tent className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <span
              className={cn(
                "transition-colors",
                isGroupActive("vehicle") ? "text-primary" : "text-gray-400"
              )}
            >
              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <span
              className={cn(
                "transition-colors",
                isGroupActive("caravan") ? "text-primary" : "text-gray-400"
              )}
            >
              <Bus className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>

          {/* Chevron */}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform",
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
        <div className="p-4 space-y-4">
          {groupConfigs.map((group) => (
            <div key={group.id} className="space-y-2">
              {/* Group header */}
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-primary">{group.icon}</span>
                <span>{t(`pitchTypeGroups.${group.id}`)}</span>
              </div>

              {/* Checkboxes for this group */}
              <div className={cn(
                "gap-2 pl-7",
                group.types.length === 1 ? "flex" : "grid grid-cols-2"
              )}>
                {group.types.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <span className="text-sm text-gray-600">
                      {tTypes(type)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Selected count */}
          {selectedTypes.length > 0 && (
            <div className="pt-2 border-t text-xs text-gray-500 text-center">
              {selectedTypes.length} {selectedTypes.length === 1 ? "loại" : "loại"} đã chọn
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to convert group IDs to individual types (for backward compatibility)
export function getTypesFromGroups(groupIds: string[]): string[] {
  const types: string[] = [];
  groupIds.forEach((groupId) => {
    const group = groupConfigs.find((g) => g.id === groupId);
    if (group) {
      types.push(...group.types);
    }
  });
  return types;
}

// Helper function to convert types to group IDs (for backward compatibility)
export function getGroupsFromTypes(types: string[]): string[] {
  const groups: string[] = [];
  groupConfigs.forEach((group) => {
    if (group.types.some((type) => types.includes(type))) {
      groups.push(group.id);
    }
  });
  return groups;
}
