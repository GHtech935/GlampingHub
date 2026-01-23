"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  labelVi: string;
  labelEn: string;
  icon: React.ReactNode;
}

const pitchTypeOptions: PitchTypeOption[] = [
  {
    value: "tent",
    labelVi: "Lều",
    labelEn: "Tent",
    icon: <Tent className="w-8 h-8" />,
  },
  {
    value: "roof_tent",
    labelVi: "Lều nóc xe",
    labelEn: "Roof tent",
    icon: <Tent className="w-8 h-8" />,
  },
  {
    value: "trailer_tent",
    labelVi: "Lều kéo",
    labelEn: "Trailer tent",
    icon: <Tent className="w-8 h-8" />,
  },
  {
    value: "campervan",
    labelVi: "Campervan",
    labelEn: "Campervan",
    icon: <Truck className="w-8 h-8" />,
  },
  {
    value: "motorhome",
    labelVi: "Motorhome",
    labelEn: "Motorhome",
    icon: <Truck className="w-8 h-8" />,
  },
  {
    value: "touring_caravan",
    labelVi: "Caravan du lịch",
    labelEn: "Touring caravan",
    icon: <Bus className="w-8 h-8" />,
  },
];

interface PitchTypesSelectorProps {
  value: PitchType[];
  onChange: (types: PitchType[]) => void;
  required?: boolean;
}

export function PitchTypesSelector({
  value,
  onChange,
  required = true,
}: PitchTypesSelectorProps) {
  const t = useTranslations('pitch.types');

  console.log("PitchTypesSelector value:", value);
  console.log("PitchTypesSelector value type:", typeof value, Array.isArray(value));

  const handleToggle = (type: PitchType) => {
    if (value.includes(type)) {
      // Remove type (but prevent removing last one if required)
      if (required && value.length === 1) {
        return; // Don't allow removing last type
      }
      onChange(value.filter((t) => t !== type));
    } else {
      // Add type
      onChange([...value, type]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('title')}
          {required && <span className="text-red-500">*</span>}
        </CardTitle>
        <p className="text-sm text-gray-500">
          {t('description')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {pitchTypeOptions.map((option) => {
            const isSelected = value.includes(option.value);

            return (
              <div
                key={option.value}
                onClick={() => handleToggle(option.value)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "mb-3 transition-colors",
                    isSelected ? "text-primary" : "text-gray-400"
                  )}
                >
                  {option.icon}
                </div>

                {/* Labels */}
                <div className="text-center space-y-1">
                  <p className="font-medium text-sm">{t(option.value)}</p>
                  <p className="text-xs text-gray-500">{option.labelEn}</p>
                </div>

                {/* Checkmark indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Validation message */}
        {required && value.length === 0 && (
          <p className="text-sm text-red-500 mt-2">
            {t('selectAtLeastOne')}
          </p>
        )}

        {/* Selected count */}
        <p className="text-sm text-gray-600 mt-4">
          {t('selected', { count: value.length })}
        </p>
      </CardContent>
    </Card>
  );
}
