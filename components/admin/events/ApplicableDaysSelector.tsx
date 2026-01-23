'use client';

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

interface ApplicableDaysSelectorProps {
  daysOfWeek: number[];
  onDaysChange: (days: number[]) => void;
}

export default function ApplicableDaysSelector({
  daysOfWeek,
  onDaysChange
}: ApplicableDaysSelectorProps) {
  const t = useTranslations('events.new');

  const weekDays = [
    { value: 1, label: 'Th 2', fullLabel: t('monday') },
    { value: 2, label: 'Th 3', fullLabel: t('tuesday') },
    { value: 3, label: 'Th 4', fullLabel: t('wednesday') },
    { value: 4, label: 'Th 5', fullLabel: t('thursday') },
    { value: 5, label: 'Th 6', fullLabel: t('friday') },
    { value: 6, label: 'Th 7', fullLabel: t('saturday') },
    { value: 0, label: 'CN', fullLabel: t('sunday') }
  ];

  const toggleDay = useCallback((day: number) => {
    if (daysOfWeek.includes(day)) {
      onDaysChange(daysOfWeek.filter(d => d !== day));
    } else {
      onDaysChange([...daysOfWeek, day].sort());
    }
  }, [daysOfWeek, onDaysChange]);

  return (
    <div className="space-y-2">
      <Label>{t('applicableDays')}</Label>

      {/* Simple horizontal checkbox layout */}
      <div className="flex items-center gap-6">
        {weekDays.map(day => (
          <div key={day.value} className="flex items-center gap-2">
            <Checkbox
              id={`day-${day.value}`}
              checked={daysOfWeek.includes(day.value)}
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
