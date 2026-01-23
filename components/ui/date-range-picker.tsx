"use client"

import * as React from "react"
import { format } from "date-fns"
import vi from "date-fns/locale/vi"
import enUS from "date-fns/locale/en-US"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"
import { useClientLocale } from "@/components/providers/ClientI18nProvider"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const localeMap = {
  vi: vi,
  en: enUS,
}

// Hook to detect mobile screen
function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [breakpoint])

  return isMobile
}

interface DateRangePickerProps {
  dateRange?: DateRange
  onSelect?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  numberOfMonths?: number
}

export function DateRangePicker({
  dateRange,
  onSelect,
  placeholder = "Pick a date range",
  disabled = false,
  className,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const { locale } = useClientLocale()
  const isMobile = useIsMobile()

  // Disable all dates before today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get current locale for date-fns
  const currentLocale = localeMap[locale as keyof typeof localeMap] || vi

  // Format pattern based on locale
  const formatPattern = locale === 'vi' ? 'dd MMM' : 'MMM dd'

  // On mobile, show only 1 month
  const responsiveNumberOfMonths = isMobile ? 1 : numberOfMonths

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect?.(undefined)
  }

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange && "text-muted-foreground",
                dateRange?.from && "pr-8",
                className
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, formatPattern, { locale: currentLocale })} -{" "}
                      {format(dateRange.to, formatPattern, { locale: currentLocale })}
                    </>
                  ) : (
                    format(dateRange.from, formatPattern, { locale: currentLocale })
                  )
                ) : (
                  <span>{placeholder}</span>
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align={isMobile ? "center" : "end"}
            side="bottom"
            sideOffset={8}
          >
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onSelect}
              numberOfMonths={responsiveNumberOfMonths}
              disabled={{ before: today }}
            />
          </PopoverContent>
        </Popover>
        {dateRange?.from && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X className="h-4 w-4 text-gray-500 hover:text-gray-900" />
          </button>
        )}
      </div>
    </div>
  )
}
