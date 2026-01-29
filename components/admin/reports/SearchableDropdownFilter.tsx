"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
}

interface SearchableDropdownFilterProps {
  label: string;
  placeholder?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  className?: string;
}

export function SearchableDropdownFilter({
  label,
  placeholder,
  options,
  value,
  onChange,
  allLabel = "All",
  className,
}: SearchableDropdownFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(lower));
  }, [options, search]);

  const selectedLabel = value
    ? options.find(o => o.value === value)?.label || value
    : allLabel;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between h-9 text-sm font-normal w-full"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={placeholder || "Search..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            <button
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors",
                !value && "bg-primary/10 text-primary"
              )}
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
            >
              <Check className={cn("h-3.5 w-3.5", !value ? "opacity-100" : "opacity-0")} />
              {allLabel}
            </button>
            {filtered.map(option => (
              <button
                key={option.value}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors",
                  value === option.value && "bg-primary/10 text-primary"
                )}
                onClick={() => { onChange(option.value); setOpen(false); setSearch(""); }}
              >
                <Check className={cn("h-3.5 w-3.5", value === option.value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{option.label}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No results</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
