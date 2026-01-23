'use client';

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslations } from "next-intl";

interface EventTypeSelectorProps {
  value: 'seasonal' | 'special' | 'closure';
  onChange: (value: 'seasonal' | 'special' | 'closure') => void;
  hideClosureOption?: boolean; // Option to hide 'closure' type
}

export default function EventTypeSelector({ value, onChange, hideClosureOption = false }: EventTypeSelectorProps) {
  const t = useTranslations('events.new');

  return (
    <div className="space-y-2">
      <Label>{t('type')}</Label>
      <RadioGroup value={value} onValueChange={(val) => onChange(val as 'seasonal' | 'special' | 'closure')}>
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="seasonal" id="seasonal" />
            <Label htmlFor="seasonal" className="cursor-pointer">{t('seasonal')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="special" id="special" />
            <Label htmlFor="special" className="cursor-pointer">{t('special')}</Label>
          </div>
          {!hideClosureOption && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="closure" id="closure" />
              <Label htmlFor="closure" className="cursor-pointer">{t('closure')}</Label>
            </div>
          )}
        </div>
      </RadioGroup>
      <p className="text-sm text-gray-500">
        {t('typeHint')}
      </p>
    </div>
  );
}
