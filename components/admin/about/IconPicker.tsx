"use client";

import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderIcon } from '@/lib/icon-renderer';

interface IconPickerProps {
  label: string;
  value: string;
  onChange: (iconName: string) => void;
  required?: boolean;
}

/**
 * Visual icon picker with search functionality
 * Allows selecting from all available Lucide React icons
 */
export function IconPicker({ label, value, onChange, required = false }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Get all available icons
  const availableIcons = useMemo(() => {
    return Object.keys(LucideIcons)
      .filter(key => {
        // Exclude createLucideIcon, *Icon suffix aliases, and Lucide* prefix aliases
        if (key === 'createLucideIcon' || key.endsWith('Icon') || key.startsWith('Lucide')) {
          return false;
        }
        const component = LucideIcons[key as keyof typeof LucideIcons];
        // Only include valid React components (with $$typeof symbol)
        return component !== undefined &&
               typeof component === 'object' &&
               component !== null &&
               '$$typeof' in component;
      })
      .sort();
  }, []);

  // Filter icons based on search term
  const filteredIcons = useMemo(() => {
    if (!search) {
      // Show first 100 icons when no search (for performance)
      return availableIcons.slice(0, 100);
    }
    return availableIcons.filter(name =>
      name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, availableIcons]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              {value && renderIcon(value, { className: "w-4 h-4" })}
              <span className="truncate">
                {value || 'Chọn icon...'}
              </span>
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Tìm kiếm icon... (vd: Heart, Star)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
            {search && (
              <p className="text-xs text-gray-500 mt-2">
                Tìm thấy {filteredIcons.length} icons
              </p>
            )}
            {!search && (
              <p className="text-xs text-gray-500 mt-2">
                Hiển thị 100 icons đầu tiên. Nhập từ khóa để tìm kiếm.
              </p>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredIcons.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Không tìm thấy icon nào
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {filteredIcons.map((iconName) => {
                  const isSelected = value === iconName;

                  return (
                    <button
                      key={iconName}
                      onClick={() => handleSelect(iconName)}
                      className={cn(
                        "p-2.5 rounded hover:bg-gray-100 transition flex items-center justify-center",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isSelected && "bg-blue-100 ring-2 ring-blue-500"
                      )}
                      title={iconName}
                      type="button"
                    >
                      {renderIcon(iconName, { className: "w-5 h-5" })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {filteredIcons.length > 0 && (
            <div className="p-2 border-t text-xs text-gray-500 text-center">
              Click vào icon để chọn
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Show selected icon name */}
      {value && (
        <p className="text-xs text-gray-600">
          Icon đã chọn: <span className="font-mono font-medium">{value}</span>
        </p>
      )}
    </div>
  );
}
