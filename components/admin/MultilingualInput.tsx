"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher, Locale } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";

export interface MultilingualValue {
  vi: string;
  en: string;
}

interface MultilingualInputProps {
  id?: string;
  label: string;
  value: MultilingualValue;
  onChange: (value: MultilingualValue) => void;
  placeholder?: MultilingualValue;
  required?: boolean;
  requiredLocales?: Locale[];
  className?: string;
  inputClassName?: string;
  type?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

export function MultilingualInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  requiredLocales = ["vi", "en"],
  className,
  inputClassName,
  type = "text",
  min,
  max,
  step,
}: MultilingualInputProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("vi");

  const handleInputChange = (locale: Locale, inputValue: string) => {
    onChange({
      ...value,
      [locale]: inputValue,
    });
  };

  const getFilledLocales = (): Locale[] => {
    const filled: Locale[] = [];
    if (value.vi && value.vi.trim().length > 0) filled.push("vi");
    if (value.en && value.en.trim().length > 0) filled.push("en");
    return filled;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
        <Label htmlFor={id} className="whitespace-nowrap">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <LanguageSwitcher
          value={activeLocale}
          onChange={setActiveLocale}
          requiredLocales={requiredLocales}
          filledLocales={getFilledLocales()}
          className="w-auto flex-shrink-0"
        />
      </div>

      {activeLocale === "vi" && (
        <Input
          id={id}
          type={type}
          value={value.vi || ""}
          onChange={(e) => handleInputChange("vi", e.target.value)}
          placeholder={placeholder?.vi}
          className={inputClassName}
          required={required && requiredLocales.includes("vi")}
          min={min}
          max={max}
          step={step}
        />
      )}

      {activeLocale === "en" && (
        <Input
          id={`${id}-en`}
          type={type}
          value={value.en || ""}
          onChange={(e) => handleInputChange("en", e.target.value)}
          placeholder={placeholder?.en}
          className={inputClassName}
          required={required && requiredLocales.includes("en")}
          min={min}
          max={max}
          step={step}
        />
      )}
    </div>
  );
}
