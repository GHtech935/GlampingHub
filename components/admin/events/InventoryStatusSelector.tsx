'use client';

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslations } from "next-intl";

interface InventoryStatusSelectorProps {
  value: 'available' | 'unavailable';
  onChange: (value: 'available' | 'unavailable') => void;
}

export default function InventoryStatusSelector({ value, onChange }: InventoryStatusSelectorProps) {
  const t = useTranslations('events.new');

  return (
    <div className="space-y-2">
      <Label>{t('inventoryStatus')}</Label>
      <RadioGroup value={value} onValueChange={(val) => onChange(val as 'available' | 'unavailable')}>
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="available" id="available" />
            <Label htmlFor="available" className="cursor-pointer">{t('available')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unavailable" id="unavailable" />
            <Label htmlFor="unavailable" className="cursor-pointer">{t('unavailable')}</Label>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
