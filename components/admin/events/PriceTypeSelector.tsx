'use client';

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import DynamicPricingTab from "./DynamicPricingTab";
import YieldPricingTab from "./YieldPricingTab";

interface YieldThreshold {
  stock: number;
  rate_adjustment: number;
}

interface DynamicPricing {
  value: number;
  mode: 'percent' | 'fixed';
}

interface PriceTypeSelectorProps {
  value: 'base_price' | 'new_price' | 'dynamic' | 'yield';
  onChange: (type: 'base_price' | 'new_price' | 'dynamic' | 'yield') => void;
  dynamicPricing?: DynamicPricing;
  yieldThresholds?: YieldThreshold[];
  onDynamicPricingChange?: (data: DynamicPricing) => void;
  onYieldThresholdsChange?: (thresholds: YieldThreshold[]) => void;
}

export default function PriceTypeSelector({
  value,
  onChange,
  dynamicPricing = { value: 0, mode: 'percent' },
  yieldThresholds = [{ stock: 0, rate_adjustment: 0 }],
  onDynamicPricingChange,
  onYieldThresholdsChange
}: PriceTypeSelectorProps) {
  const t = useTranslations('events.new');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{t('price')}</Label>
        <div className="inline-flex rounded-md shadow-sm">
          <Button
            type="button"
            variant={value === 'base_price' ? 'default' : 'outline'}
            onClick={() => onChange('base_price')}
            className="rounded-r-none border-r-0"
            size="sm"
          >
            {t('basePrice')}
          </Button>
          <Button
            type="button"
            variant={value === 'new_price' ? 'default' : 'outline'}
            onClick={() => onChange('new_price')}
            className="rounded-none border-r-0"
            size="sm"
          >
            {t('newPricePoint')}
          </Button>
          <Button
            type="button"
            variant={value === 'dynamic' ? 'default' : 'outline'}
            onClick={() => onChange('dynamic')}
            className="rounded-none border-r-0"
            size="sm"
          >
            {t('dynamic')}
          </Button>
          <Button
            type="button"
            variant={value === 'yield' ? 'default' : 'outline'}
            onClick={() => onChange('yield')}
            className="rounded-l-none"
            size="sm"
          >
            {t('yield')}
          </Button>
        </div>
      </div>

      {/* Conditional content based on selected tab */}
      {value === 'base_price' && (
        <div className="text-sm text-gray-500 p-4 border rounded-lg bg-gray-50">
          {t('basePriceDescription')}
        </div>
      )}

      {value === 'new_price' && (
        <div className="text-sm text-gray-500 p-4 border rounded-lg bg-gray-50">
          {t('newPriceDescription')}
        </div>
      )}

      {value === 'dynamic' && onDynamicPricingChange && (
        <DynamicPricingTab
          value={dynamicPricing.value}
          mode={dynamicPricing.mode}
          onChange={onDynamicPricingChange}
        />
      )}

      {value === 'yield' && onYieldThresholdsChange && (
        <YieldPricingTab
          thresholds={yieldThresholds}
          onChange={onYieldThresholdsChange}
        />
      )}
    </div>
  );
}
