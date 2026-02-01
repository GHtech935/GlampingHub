'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Moon, ChevronLeft, ChevronRight, Users, Loader2 } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { vi } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { GlampingParameterSelector } from './GlampingParameterSelector'
import { type MultilingualText } from '@/lib/i18n-utils'
import { formatCurrency } from '@/lib/utils'

// Format date to YYYY-MM-DD without timezone conversion
function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface CalendarDay {
  date: string
  dayOfWeek: string
  isWeekend: boolean
  price: number
  pricing?: Record<string, number>  // Pricing per parameter
  minStay: number
  priceType: string
  status: string
  isAvailable: boolean
  notes: string | null
  isCheckInDate?: boolean
  hasPricing?: boolean
  matchedEventId?: string | null
  matchedEventName?: string | null
}

interface GlampingParameter {
  id: string
  parameter_id: string
  name: MultilingualText | string
  color_code: string
  controls_inventory: boolean
  sets_pricing: boolean
  min_quantity?: number
  max_quantity?: number
}

interface GlampingDateRangePickerWithCalendarProps {
  itemId?: string
  dateRange?: DateRange
  onDateRangeChange: (range: DateRange | undefined) => void
  locale?: string
  disabled?: boolean
  // Parameters
  parameters?: GlampingParameter[]
  parameterQuantities?: Record<string, number>
  onQuantitiesChange?: (quantities: Record<string, number>) => void
  loadingParameters?: boolean
  // Optional override for parameter pricing (from real-time booking API with group pricing)
  overrideParameterPricing?: Record<string, number>
  // Optional override for parameter pricing modes (per_person or per_group)
  overrideParameterPricingModes?: Record<string, 'per_person' | 'per_group'>
  // Optional override for nightly pricing breakdown (from real-time booking API with group pricing)
  overrideNightlyPricing?: Array<{ date: string; parameters: Record<string, number> }>
  // Loading state for pricing (from parent's pricing hook)
  pricingLoading?: boolean
  // Single person surcharge alert props
  enableSinglePersonSurchargeAlert?: boolean
  singlePersonSurchargeAlertText?: { vi: string; en: string }
}

export function GlampingDateRangePickerWithCalendar({
  itemId,
  dateRange,
  onDateRangeChange,
  locale = 'vi',
  disabled = false,
  parameters = [],
  parameterQuantities = {},
  onQuantitiesChange = () => {},
  loadingParameters = false,
  overrideParameterPricing,
  overrideParameterPricingModes,
  overrideNightlyPricing,
  pricingLoading = false,
  enableSinglePersonSurchargeAlert,
  singlePersonSurchargeAlertText,
}: GlampingDateRangePickerWithCalendarProps) {
  const [calendar, setCalendar] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(false)
  const [nights, setNights] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [parameterPricing, setParameterPricing] = useState<Record<string, number>>({})
  const [parameterPricingModes, setParameterPricingModes] = useState<Record<string, 'per_person' | 'per_group'>>({})
  const [nightlyParameterPricing, setNightlyParameterPricing] = useState<Array<{ date: string; pricing: Record<string, number> }>>([])
  const { toast } = useToast()
  const prevItemIdRef = useRef<string | undefined>(itemId)

  // Reset calendar when itemId changes
  useEffect(() => {
    if (prevItemIdRef.current !== itemId) {
      setCalendar([])
      prevItemIdRef.current = itemId
    }
  }, [itemId])

  // Set currentMonth to dateRange.from month when dateRange is provided
  useEffect(() => {
    if (dateRange?.from) {
      const fromMonth = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1)
      setCurrentMonth(fromMonth)
    }
  }, [dateRange?.from])

  // Fetch availability with pricing when itemId or currentMonth changes
  useEffect(() => {
    if (!itemId) {
      setCalendar([])
      return
    }

    const fetchAvailability = async () => {
      try {
        setLoading(true)
        // Format date without timezone conversion
        const year = currentMonth.getFullYear()
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0')
        const startDate = `${year}-${month}-01`

        const response = await fetch(
          `/api/glamping/items/${itemId}/availability?startDate=${startDate}&months=2`
        )

        if (response.ok) {
          const data = await response.json()
          const newCalendar = data.calendar || []

          // Merge with old data to support cross-month date selection
          setCalendar(prev => {
            const merged = [...prev, ...newCalendar]
            // Remove duplicates by date, keep latest data
            const uniqueMap = new Map<string, typeof merged[0]>()
            merged.forEach(day => uniqueMap.set(day.date, day))
            return Array.from(uniqueMap.values()).sort((a, b) =>
              a.date.localeCompare(b.date)
            )
          })
        }
      } catch (error) {
        console.error('Error fetching availability:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [itemId, currentMonth])

  // Validate dateRange against calendar availability when calendar data loads
  // This clears invalid pre-filled dates (e.g., from copying dates between tents)
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to || calendar.length === 0) return

    // Check if any date in the range is unavailable
    const start = dateRange.from
    const end = dateRange.to
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let hasInvalidDate = false
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateToYMD(d)
      const dayData = calendar.find(day => day.date === dateStr)
      const checkDate = new Date(dateStr)
      checkDate.setHours(0, 0, 0, 0)

      // Invalid if: past date OR no data OR not available
      if (checkDate < today || !dayData || !dayData.isAvailable) {
        hasInvalidDate = true
        break
      }
    }

    if (hasInvalidDate) {
      // Clear the invalid dateRange
      onDateRangeChange(undefined)
      toast({
        title: locale === 'vi' ? 'Ngày không khả dụng' : 'Dates not available',
        description: locale === 'vi'
          ? 'Ngày đã chọn không khả dụng cho item này. Vui lòng chọn lại.'
          : 'Selected dates are not available for this item. Please select again.',
        variant: 'destructive'
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar, itemId])

  // Calculate nights when date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const nightsCount = differenceInDays(dateRange.to, dateRange.from)
      setNights(nightsCount > 0 ? nightsCount : 0)
    } else {
      setNights(0)
    }
  }, [dateRange])

  // Calculate parameter pricing when calendar or dateRange changes
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to || calendar.length === 0) {
      setParameterPricing({})
      setNightlyParameterPricing([])
      return
    }

    const startDate = format(dateRange.from, 'yyyy-MM-dd')
    const endDate = format(dateRange.to, 'yyyy-MM-dd')

    // Aggregate pricing from all days in range (exclude check-out date)
    const pricingPerParameter: Record<string, number> = {}
    const nightlyDetails: Array<{ date: string; pricing: Record<string, number> }> = []

    calendar.forEach((day) => {
      // Only count nights (check-out date excluded)
      if (day.date >= startDate && day.date < endDate && day.pricing) {
        nightlyDetails.push({ date: day.date, pricing: { ...day.pricing } })

        Object.entries(day.pricing).forEach(([paramId, price]) => {
          if (!pricingPerParameter[paramId]) {
            pricingPerParameter[paramId] = 0
          }
          pricingPerParameter[paramId] += Number(price)
        })
      }
    })

    setParameterPricing(pricingPerParameter)
    setNightlyParameterPricing(nightlyDetails)
  }, [calendar, dateRange])

  // Re-fetch pricing with group tiers when quantities change
  // Skip if overrideParameterPricing is provided (parent is handling pricing)
  useEffect(() => {
    // When parent provides override pricing, don't fetch internally
    if (overrideParameterPricing !== undefined) return

    if (!itemId || !dateRange?.from || !dateRange?.to) return

    const hasQuantity = Object.values(parameterQuantities).some(q => q > 0)
    if (!hasQuantity) return

    const fetchGroupPricing = async () => {
      try {
        const params = new URLSearchParams({
          itemId,
          checkIn: format(dateRange.from!, 'yyyy-MM-dd'),
          checkOut: format(dateRange.to!, 'yyyy-MM-dd'),
          adults: '0',
          children: '0',
        })

        Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
          if (quantity > 0) {
            params.append(`param_${paramId}`, quantity.toString())
          }
        })

        const response = await fetch(`/api/glamping/booking/calculate-pricing?${params}`)
        const data = await response.json()

        if (response.ok) {
          // Override parameter pricing with group-tier-aware pricing
          if (data.parameterPricing) {
            setParameterPricing(data.parameterPricing)
          }
          // Set pricing modes for per_person vs per_group calculation
          if (data.parameterPricingModes) {
            setParameterPricingModes(data.parameterPricingModes)
          }
          // Override nightly breakdown with group-tier-aware data
          if (data.nightlyPricing) {
            setNightlyParameterPricing(
              data.nightlyPricing.map((n: any) => ({
                date: n.date,
                pricing: n.parameters || {},
              }))
            )
          }
        }
      } catch (error) {
        console.error('Error fetching group pricing:', error)
      }
    }

    const timer = setTimeout(fetchGroupPricing, 300)
    return () => clearTimeout(timer)
  }, [itemId, dateRange, parameterQuantities, overrideParameterPricing])

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const isPastDate = (date: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // Check if there are any unavailable dates in the range (exclusive of end date for check-out)
  const hasUnavailableDatesInRange = (startDate: Date, endDate: Date): boolean => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateToYMD(d)
      const dayData = calendar.find(day => day.date === dateStr)

      if (isPastDate(dateStr)) return true
      if (!dayData || !dayData.isAvailable) return true
    }

    return false
  }

  // Check if there are N consecutive available nights from a start date
  const hasConsecutiveAvailableNights = (startDate: Date, minNights: number): number => {
    let consecutiveNights = 0
    const start = new Date(startDate)

    for (let d = new Date(start); consecutiveNights < 50; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateToYMD(d)
      const dayData = calendar.find(day => day.date === dateStr)

      if (!dayData || !dayData.isAvailable || isPastDate(dateStr)) {
        break
      }
      consecutiveNights++

      if (consecutiveNights >= minNights) {
        break
      }
    }

    return consecutiveNights
  }

  // Helper to get next day
  const getNextDay = (dateStr: string): string => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + 1)
    return formatDateToYMD(date)
  }

  // Helper to find the next check-in date after a given date
  const findNextCheckInDate = (fromDate: Date): string | null => {
    if (!calendar || calendar.length === 0) return null

    const checkInDatesAfter = calendar
      .filter(day =>
        day.isCheckInDate &&
        new Date(day.date) > fromDate &&
        !day.isAvailable
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return checkInDatesAfter.length > 0 ? checkInDatesAfter[0].date : null
  }

  const handleDateClick = (date: string, day: CalendarDay) => {
    if (disabled) return
    if ((!day.isAvailable && !day.isCheckInDate) || isPastDate(date)) return

    const clickedDate = new Date(date)

    if (!dateRange?.from || (dateRange.from && dateRange.to)) {
      // Start new selection - validate consecutive nights availability
      const minStay = day.minStay || 1
      const availableConsecutive = hasConsecutiveAvailableNights(clickedDate, minStay)

      if (availableConsecutive < minStay) {
        toast({
          title: locale === 'vi' ? 'Không đủ đêm liên tục' : 'Not enough consecutive nights',
          description: locale === 'vi'
            ? `Cần ${minStay} đêm liên tục nhưng chỉ có ${availableConsecutive} đêm khả dụng từ ngày này.`
            : `Need ${minStay} consecutive nights but only ${availableConsecutive} available from this date.`,
          variant: "destructive",
        })
        return
      }

      const nextDay = getNextDay(date)
      const nextDayDate = new Date(nextDay)

      if (!hasUnavailableDatesInRange(clickedDate, nextDayDate)) {
        const dayAfterNext = getNextDay(nextDay)
        const dayAfterNextDate = new Date(dayAfterNext)
        const isSandwiched = hasUnavailableDatesInRange(clickedDate, dayAfterNextDate)

        if (isSandwiched && minStay === 1) {
          onDateRangeChange({ from: clickedDate, to: nextDayDate })
          return
        }
      }

      onDateRangeChange({ from: clickedDate, to: undefined })
    } else if (dateRange.from && !dateRange.to) {
      // Complete selection
      if (clickedDate > dateRange.from) {
        // Validate minimum stay requirement
        const startDateStr = formatDateToYMD(dateRange.from)
        const startDay = calendar.find(d => d.date === startDateStr)
        const minStay = startDay?.minStay || 1
        const selectedNights = Math.ceil((clickedDate.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))

        if (selectedNights < minStay) {
          toast({
            title: locale === 'vi' ? 'Không đủ số đêm tối thiểu' : 'Minimum stay not met',
            description: locale === 'vi'
              ? `Phải đặt tối thiểu ${minStay} đêm liên tục. Bạn đang chọn ${selectedNights} đêm.`
              : `Minimum ${minStay} consecutive nights required. You selected ${selectedNights} nights.`,
            variant: "destructive",
          })
          onDateRangeChange({ from: clickedDate, to: undefined })
          return
        }

        // Special case: Same-day turnover allowed for check-in dates
        if (day.isCheckInDate) {
          onDateRangeChange({ from: dateRange.from, to: clickedDate })
          return
        }

        // Normal validation
        if (hasUnavailableDatesInRange(dateRange.from, clickedDate)) {
          toast({
            title: locale === 'vi' ? 'Không thể chọn khoảng ngày này' : 'Cannot select this range',
            description: locale === 'vi'
              ? 'Có ngày không khả dụng trong khoảng ngày bạn chọn. Vui lòng chọn lại.'
              : 'There are unavailable dates in your selected range. Please select again.',
            variant: "destructive",
          })
          onDateRangeChange({ from: clickedDate, to: undefined })
          return
        }

        onDateRangeChange({ from: dateRange.from, to: clickedDate })
      } else {
        onDateRangeChange({ from: clickedDate, to: undefined })
      }
    }
  }

  const isDateInRange = (date: string) => {
    if (!dateRange?.from) return false
    const checkDate = new Date(date)
    if (!dateRange.to) return checkDate.getTime() === dateRange.from.getTime()
    return checkDate >= dateRange.from && checkDate <= dateRange.to
  }

  const isRangeStart = (date: string) => {
    if (!dateRange?.from || !dateRange?.to) return false
    const checkDate = new Date(date)
    return checkDate.getTime() === dateRange.from.getTime()
  }

  const isRangeEnd = (date: string) => {
    if (!dateRange?.from || !dateRange?.to) return false
    const checkDate = new Date(date)
    return checkDate.getTime() === dateRange.to.getTime()
  }

  const isRangeMiddle = (date: string) => {
    if (!dateRange?.from || !dateRange?.to) return false
    const checkDate = new Date(date)
    return checkDate > dateRange.from && checkDate < dateRange.to
  }

  const calculateTotalPrice = () => {
    if (!dateRange?.from || !dateRange?.to) return 0
    const fromStr = format(dateRange.from, 'yyyy-MM-dd')
    const toStr = format(dateRange.to, 'yyyy-MM-dd')
    const daysInRange = calendar.filter(day =>
      day.date >= fromStr && day.date < toStr
    )
    return daysInRange.reduce((sum, day) => sum + day.price, 0)
  }

  const renderCalendar = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const startDayRaw = monthStart.getDay()
    const startDay = startDayRaw === 0 ? 6 : startDayRaw - 1

    const daysInMonth: (CalendarDay | null)[] = []

    // Add empty cells for days before month start (Monday-first)
    for (let i = 0; i < startDay; i++) {
      daysInMonth.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dateStr = formatDateToYMD(date)
      const dayData = calendar.find((d) => d.date === dateStr)

      if (dayData) {
        daysInMonth.push(dayData)
      } else {
        daysInMonth.push({
          date: dateStr,
          dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          price: 0,
          minStay: 1,
          priceType: 'standard',
          status: 'unavailable',
          isAvailable: false,
          notes: null,
        })
      }
    }

    return daysInMonth
  }

  const days = renderCalendar()
  const hasRange = dateRange?.from && dateRange?.to
  const totalPrice = calculateTotalPrice()

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none">
        <CardContent className="px-0 py-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Booking Info + Parameters */}
            <div className="">
              {/* Booking Info */}
              <div className="p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {locale === 'vi' ? 'Thông tin đặt phòng' : 'Booking Information'}
                </p>

                {dateRange?.from ? (
                  <>
                    <div className="flex gap-6 text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="text-gray-500">Check-in:</span>
                        <span className="font-medium text-gray-900">
                          {format(dateRange.from, 'dd/MM/yyyy', { locale: locale === 'vi' ? vi : undefined })}
                        </span>
                      </div>

                      {dateRange.to && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-gray-500">Check-out:</span>
                          <span className="font-medium text-gray-900">
                            {format(dateRange.to, 'dd/MM/yyyy', { locale: locale === 'vi' ? vi : undefined })}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    {locale === 'vi' ? 'Chưa chọn ngày' : 'No dates selected'}
                  </p>
                )}

                {!itemId && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-amber-600">
                      {locale === 'vi'
                        ? 'Chọn item trước để xem availability'
                        : 'Select an item first'}
                    </p>
                  </div>
                )}
              </div>

              {/* Parameters Selector */}
              {parameters.length > 0 && (
                <div className="p-4">
                  {loadingParameters ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2 text-sm">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</span>
                    </div>
                  ) : (
                    <GlampingParameterSelector
                      parameters={parameters}
                      parameterQuantities={parameterQuantities}
                      onQuantitiesChange={onQuantitiesChange}
                      locale={locale}
                      disabled={disabled}
                      // When pricingLoading is true, use empty object to prevent showing wrong prices
                      // Otherwise use override (with group pricing) or fallback to calendar-based pricing
                      parameterPricing={pricingLoading ? {} : (overrideParameterPricing || parameterPricing)}
                      // Pass pricing modes for per_person vs per_group calculation
                      // Use override if provided, otherwise use internally fetched state
                      parameterPricingModes={pricingLoading ? undefined : (overrideParameterPricingModes || parameterPricingModes)}
                      nights={nights}
                      dateRange={dateRange}
                      // Use override nightly pricing (with group pricing) or fallback to calendar-based
                      // Transform override format: { date, parameters } → { date, pricing }
                      nightlyParameterPricing={
                        pricingLoading
                          ? []
                          : overrideNightlyPricing
                            ? overrideNightlyPricing.map(n => ({ date: n.date, pricing: n.parameters }))
                            : nightlyParameterPricing
                      }
                      pricingLoading={pricingLoading}
                      enableSinglePersonSurchargeAlert={enableSinglePersonSurchargeAlert}
                      singlePersonSurchargeAlertText={singlePersonSurchargeAlertText}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Column 2: Calendar */}
            <div className="space-y-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-8 w-8" disabled={disabled}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h3 className="text-base font-semibold">
                  {currentMonth.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <Button type="button" variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8" disabled={disabled}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Min stay requirement display */}
              {calendar.length > 0 && calendar[0].minStay > 1 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {locale === 'vi'
                        ? `Yêu cầu tối thiểu: ${calendar[0].minStay} đêm liên tục`
                        : `Minimum requirement: ${calendar[0].minStay} consecutive nights`}
                    </span>
                  </div>
                </div>
              )}

              {/* Calendar grid */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-500">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
                </div>
              ) : (
                <>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-[0.05rem] mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-[0.05rem]">
                    {days.map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="aspect-square" />
                      }

                      const isSelected = isDateInRange(day.date)
                      const isStartDate = isRangeStart(day.date)
                      const isEndDate = isRangeEnd(day.date)
                      const isMiddle = isRangeMiddle(day.date)
                      const isPast = isPastDate(day.date)

                      const isNormallyClickable = day.isAvailable && !isPast && !disabled

                      const nextCheckInDate = dateRange?.from && !dateRange?.to
                        ? findNextCheckInDate(dateRange.from)
                        : null

                      const isCheckOutCandidate = nextCheckInDate && day.date === nextCheckInDate

                      const isClickable = isNormallyClickable || isCheckOutCandidate

                      // Determine border radius
                      let roundedClass = 'rounded-md'
                      if (hasRange && isSelected) {
                        if (isStartDate) roundedClass = 'rounded-l-lg'
                        else if (isEndDate) roundedClass = 'rounded-r-lg'
                        else roundedClass = 'rounded-none'
                      }

                      // Determine border
                      let borderClass = ''
                      if (!hasRange) {
                        borderClass = isClickable ? 'border-[0.5px] border-primary/30' : 'border-[0.5px] border-gray-300/50'
                      } else if (hasRange && !isSelected) {
                        borderClass = isClickable ? 'border-[0.5px] border-primary/30' : 'border-[0.5px] border-gray-300/50'
                      }

                      // Determine background color
                      let bgColorClass = ''
                      if (isCheckOutCandidate) {
                        bgColorClass = 'bg-blue-100 hover:bg-blue-200 border-2 border-blue-400'
                      } else if (isClickable) {
                        const isInSelection = isDateInRange(day.date)
                        if (isInSelection) {
                          bgColorClass = 'bg-blue-700 hover:bg-blue-600'
                        } else {
                          bgColorClass = 'bg-primary hover:bg-primary/90'
                        }
                      } else {
                        bgColorClass = 'bg-gray-100'
                      }

                      // Negative margin for cells in range
                      let marginClass = ''
                      if (hasRange && isSelected) {
                        if (isStartDate) {
                          marginClass = '-mr-[0.05rem]'
                        } else if (isEndDate) {
                          marginClass = '-ml-[0.05rem]'
                        } else if (isMiddle) {
                          marginClass = '-mx-[0.05rem]'
                        }
                      }

                      return (
                        <button
                          type="button"
                          key={day.date}
                          onClick={() => handleDateClick(day.date, day)}
                          disabled={!isClickable}
                          className={`
                            aspect-square p-1 ${roundedClass} ${borderClass} ${marginClass} text-center transition-all relative
                            ${bgColorClass}
                            ${isCheckOutCandidate ? 'text-blue-700 cursor-pointer font-semibold' : isClickable ? 'text-white cursor-pointer' : 'text-gray-400 cursor-not-allowed'}
                          `}
                        >
                          {/* Day number - top right */}
                          <div className="absolute top-1 right-1 text-xs font-semibold">
                            {new Date(day.date).getDate()}
                          </div>

                          {/* Night indicator if not in range */}
                          {isClickable && (!hasRange || !isSelected) && (
                            <div className="flex items-center justify-center h-full">
                              <Moon className="h-3 w-3" />
                              <span className="text-xs ml-1">1</span>
                            </div>
                          )}

                          {/* Night count on start date */}
                          {hasRange && isStartDate && nights > 0 && (
                            <div className="absolute bottom-1 left-1 z-10">
                              <div className="flex items-center gap-1 bg-blue-700 px-2 py-1 rounded">
                                <span className="text-sm font-semibold">{nights}</span>
                                <Moon className="h-3 w-3" />
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
