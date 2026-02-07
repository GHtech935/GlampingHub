'use client';

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { DAY_NAME_TO_NUMBER } from "@/lib/days-of-week";

interface ApplicableDaysSelectorProps {
  daysOfWeek: number[] | null;
  onDaysChange: (days: number[]) => void;
}

export default function ApplicableDaysSelector({
  daysOfWeek,
  onDaysChange
}: ApplicableDaysSelectorProps) {
  // Ensure daysOfWeek is always an array (fallback to empty array if null)
  const days = daysOfWeek ?? [];
  const t = useTranslations('events.new');

  const weekDays = [
    { value: DAY_NAME_TO_NUMBER.monday, label: 'Th 2', fullLabel: t('monday') },
    { value: DAY_NAME_TO_NUMBER.tuesday, label: 'Th 3', fullLabel: t('tuesday') },
    { value: DAY_NAME_TO_NUMBER.wednesday, label: 'Th 4', fullLabel: t('wednesday') },
    { value: DAY_NAME_TO_NUMBER.thursday, label: 'Th 5', fullLabel: t('thursday') },
    { value: DAY_NAME_TO_NUMBER.friday, label: 'Th 6', fullLabel: t('friday') },
    { value: DAY_NAME_TO_NUMBER.saturday, label: 'Th 7', fullLabel: t('saturday') },
    { value: DAY_NAME_TO_NUMBER.sunday, label: 'CN', fullLabel: t('sunday') }
  ];

  const toggleDay = useCallback((day: number) => {
    if (days.includes(day)) {
      onDaysChange(days.filter(d => d !== day));
    } else {
      onDaysChange([...days, day].sort());
    }
  }, [days, onDaysChange]);

  return (
    <div className="space-y-2">
      <Label>{t('applicableDays')}</Label>

      {/* Simple horizontal checkbox layout */}
      <div className="flex items-center gap-6">
        {weekDays.map(day => (
          <div key={day.value} className="flex items-center gap-2">
            <Checkbox
              id={`day-${day.value}`}
              checked={days.includes(day.value)}
              onCheckedChange={() => toggleDay(day.value)}
            />
            <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
              {day.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
