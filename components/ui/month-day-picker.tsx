'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { Calendar } from 'lucide-react';

interface MonthDayPickerProps {
  value?: string; // Format: "MM-DD"
  onChange: (value: string) => void;
  error?: boolean;
  required?: boolean;
  label?: string;
  helperText?: string;
  className?: string;
}

const MONTHS = [
  { value: 1, en: 'January', vi: 'Tháng 1', short: 'Jan' },
  { value: 2, en: 'February', vi: 'Tháng 2', short: 'Feb' },
  { value: 3, en: 'March', vi: 'Tháng 3', short: 'Mar' },
  { value: 4, en: 'April', vi: 'Tháng 4', short: 'Apr' },
  { value: 5, en: 'May', vi: 'Tháng 5', short: 'May' },
  { value: 6, en: 'June', vi: 'Tháng 6', short: 'Jun' },
  { value: 7, en: 'July', vi: 'Tháng 7', short: 'Jul' },
  { value: 8, en: 'August', vi: 'Tháng 8', short: 'Aug' },
  { value: 9, en: 'September', vi: 'Tháng 9', short: 'Sep' },
  { value: 10, en: 'October', vi: 'Tháng 10', short: 'Oct' },
  { value: 11, en: 'November', vi: 'Tháng 11', short: 'Nov' },
  { value: 12, en: 'December', vi: 'Tháng 12', short: 'Dec' },
];

function getDaysInMonth(month: number): number {
  const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return maxDays[month - 1];
}

export function MonthDayPicker({
  value = '',
  onChange,
  error = false,
  required = false,
  label,
  helperText,
  className = '',
}: MonthDayPickerProps) {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value && value.includes('-')) {
      const [monthStr, dayStr] = value.split('-');
      setSelectedMonth(parseInt(monthStr));
      setSelectedDay(parseInt(dayStr));
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    // If current selected day is invalid for new month, clear it
    if (selectedDay && selectedDay > getDaysInMonth(month)) {
      setSelectedDay(null);
    }
  };

  const handleDaySelect = (day: number) => {
    if (!selectedMonth) return;

    setSelectedDay(day);
    const monthStr = String(selectedMonth).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${monthStr}-${dayStr}`);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!selectedMonth || !selectedDay) {
      return locale === 'vi' ? 'Chọn ngày sinh' : 'Select birthday';
    }

    const monthName = MONTHS.find(m => m.value === selectedMonth);
    if (locale === 'vi') {
      return `${selectedDay} ${monthName?.vi}`;
    }
    return `${monthName?.short} ${selectedDay}`;
  };

  const renderCalendar = () => {
    if (!selectedMonth) {
      // Show month selection grid
      return (
        <div className="p-3">
          <h3 className="text-sm font-semibold mb-3 text-center">
            {locale === 'vi' ? 'Chọn tháng' : 'Select Month'}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month) => (
              <button
                key={month.value}
                type="button"
                onClick={() => handleMonthSelect(month.value)}
                className="px-3 py-2 text-sm rounded hover:bg-blue-100 border border-gray-200 hover:border-blue-500 transition-colors"
              >
                {locale === 'vi' ? `T${month.value}` : month.short}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Show day selection grid for selected month
    const daysInMonth = getDaysInMonth(selectedMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthName = MONTHS.find(m => m.value === selectedMonth);

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← {locale === 'vi' ? 'Đổi tháng' : 'Change month'}
          </button>
          <h3 className="text-sm font-semibold">
            {locale === 'vi' ? monthName?.vi : monthName?.en}
          </h3>
          <div className="w-20"></div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => handleDaySelect(day)}
              className={`
                w-8 h-8 text-sm rounded flex items-center justify-center
                transition-colors
                ${selectedDay === day
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'hover:bg-blue-100 border border-gray-200 hover:border-blue-500'
                }
              `}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={className} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${!selectedMonth || !selectedDay ? 'text-gray-500' : 'text-gray-900'}`}
        >
          <span>{getDisplayValue()}</span>
          <Calendar className="h-5 w-5 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[280px]">
            {renderCalendar()}
          </div>
        )}
      </div>

      {helperText && (
        <p className={`text-sm mt-1 ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}
