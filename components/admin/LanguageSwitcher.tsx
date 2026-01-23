"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type Locale = "vi" | "en";

interface LanguageSwitcherProps {
  value: Locale;
  onChange: (locale: Locale) => void;
  requiredLocales?: Locale[];
  filledLocales?: Locale[];
  className?: string;
}

export function LanguageSwitcher({
  value,
  onChange,
  requiredLocales = ["vi", "en"],
  filledLocales = [],
  className,
}: LanguageSwitcherProps) {
  return (
    <Tabs value={value} onValueChange={(val) => onChange(val as Locale)} className={className}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="vi" className="relative">
          <span>Tiếng Việt</span>
          {requiredLocales.includes("vi") && (
            <span className="text-red-500 ml-1">*</span>
          )}
          {filledLocales.includes("vi") && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </TabsTrigger>
        <TabsTrigger value="en" className="relative">
          <span>English</span>
          {requiredLocales.includes("en") && (
            <span className="text-red-500 ml-1">*</span>
          )}
          {filledLocales.includes("en") && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
