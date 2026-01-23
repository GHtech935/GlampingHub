'use client';

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

interface DateRangeFieldsProps {
  startDate: string;
  endDate: string | null;
  removeEndDate: boolean;
  onChange: (field: 'start_date' | 'end_date' | 'remove_end_date', value: any) => void;
}

export default function DateRangeFields({
  startDate,
  endDate,
  removeEndDate,
  onChange
}: DateRangeFieldsProps) {
  const t = useTranslations('events.new');

  return (
    <div className="space-y-4">
      {/* Start Date */}
      <div className="space-y-2">
        <Label>{t('startDate')}</Label>
        <div className="relative">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onChange('start_date', e.target.value)}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* End Date */}
      <div className="space-y-2">
        <Label>{t('endDate')}</Label>
        <div className="relative">
          <Input
            type="date"
            value={endDate || ''}
            onChange={(e) => onChange('end_date', e.target.value)}
            disabled={removeEndDate}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="remove-end-date"
            checked={removeEndDate}
            onCheckedChange={(checked) => {
              onChange('remove_end_date', checked);
              if (checked) {
                onChange('end_date', null);
              }
            }}
          />
          <Label htmlFor="remove-end-date" className="text-sm cursor-pointer">
            {t('removeEndDate')}
          </Label>
        </div>
      </div>
    </div>
  );
}
