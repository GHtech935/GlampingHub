'use client'

import { useState, useEffect, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Users, Baby, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { vi } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'

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
  pricesByType?: Record<string, number>
  minStay: number
  priceType: string
  status: string
  isAvailable: boolean
  notes: string | null
  isCheckInDate?: boolean  // For same-day turnover: true if this date is a check-in for another booking
}

interface DateRangePickerWithAvailabilityProps {
  pitchId?: string
  dateRange?: DateRange
  adults?: number
  childrenCount?: number
  maxGuests?: number
  selectedPitchType?: string
  onDateRangeChange: (range: DateRange | undefined) => void
  onGuestsChange: (adults: number, childrenCount: number) => void
  locale?: string
}

export function DateRangePickerWithAvailability({
  pitchId,
  dateRange,
  adults = 2,
  childrenCount = 0,
  maxGuests,
  selectedPitchType,
  onDateRangeChange,
  onGuestsChange,
  locale = 'vi'
}: DateRangePickerWithAvailabilityProps) {
  const [calendar, setCalendar] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(false)
  const [nights, setNights] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { toast } = useToast()
  const prevPitchIdRef = useRef<string | undefined>(pitchId)

  // Reset calendar when pitchId changes (switching to different pitch)
  useEffect(() => {
    if (prevPitchIdRef.current !== pitchId) {
      setCalendar([]) // Clear old pitch's data
      prevPitchIdRef.current = pitchId
    }
  }, [pitchId])

  // Fetch availability with pricing when pitchId or currentMonth changes
  useEffect(() => {
    if (!pitchId) {
      setCalendar([])
      return
    }

    const fetchAvailability = async () => {
      try {
        setLoading(true)
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
          .toISOString()
          .split('T')[0]

        const response = await fetch(
          `/api/pitch/${pitchId}/availability?startDate=${startDate}&months=2`
        )

        if (response.ok) {
          const data = await response.json()
          const newCalendar = data.calendar || []

          // Merge với data cũ thay vì replace để hỗ trợ chọn ngày cross-month
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
  }, [pitchId, currentMonth])

  // Calculate nights when date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const nightsCount = differenceInDays(dateRange.to, dateRange.from)
      setNights(nightsCount > 0 ? nightsCount : 0)
    } else {
      setNights(0)
    }
  }, [dateRange])

  // Calculate max allowed for each field based on maxGuests
  const totalGuests = adults + childrenCount
  const isOverCapacity = maxGuests ? totalGuests > maxGuests : false

  const handleAdultsChange = (value: string) => {
    const num = parseInt(value) || 0
    // Prevent negative values
    if (num < 0) return
    // Check against maxGuests if available
    const newTotal = num + childrenCount
    if (maxGuests && newTotal > maxGuests) {
      // Allow the change but it will show error
      onGuestsChange(num, childrenCount)
      return
    }
    onGuestsChange(num, childrenCount)
  }

  const handleChildrenChange = (value: string) => {
    const num = parseInt(value) || 0
    // Prevent negative values
    if (num < 0) return
    // Check against maxGuests if available
    const newTotal = adults + num
    if (maxGuests && newTotal > maxGuests) {
      // Allow the change but it will show error
      onGuestsChange(adults, num)
      return
    }
    onGuestsChange(adults, num)
  }

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

      // Check if date is past
      if (isPastDate(dateStr)) return true

      // Check if date is unavailable (no data or not available)
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

    // Filter check-in dates after fromDate
    const checkInDatesAfter = calendar
      .filter(day =>
        day.isCheckInDate &&
        new Date(day.date) > fromDate &&
        !day.isAvailable // Only consider booked check-in dates
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Return the first one (nearest)
    return checkInDatesAfter.length > 0 ? checkInDatesAfter[0].date : null
  }

  const handleDateClick = (date: string, day: CalendarDay) => {
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
        return // Block selection
      }

      const nextDay = getNextDay(date)

      // Check if can book date→nextDay (supports same-day turnover)
      const nextDayDate = new Date(nextDay)
      if (!hasUnavailableDatesInRange(clickedDate, nextDayDate)) {
        // Can book 1 night - check if can extend to 2+ nights
        const dayAfterNext = getNextDay(nextDay)
        const dayAfterNextDate = new Date(dayAfterNext)

        // Check if can book date→dayAfterNext (2 nights)
        // If NOT, then this is a sandwiched single available date
        const isSandwiched = hasUnavailableDatesInRange(clickedDate, dayAfterNextDate)

        if (isSandwiched && minStay === 1) {
          // Can only book 1 night - auto-select!
          onDateRangeChange({ from: clickedDate, to: nextDayDate })
          return
        }
      }

      // Normal selection - let user pick check-out
      onDateRangeChange({ from: clickedDate, to: undefined })
    } else if (dateRange.from && !dateRange.to) {
      // Complete selection
      if (clickedDate > dateRange.from) {
        // Validate minimum stay requirement FIRST (before same-day turnover check)
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
          // Reset to new start
          onDateRangeChange({ from: clickedDate, to: undefined })
          return
        }

        // Special case: Same-day turnover allowed for check-in dates (AFTER minStay validation)
        if (day.isCheckInDate) {
          onDateRangeChange({ from: dateRange.from, to: clickedDate })
          return
        }

        // Normal validation for non-check-in dates
        if (hasUnavailableDatesInRange(dateRange.from, clickedDate)) {
          // Cannot select this range - show toast and reset
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
        // If clicked date is before start, reset
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

  // Helper to get price for selected pitch type or fallback to minPrice
  const getDayPrice = (day: CalendarDay): number => {
    if (selectedPitchType && day.pricesByType && day.pricesByType[selectedPitchType]) {
      return day.pricesByType[selectedPitchType]
    }
    return day.price // fallback to minPrice
  }

  const calculateTotalPrice = () => {
    if (!dateRange?.from || !dateRange?.to) return 0
    const fromStr = format(dateRange.from, 'yyyy-MM-dd')
    const toStr = format(dateRange.to, 'yyyy-MM-dd')
    const daysInRange = calendar.filter(day =>
      day.date >= fromStr && day.date < toStr
    )
    return daysInRange.reduce((sum, day) => sum + getDayPrice(day), 0)
  }

  const renderCalendar = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    // Convert Sunday-first (getDay: 0=Sun) to Monday-first (0=Mon)
    const startDayRaw = monthStart.getDay() // 0 = Sunday
    const startDay = startDayRaw === 0 ? 6 : startDayRaw - 1 // Monday = 0, Sunday = 6

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
        // If no data, assume unavailable
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
      {/* Date Range Picker */}
      <div className="space-y-2">
        <Card className="border-none shadow-none">
          <CardContent className="px-0 py-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Info + Guest Count */}
              <div className="space-y-4">
                {/* Booking Info */}
                <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {locale === 'vi' ? 'Thông tin đặt phòng' : 'Booking Information'}
                  </p>

                  {dateRange?.from ? (
                    <>
                      <div className="flex gap-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Check-in:</span>
                          <p className="font-medium text-gray-900">
                            {format(dateRange.from, 'dd/MM/yyyy', { locale: locale === 'vi' ? vi : undefined })}
                          </p>
                        </div>

                        {dateRange.to && (
                          <div className="text-sm">
                            <span className="text-gray-500">Check-out:</span>
                            <p className="font-medium text-gray-900">
                              {format(dateRange.to, 'dd/MM/yyyy', { locale: locale === 'vi' ? vi : undefined })}
                            </p>
                          </div>
                        )}
                      </div>

                      {nights > 0 && (
                        <div className="pt-2 border-t flex items-center gap-3">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Moon className="h-3 w-3" />
                            {nights} {locale === 'vi' ? 'đêm' : nights === 1 ? 'night' : 'nights'}
                          </Badge>
                          {totalPrice > 0 && (
                            <p className="text-sm font-semibold text-green-600">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">
                      {locale === 'vi' ? 'Chưa chọn ngày' : 'No dates selected'}
                    </p>
                  )}

                  {!pitchId && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-amber-600">
                        {locale === 'vi'
                          ? 'Chọn slot trước để xem availability'
                          : 'Select a slot first'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Guest Count - below booking info */}
                <div className="space-y-3">
                  {/* Max guests info */}
                  {maxGuests && (
                    <p className="text-xs text-gray-500">
                      {locale === 'vi' ? `Tối đa ${maxGuests} khách` : `Maximum ${maxGuests} guests`}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adults-input" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {locale === 'vi' ? 'Người lớn' : 'Adults'}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="adults-input"
                        type="number"
                        min="0"
                        max={maxGuests || 20}
                        value={adults}
                        onChange={(e) => handleAdultsChange(e.target.value)}
                        placeholder="0"
                        className={isOverCapacity ? 'border-red-500' : ''}
                      />
                      <p className="text-xs text-gray-500">
                        {locale === 'vi' ? 'Từ 11 tuổi trở lên' : 'Age 11+'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="children-input" className="flex items-center gap-2">
                        <Baby className="h-4 w-4" />
                        {locale === 'vi' ? 'Trẻ em' : 'Children'}
                      </Label>
                      <Input
                        id="children-input"
                        type="number"
                        min="0"
                        max={maxGuests || 20}
                        value={childrenCount}
                        onChange={(e) => handleChildrenChange(e.target.value)}
                        placeholder="0"
                        className={isOverCapacity ? 'border-red-500' : ''}
                      />
                      <p className="text-xs text-gray-500">
                        {locale === 'vi' ? 'Dưới 11 tuổi' : 'Under 11'}
                      </p>
                    </div>
                  </div>

                  {/* Error when over capacity */}
                  {isOverCapacity && (
                    <p className="text-xs text-red-500">
                      {locale === 'vi'
                        ? `Vượt quá số khách tối đa (${totalGuests}/${maxGuests})`
                        : `Exceeds maximum capacity (${totalGuests}/${maxGuests})`}
                    </p>
                  )}
                </div>
              </div>

              {/* Column 2: Calendar */}
              <div className="space-y-3 min-w-[380px]">
                {/* Month navigation */}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-8 w-8">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h3 className="text-base font-semibold">
                    {currentMonth.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8">
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

                        // Normal clickability
                        const isNormallyClickable = day.isAvailable && !isPast

                        // Special case: Enable check-in dates for same-day turnover when selecting check-out
                        // Find the next check-in date after selected check-in
                        const nextCheckInDate = dateRange?.from && !dateRange?.to
                          ? findNextCheckInDate(dateRange.from)
                          : null

                        // Only enable if this is THE NEXT check-in date
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
                        // Special styling for same-day turnover dates
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

                            {/* Price if not in range */}
                            {isClickable && (!hasRange || !isSelected) && (
                              <div className="flex flex-col items-center justify-center h-full">
                                <div className="text-xs font-semibold mt-3">
                                  {Math.round(getDayPrice(day) / 1000)}k
                                </div>
                                <div className="flex items-center justify-center">
                                  <Moon className="h-2 w-2" />
                                  <span className="text-[8px] ml-0.5">1</span>
                                </div>
                              </div>
                            )}

                            {/* Total price on start date */}
                            {hasRange && isStartDate && totalPrice > 0 && (
                              <div className="absolute bottom-1 left-1 z-10">
                                <div className="flex items-center gap-1 bg-blue-700 px-1.5 py-0.5 rounded">
                                  <span className="text-xs font-bold">{Math.round(totalPrice / 1000)}k</span>
                                  <span className="text-xs font-semibold">/</span>
                                  <span className="text-xs font-semibold">{nights}</span>
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

      {/* Summary */}
      {dateRange?.from && dateRange?.to && nights > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-green-900">
                {locale === 'vi' ? 'Tóm tắt' : 'Summary'}
              </span>
              <span className="text-green-700">
                {nights} {locale === 'vi' ? 'đêm' : nights === 1 ? 'night' : 'nights'} • {' '}
                {adults + childrenCount} {locale === 'vi' ? 'khách' : adults + childrenCount === 1 ? 'guest' : 'guests'}
                {adults > 0 && ` (${adults} ${locale === 'vi' ? 'người lớn' : adults === 1 ? 'adult' : 'adults'}${childrenCount > 0 ? `, ${childrenCount} ${locale === 'vi' ? 'trẻ em' : childrenCount === 1 ? 'child' : 'children'}` : ''})`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
