"use client";

import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ABOUT_COLOR_PALETTE, AboutColorName, getAvailableColors } from '@/lib/about-colors';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: AboutColorName) => void;
  required?: boolean;
}

/**
 * Color picker with predefined Tailwind color palette
 * Displays horizontal palette of color circles
 */
export function ColorPicker({ label, value, onChange, required = false }: ColorPickerProps) {
  const availableColors = getAvailableColors();
  const selectedColorConfig = ABOUT_COLOR_PALETTE[value as AboutColorName] || ABOUT_COLOR_PALETTE.emerald;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="flex flex-wrap gap-3">
        {availableColors.map((colorName) => {
          const colorConfig = ABOUT_COLOR_PALETTE[colorName];
          const isSelected = value === colorName;

          return (
            <button
              key={colorName}
              type="button"
              onClick={() => onChange(colorName)}
              className={cn(
                "relative w-10 h-10 rounded-full border-2 transition-all",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                isSelected ? "border-gray-900 scale-110" : "border-gray-300"
              )}
              style={{ backgroundColor: colorConfig.preview }}
              title={colorName.charAt(0).toUpperCase() + colorName.slice(1)}
            >
              {isSelected && (
                <Check className="w-5 h-5 text-white absolute inset-0 m-auto" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>

      {/* Show selected color name */}
      {value && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Màu đã chọn:</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${selectedColorConfig.bg} ${selectedColorConfig.text} font-medium`}>
            <span
              className="w-3 h-3 rounded-full border border-current"
              style={{ backgroundColor: selectedColorConfig.preview }}
            />
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        </div>
      )}
    </div>
  );
}
