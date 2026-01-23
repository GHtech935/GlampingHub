'use client';

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface RecurrenceSelectorProps {
  value: 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always';
  onChange: (value: 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always') => void;
}

export default function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const t = useTranslations('events.new');

  return (
    <div className="space-y-2">
      <Label>{t('recurrence')}</Label>
      <Select value={value} onValueChange={(val) => onChange(val as 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always')}>
        <SelectTrigger>
          <SelectValue placeholder={t('selectRecurrence')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one_time">{t('oneTimeEvent')}</SelectItem>
          <SelectItem value="weekly">{t('weeklyByDayOfWeek')}</SelectItem>
          <SelectItem value="always">{t('alwaysDontExpire')}</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-gray-500">
        {t('recurrenceHint')}
      </p>
    </div>
  );
}
