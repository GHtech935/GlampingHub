"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher, Locale } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";

export interface MultilingualValue {
  vi: string;
  en: string;
}

interface MultilingualTextareaProps {
  id?: string;
  label: string;
  value: MultilingualValue;
  onChange: (value: MultilingualValue) => void;
  placeholder?: MultilingualValue;
  required?: boolean;
  requiredLocales?: Locale[];
  rows?: number;
  className?: string;
  textareaClassName?: string;
}

export function MultilingualTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  requiredLocales = ["vi", "en"],
  rows = 4,
  className,
  textareaClassName,
}: MultilingualTextareaProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("vi");

  const handleTextareaChange = (locale: Locale, textValue: string) => {
    onChange({
      ...value,
      [locale]: textValue,
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
        <Textarea
          id={id}
          value={value.vi || ""}
          onChange={(e) => handleTextareaChange("vi", e.target.value)}
          placeholder={placeholder?.vi}
          rows={rows}
          className={textareaClassName}
          required={required && requiredLocales.includes("vi")}
        />
      )}

      {activeLocale === "en" && (
        <Textarea
          id={`${id}-en`}
          value={value.en || ""}
          onChange={(e) => handleTextareaChange("en", e.target.value)}
          placeholder={placeholder?.en}
          rows={rows}
          className={textareaClassName}
          required={required && requiredLocales.includes("en")}
        />
      )}
    </div>
  );
}
