"use client";

import { Tent, Truck, Bus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PitchType =
  | "tent"
  | "roof_tent"
  | "trailer_tent"
  | "campervan"
  | "motorhome"
  | "touring_caravan";

interface PitchTypeOption {
  value: PitchType;
  icon: React.ReactNode;
}

const pitchTypeOptions: PitchTypeOption[] = [
  { value: "tent", icon: <Tent className="w-6 h-6" /> },
  { value: "roof_tent", icon: <Tent className="w-6 h-6" /> },
  { value: "trailer_tent", icon: <Tent className="w-6 h-6" /> },
  { value: "campervan", icon: <Truck className="w-6 h-6" /> },
  { value: "motorhome", icon: <Truck className="w-6 h-6" /> },
  { value: "touring_caravan", icon: <Bus className="w-6 h-6" /> },
];

// Pitch type display order
const pitchTypeOrder: string[] = [
  'tent',
  'roof_tent',
  'trailer_tent',
  'campervan',
  'motorhome',
  'touring_caravan',
];

// Sort pitch types by predefined order
const sortPitchTypes = (types: string[]): string[] => {
  return [...types].sort((a, b) => {
    const indexA = pitchTypeOrder.indexOf(a);
    const indexB = pitchTypeOrder.indexOf(b);
    const orderA = indexA === -1 ? 999 : indexA;
    const orderB = indexB === -1 ? 999 : indexB;
    return orderA - orderB;
  });
};

// Pitch type names in Vietnamese and English
const pitchTypeNames: Record<string, { vi: string; en: string }> = {
  tent: { vi: 'Lều', en: 'Tent' },
  roof_tent: { vi: 'Lều nóc xe', en: 'Roof Tent' },
  trailer_tent: { vi: 'Lều kéo', en: 'Trailer Tent' },
  campervan: { vi: 'Campervan', en: 'Campervan' },
  motorhome: { vi: 'Motorhome', en: 'Motorhome' },
  touring_caravan: { vi: 'Touring caravan', en: 'Touring Caravan' },
};

const getPitchTypeName = (type: string, locale: string): string => {
  const names = pitchTypeNames[type];
  if (names) {
    return locale === 'vi' ? names.vi : names.en;
  }
  return type;
};

interface PitchTypeSelectorAdminProps {
  availableTypes: string[];
  selectedType: string;
  onChange: (type: string) => void;
  pricesByType?: Record<string, { price: number }>;
  locale?: string;
  disabled?: boolean;
}

export function PitchTypeSelectorAdmin({
  availableTypes,
  selectedType,
  onChange,
  pricesByType = {},
  locale = 'vi',
  disabled = false,
}: PitchTypeSelectorAdminProps) {
  // If no types available, don't show selector
  if (availableTypes.length === 0) {
    return null;
  }

  // Filter and sort pitch types to only show available ones
  const sortedAvailableTypes = sortPitchTypes(availableTypes);
  const filteredOptions = pitchTypeOptions.filter(
    option => sortedAvailableTypes.includes(option.value)
  );

  const handleSelect = (type: string) => {
    if (disabled) return;
    onChange(type);
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <h4 className="text-lg font-semibold mb-1">
        {locale === 'vi' ? 'Chọn loại slot' : 'Select Slot Type'}
      </h4>
      {/* Grid of cards - single row */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {filteredOptions.map((option) => {
          const isSelected = selectedType === option.value;
          const price = pricesByType[option.value]?.price;

          return (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "relative flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all min-w-[120px] max-w-[180px]",
                filteredOptions.length > 1 && "flex-1",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:shadow-md",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              {/* Checkmark indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "mb-2 transition-colors",
                  isSelected ? "text-primary" : "text-gray-400"
                )}
              >
                {option.icon}
              </div>

              {/* Name */}
              <p className={cn(
                "font-medium text-sm text-center",
                isSelected ? "text-primary" : "text-gray-700"
              )}>
                {getPitchTypeName(option.value, locale)}
              </p>

              {/* Price */}
              {price !== undefined && price > 0 && (
                <p className={cn(
                  "text-xs mt-1",
                  isSelected ? "text-primary/80" : "text-gray-500"
                )}>
                  {new Intl.NumberFormat('vi-VN').format(price)}đ
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation message */}
      {!selectedType && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">
            {locale === 'vi'
              ? 'Vui lòng chọn một loại slot'
              : 'Please select a slot type'}
          </p>
        </div>
      )}
    </div>
  );
}
