'use client';

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ApplicableTimesSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onAddTimeslots?: () => void;
}

export default function ApplicableTimesSelector({
  value,
  onChange,
  onAddTimeslots
}: ApplicableTimesSelectorProps) {
  const t = useTranslations('events.new');

  return (
    <div className="space-y-2">
      <Label>{t('applicableTimes')}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allTimes')}</SelectItem>
        </SelectContent>
      </Select>
      {onAddTimeslots && (
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-blue-600"
          onClick={onAddTimeslots}
        >
          {t('addTimeslots')}
        </Button>
      )}
    </div>
  );
}
