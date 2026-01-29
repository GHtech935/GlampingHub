"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number | string;
  onValueChange?: (value: number | undefined) => void;
  locale?: string;
  currency?: string;
  allowNegative?: boolean;
  maxValue?: number;
  minValue?: number;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      value,
      onValueChange,
      locale = "vi-VN",
      currency = "VND",
      allowNegative = false,
      maxValue,
      minValue = 0,
      placeholder = "0",
      disabled,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);

    // Check if VND suffix should be shown
    const showVndSuffix = !isFocused && displayValue && currency === "VND";

    // Format number to currency string
    const formatCurrency = (num: number): string => {
      // For Vietnamese, use dot as thousand separator
      // Format: 1.000.000 (not 1,000,000)
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    // Parse formatted string back to number
    const parseValue = (str: string): number | undefined => {
      // Remove all non-digit characters except minus sign
      const cleaned = str.replace(/[^\d-]/g, "");
      if (cleaned === "" || cleaned === "-") return undefined;
      const num = parseInt(cleaned, 10);
      return isNaN(num) ? undefined : num;
    };

    // Update display value when value prop changes
    React.useEffect(() => {
      if (value !== undefined && value !== "") {
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        if (!isNaN(numValue)) {
          setDisplayValue(formatCurrency(numValue));
        }
      } else {
        setDisplayValue("");
      }
    }, [value, locale]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;

      // Allow empty input
      if (input === "") {
        setDisplayValue("");
        onValueChange?.(undefined);
        return;
      }

      // Parse the input value
      const parsedValue = parseValue(input);

      if (parsedValue === undefined) {
        return;
      }

      // Check negative values
      if (!allowNegative && parsedValue < 0) {
        return;
      }

      // Check min/max constraints
      if (minValue !== undefined && parsedValue < minValue) {
        return;
      }
      if (maxValue !== undefined && parsedValue > maxValue) {
        return;
      }

      // Update display with formatted value
      setDisplayValue(formatCurrency(parsedValue));
      onValueChange?.(parsedValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Select all text on focus for easy editing
      e.target.select();
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Reformat on blur
      const parsedValue = parseValue(displayValue);
      if (parsedValue !== undefined) {
        setDisplayValue(formatCurrency(parsedValue));
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            showVndSuffix && "pr-12",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
        {showVndSuffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
            VND
          </span>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
