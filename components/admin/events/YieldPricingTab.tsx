'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

interface YieldThreshold {
  stock: number;
  rate_adjustment: number;
}

interface YieldPricingTabProps {
  thresholds: YieldThreshold[];
  onChange: (thresholds: YieldThreshold[]) => void;
}

export default function YieldPricingTab({ thresholds, onChange }: YieldPricingTabProps) {
  const t = useTranslations('events.new');

  const updateThreshold = (index: number, field: 'stock' | 'rate_adjustment', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newThresholds = [...thresholds];
    newThresholds[index] = {
      ...newThresholds[index],
      [field]: numValue
    };
    onChange(newThresholds);
  };

  const addThreshold = () => {
    onChange([...thresholds, { stock: 0, rate_adjustment: 0 }]);
  };

  const removeThreshold = (index: number) => {
    if (thresholds.length > 1) {
      onChange(thresholds.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">{t('thresholdPrices')}</h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                {t('stock')}
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                {t('rateAdjustment')}
              </th>
              <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 w-20">
                {t('remove')}
              </th>
            </tr>
          </thead>
          <tbody>
            {thresholds.map((threshold, index) => (
              <tr key={index} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={threshold.stock}
                      onChange={(e) => updateThreshold(index, 'stock', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-500">{t('stock')}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={threshold.rate_adjustment}
                      onChange={(e) => updateThreshold(index, 'rate_adjustment', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeThreshold(index)}
                    disabled={thresholds.length === 1}
                    className="h-8 w-8"
                  >
                    <Trash className="w-4 h-4 text-gray-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={addThreshold}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        {t('additionalThreshold')}
      </Button>
    </div>
  );
}
