'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar as CalendarIcon, Moon, AlertCircle } from 'lucide-react'
import { format, differenceInDays, addMonths, startOfMonth } from 'date-fns'
import type { DateRange } from 'react-day-picker'

// Format date to YYYY-MM-DD
function formatDateToYMD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface AvailabilityDay {
  date: string
  available: boolean
  available_quantity?: number
  booked_quantity?: number
  unlimited?: boolean
}

interface GlampingDateRangePickerWithAvailabilityProps {
  itemId?: string
  dateRange?: DateRange
  onDateRangeChange: (range: DateRange | undefined) => void
  locale?: string
  disabled?: boolean
}

export function GlampingDateRangePickerWithAvailability({
  itemId,
  dateRange,
  onDateRangeChange,
  locale = 'vi',
  disabled = false
}: GlampingDateRangePickerWithAvailabilityProps) {
  const [availability, setAvailability] = useState<AvailabilityDay[]>([])
  const [loading, setLoading] = useState(false)
  const [nights, setNights] = useState(0)
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean>(true)

  // Fetch availability when itemId changes or when dates are selected
  useEffect(() => {
    if (!itemId) {
      setAvailability([])
      return
    }

    const fetchAvailability = async () => {
      try {
        setLoading(true)

        // Fetch 3 months of availability data
        const startDate = formatDateToYMD(startOfMonth(new Date()))
        const endDate = formatDateToYMD(addMonths(startOfMonth(new Date()), 3))

        const response = await fetch(
          `/api/glamping/availability/calendar?itemId=${itemId}&startDate=${startDate}&endDate=${endDate}`
        )

        if (response.ok) {
          const data = await response.json()
          setAvailability(data.availability || [])
        } else {
          console.error('Failed to fetch availability')
          setAvailability([])
        }
      } catch (error) {
        console.error('Error fetching availability:', error)
        setAvailability([])
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [itemId])

  // Check availability when date range changes
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to || availability.length === 0) {
      setAvailabilityMessage(null)
      setIsAvailable(true)
      return
    }

    // Check if all dates in range are available
    const startDate = formatDateToYMD(dateRange.from)
    const endDate = formatDateToYMD(dateRange.to)

    let allAvailable = true
    let unavailableDate: string | null = null

    // Check each day in the range (excluding checkout date)
    const checkDate = new Date(dateRange.from)
    while (checkDate < dateRange.to) {
      const dateStr = formatDateToYMD(checkDate)
      const dayData = availability.find(d => d.date === dateStr)

      if (!dayData || !dayData.available) {
        allAvailable = false
        unavailableDate = dateStr
        break
      }

      checkDate.setDate(checkDate.getDate() + 1)
    }

    setIsAvailable(allAvailable)

    if (!allAvailable && unavailableDate) {
      setAvailabilityMessage(
        locale === 'vi'
          ? `Ngày ${format(new Date(unavailableDate), 'dd/MM/yyyy')} không có sẵn. Vui lòng chọn ngày khác.`
          : `Date ${format(new Date(unavailableDate), 'MM/dd/yyyy')} is not available. Please select different dates.`
      )
    } else {
      setAvailabilityMessage(null)
    }
  }, [dateRange, availability, locale])

  // Calculate nights when date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const nightsCount = differenceInDays(dateRange.to, dateRange.from)
      setNights(nightsCount > 0 ? nightsCount : 0)
    } else {
      setNights(0)
    }
  }, [dateRange])

  const handleCheckInChange = (value: string) => {
    if (!value) {
      onDateRangeChange(undefined)
      return
    }

    const newFrom = new Date(value + 'T00:00:00')
    const newRange: DateRange = {
      from: newFrom,
      to: dateRange?.to
    }
    onDateRangeChange(newRange)
  }

  const handleCheckOutChange = (value: string) => {
    if (!value) {
      onDateRangeChange(dateRange?.from ? { from: dateRange.from } : undefined)
      return
    }

    const newTo = new Date(value + 'T00:00:00')
    const newRange: DateRange = {
      from: dateRange?.from,
      to: newTo
    }
    onDateRangeChange(newRange)
  }

  const today = formatDateToYMD(new Date())
  const minCheckOut = dateRange?.from ? formatDateToYMD(new Date(dateRange.from.getTime() + 86400000)) : today

  return (
    <div className="space-y-4">
      {/* Date Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="check-in" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {locale === 'vi' ? 'Ngày nhận phòng' : 'Check-in Date'}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="check-in"
            type="date"
            value={dateRange?.from ? formatDateToYMD(dateRange.from) : ''}
            onChange={(e) => handleCheckInChange(e.target.value)}
            min={today}
            disabled={disabled || loading || !itemId}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="check-out" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {locale === 'vi' ? 'Ngày trả phòng' : 'Check-out Date'}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="check-out"
            type="date"
            value={dateRange?.to ? formatDateToYMD(dateRange.to) : ''}
            onChange={(e) => handleCheckOutChange(e.target.value)}
            min={minCheckOut}
            disabled={disabled || loading || !itemId || !dateRange?.from}
          />
        </div>
      </div>

      {/* Nights Display */}
      {nights > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Moon className="h-4 w-4 text-gray-600" />
          <span className="text-gray-700">
            {nights} {locale === 'vi' ? 'đêm' : nights === 1 ? 'night' : 'nights'}
          </span>
        </div>
      )}

      {/* Availability Message */}
      {availabilityMessage && (
        <Alert variant={isAvailable ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{availabilityMessage}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <p className="text-sm text-gray-600">
          {locale === 'vi' ? 'Đang kiểm tra tình trạng...' : 'Checking availability...'}
        </p>
      )}
    </div>
  )
}
