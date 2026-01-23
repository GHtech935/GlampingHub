'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface DynamicPricingTabProps {
  value: number;
  mode: 'percent' | 'fixed';
  onChange: (data: { value: number; mode: 'percent' | 'fixed' }) => void;
}

export default function DynamicPricingTab({ value, mode, onChange }: DynamicPricingTabProps) {
  const t = useTranslations('events.new');

  const handleValueChange = (newValue: string) => {
    const numValue = parseFloat(newValue) || 0;
    onChange({ value: numValue, mode });
  };

  const handleModeChange = (newMode: 'percent' | 'fixed') => {
    onChange({ value, mode: newMode });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium whitespace-nowrap">
          {t('dynamicPrice')}
        </Label>
        <Input
          type="number"
          step="0.0001"
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          className="w-32"
          placeholder="0"
        />
        <div className="inline-flex rounded-md shadow-sm">
          <Button
            type="button"
            variant={mode === 'percent' ? 'default' : 'outline'}
            onClick={() => handleModeChange('percent')}
            className="rounded-r-none"
          >
            {t('percent')}
          </Button>
          <Button
            type="button"
            variant={mode === 'fixed' ? 'default' : 'outline'}
            onClick={() => handleModeChange('fixed')}
            className="rounded-l-none"
          >
            {t('fixedAmount')}
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        {t('dynamicHint')}
      </p>
    </div>
  );
}
