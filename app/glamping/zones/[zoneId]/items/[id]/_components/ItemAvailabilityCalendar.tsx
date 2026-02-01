'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useGlampingCart } from '@/components/providers/GlampingCartProvider';

/**
 * Format date to YYYY-MM-DD string in LOCAL timezone (not UTC)
 */
function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface CalendarDay {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  price: number;
  hasPricing?: boolean;
  minStay: number;
  status: string;
  isAvailable: boolean;
  unavailableReason?: string | null;
  notes: string | null;
}

interface ItemAvailabilityCalendarProps {
  itemId: string;
  onDateSelect?: (startDate: string, endDate: string) => void;
}

export function ItemAvailabilityCalendar({ itemId, onDateSelect }: ItemAvailabilityCalendarProps) {
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const { toast } = useToast();
  const prevItemIdRef = useRef<string>(itemId);
  const hasPreselectedFromCartRef = useRef<boolean>(false);
  const { cart, isInitialized: cartInitialized } = useGlampingCart();

  // Reset calendar when itemId changes
  useEffect(() => {
    if (prevItemIdRef.current !== itemId) {
      setCalendar([]);
      hasPreselectedFromCartRef.current = false;
      prevItemIdRef.current = itemId;
    }
  }, [itemId]);

  useEffect(() => {
    fetchAvailability();
  }, [itemId, currentMonth]);

  // Pre-select dates from cart if available
  useEffect(() => {
    // Don't run if already preselected, still loading, cart not initialized, or dates already selected by user
    if (
      hasPreselectedFromCartRef.current ||
      loading ||
      !cartInitialized ||
      selectedStart ||
      selectedEnd
    ) {
      return;
    }

    // Check if cart has items (not the current item)
    if (!cart || cart.items.length === 0) {
      hasPreselectedFromCartRef.current = true;
      return;
    }

    // Get dates from the first cart item
    const firstCartItem = cart.items[0];

    // Skip if this is the same item that's already in cart
    if (firstCartItem.itemId === itemId) {
      hasPreselectedFromCartRef.current = true;
      return;
    }

    const cartCheckIn = firstCartItem.checkIn;
    const cartCheckOut = firstCartItem.checkOut;

    if (!cartCheckIn || !cartCheckOut) {
      hasPreselectedFromCartRef.current = true;
      return;
    }

    // Need calendar data to check availability
    if (calendar.length === 0) {
      return;
    }

    // Check if we have calendar data for the cart dates
    const hasCalendarDataForDates = (startDate: string, endDate: string): boolean => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDateToYMD(d);
        const dayData = calendar.find(day => day.date === dateStr);
        if (!dayData) return false;
      }
      return true;
    };

    // Check if the dates are available for this item
    const checkDatesAvailable = (startDate: string, endDate: string): boolean => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDateToYMD(d);

        // Check if date is in the past
        const checkDate = new Date(dateStr);
        checkDate.setHours(0, 0, 0, 0);
        if (checkDate < today) return false;

        // Check if date is available in calendar data
        const dayData = calendar.find(day => day.date === dateStr);
        if (!dayData || !dayData.isAvailable) return false;
      }
      return true;
    };

    // If we don't have calendar data for cart dates, navigate to that month and wait
    if (!hasCalendarDataForDates(cartCheckIn, cartCheckOut)) {
      const checkInDate = new Date(cartCheckIn);
      if (
        checkInDate.getMonth() !== currentMonth.getMonth() ||
        checkInDate.getFullYear() !== currentMonth.getFullYear()
      ) {
        setCurrentMonth(new Date(checkInDate.getFullYear(), checkInDate.getMonth(), 1));
      }
      // Don't mark as preselected yet - wait for data to load
      return;
    }

    // Now we have the calendar data - check availability and pre-select if available
    if (checkDatesAvailable(cartCheckIn, cartCheckOut)) {
      setSelectedStart(cartCheckIn);
      setSelectedEnd(cartCheckOut);
      onDateSelect?.(cartCheckIn, cartCheckOut);

      // Navigate to the check-in month if it's different
      const checkInDate = new Date(cartCheckIn);
      if (
        checkInDate.getMonth() !== currentMonth.getMonth() ||
        checkInDate.getFullYear() !== currentMonth.getFullYear()
      ) {
        setCurrentMonth(new Date(checkInDate.getFullYear(), checkInDate.getMonth(), 1));
      }
    }

    // Mark as done (whether we preselected or not - dates not available)
    hasPreselectedFromCartRef.current = true;
  }, [calendar, loading, cartInitialized, cart, itemId, selectedStart, selectedEnd, onDateSelect, currentMonth]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const startDate = formatDateToYMD(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));

      const response = await fetch(
        `/api/glamping/items/${itemId}/availability?startDate=${startDate}&months=2`
      );

      if (!response.ok) throw new Error('Failed to fetch availability');

      const data = await response.json();
      const newCalendar = data.calendar || [];

      // Merge with old data to support cross-month date selection
      setCalendar(prev => {
        const merged = [...prev, ...newCalendar];
        const uniqueMap = new Map<string, CalendarDay>();
        merged.forEach(day => uniqueMap.set(day.date, day));
        return Array.from(uniqueMap.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        );
      });
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isPastDate = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const hasUnavailableDatesInRange = (startDate: string, endDate: string): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateToYMD(d);
      const dayData = calendar.find(day => day.date === dateStr);

      if (isPastDate(dateStr)) return true;
      if (!dayData || !dayData.isAvailable) return true;
    }

    return false;
  };

  const getNextDay = (dateStr: string): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return formatDateToYMD(date);
  };

  const handleDateClick = (date: string, day: CalendarDay) => {
    if (!day.isAvailable || isPastDate(date)) return;

    if (!selectedStart || (selectedStart && selectedEnd)) {
      // Start new selection
      const nextDay = getNextDay(date);

      if (!hasUnavailableDatesInRange(date, nextDay)) {
        const dayAfterNext = getNextDay(nextDay);
        const isSandwiched = hasUnavailableDatesInRange(date, dayAfterNext);

        if (isSandwiched && day.minStay === 1) {
          // Auto-select single night
          setSelectedStart(date);
          setSelectedEnd(nextDay);
          onDateSelect?.(date, nextDay);
          return;
        }
      }

      setSelectedStart(date);
      setSelectedEnd(null);
    } else if (selectedStart && !selectedEnd) {
      // Complete selection
      if (date > selectedStart) {
        const startDay = calendar.find(d => d.date === selectedStart);
        const minStay = startDay?.minStay || 1;
        const selectedNights = calculateNightsBetween(selectedStart, date);

        if (selectedNights < minStay) {
          toast({
            title: "Không đủ số đêm tối thiểu",
            description: `Phải đặt tối thiểu ${minStay} đêm liên tục. Bạn đang chọn ${selectedNights} đêm.`,
            variant: "destructive",
          });
          setSelectedStart(date);
          setSelectedEnd(null);
          return;
        }

        if (hasUnavailableDatesInRange(selectedStart, date)) {
          toast({
            title: "Không thể chọn khoảng ngày này",
            description: "Có ngày không khả dụng trong khoảng ngày bạn chọn. Vui lòng chọn lại.",
            variant: "destructive",
          });
          setSelectedStart(date);
          setSelectedEnd(null);
          return;
        }

        setSelectedEnd(date);
        onDateSelect?.(selectedStart, date);
      } else {
        setSelectedStart(date);
        setSelectedEnd(null);
      }
    }
  };

  const isDateInRange = (date: string) => {
    if (!selectedStart) return false;
    if (!selectedEnd) return date === selectedStart;
    return date >= selectedStart && date <= selectedEnd;
  };

  const calculateNights = () => {
    if (!selectedStart || !selectedEnd) return 0;
    const start = new Date(selectedStart);
    const end = new Date(selectedEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateNightsBetween = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return nights;
  };

  const isRangeStart = (date: string) => {
    return selectedStart && selectedEnd && date === selectedStart;
  };

  const isRangeEnd = (date: string) => {
    return selectedStart && selectedEnd && date === selectedEnd;
  };

  const isRangeMiddle = (date: string) => {
    return selectedStart && selectedEnd && date > selectedStart && date < selectedEnd;
  };

  const calculateTotalPrice = () => {
    if (!selectedStart || !selectedEnd) return 0;
    const daysInRange = calendar.filter(day =>
      day.date >= selectedStart && day.date < selectedEnd
    );
    if (daysInRange.length === 0) return 0;
    const totalPrice = daysInRange.reduce((sum, day) => sum + day.price, 0);
    return totalPrice;
  };

  const renderCalendar = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDayRaw = monthStart.getDay();
    const startDay = startDayRaw === 0 ? 6 : startDayRaw - 1;

    const daysInMonth: (CalendarDay | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      daysInMonth.push(null);
    }

    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateStr = formatDateToYMD(date);
      const dayData = calendar.find((d) => d.date === dateStr);

      if (dayData) {
        daysInMonth.push(dayData);
      } else {
        daysInMonth.push({
          date: dateStr,
          dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          price: 0,
          hasPricing: false,
          minStay: 1,
          status: 'no_pricing',
          isAvailable: false,
          unavailableReason: 'no_pricing',
          notes: null,
        });
      }
    }

    return daysInMonth;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đang tải lịch khả dụng...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const days = renderCalendar();
  const hasRange = selectedStart && selectedEnd;
  const totalNights = calculateNights();
  const totalPrice = calculateTotalPrice();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Lịch khả dụng</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-xl font-semibold">
            {currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </h3>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="mb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-[0.05rem] mb-2">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-[0.05rem]">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const isSelected = isDateInRange(day.date);
              const isStartDate = isRangeStart(day.date);
              const isEndDate = isRangeEnd(day.date);
              const isMiddle = isRangeMiddle(day.date);
              const isPast = isPastDate(day.date);
              const isClickable = day.isAvailable && !isPast;

              let roundedClass = 'rounded-md';
              if (hasRange && isSelected) {
                if (isStartDate) roundedClass = 'rounded-l-lg';
                else if (isEndDate) roundedClass = 'rounded-r-lg';
                else roundedClass = 'rounded-none';
              }

              let borderClass = '';
              if (!hasRange) {
                borderClass = isClickable ? 'border-[0.5px] border-primary/30' : 'border-[0.5px] border-gray-300/50';
              } else if (hasRange && !isSelected) {
                borderClass = isClickable ? 'border-[0.5px] border-primary/30' : 'border-[0.5px] border-gray-300/50';
              }

              let bgColorClass = '';
              if (isClickable) {
                const isInSelection = day.date === selectedStart || (hasRange && isSelected);
                if (isInSelection) {
                  bgColorClass = 'bg-blue-700 hover:bg-blue-600';
                } else {
                  bgColorClass = 'bg-primary hover:bg-primary/90';
                }
              } else {
                bgColorClass = 'bg-gray-100';
              }

              let marginClass = '';
              if (hasRange && isSelected) {
                if (isStartDate) marginClass = '-mr-[0.05rem]';
                else if (isEndDate) marginClass = '-ml-[0.05rem]';
                else if (isMiddle) marginClass = '-mx-[0.05rem]';
              }

              return (
                <button
                  key={day.date}
                  onClick={() => handleDateClick(day.date, day)}
                  disabled={!isClickable}
                  className={`
                    aspect-square p-1 ${roundedClass} ${borderClass} ${marginClass} text-center transition-all relative
                    ${bgColorClass}
                    ${isClickable ? 'text-white cursor-pointer' : 'text-gray-400 cursor-not-allowed'}
                  `}
                >
                  <div className="absolute top-1 right-1 text-xs font-semibold">
                    {new Date(day.date).getDate()}
                  </div>

                  {isClickable && (!hasRange || !isSelected) && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="flex items-center justify-center mt-3">
                        <Moon className="h-2 w-2" />
                        <span className="text-[8px] ml-0.5">1</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-primary rounded-none" />
            <span>Có thể đến hoặc đi vào ngày này</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
