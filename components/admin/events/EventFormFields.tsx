'use client';

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import InventoryStatusSelector from "./InventoryStatusSelector";
import EventTypeSelector from "./EventTypeSelector";
import PriceTypeSelector from "./PriceTypeSelector";
import RecurrenceSelector from "./RecurrenceSelector";
import ApplicableDaysSelector from "./ApplicableDaysSelector";
import RulesetSelector from "./RulesetSelector";
import CategoryItemSelector, { Category } from "./CategoryItemSelector";

interface YieldThreshold {
  stock: number;
  rate_adjustment: number;
}

interface DynamicPricing {
  value: number;
  mode: 'percent' | 'fixed';
}

export interface EventFormFieldsProps {
  // Form data
  formData: {
    name: string;
    type: 'seasonal' | 'special' | 'closure';
    status: 'available' | 'unavailable';
    pricing_type: 'base_price' | 'new_price' | 'dynamic' | 'yield';
    recurrence: 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always';
    start_date: string;
    end_date: string | null;
    days_of_week: number[];
    applicable_times: 'all' | string;
    rules_id: string | null;
    active: boolean;
    dynamic_pricing?: DynamicPricing;
    yield_thresholds?: YieldThreshold[];
  };

  // Change handlers
  onChange: (field: string, value: any) => void;
  onDynamicPricingChange?: (data: DynamicPricing) => void;
  onYieldThresholdsChange?: (thresholds: YieldThreshold[]) => void;

  // Categories & Items data
  categories?: Category[];
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onToggleItem?: (itemId: string) => void;
  onToggleCategory?: (categoryId: string) => void;
  onSelectAll?: () => void;
  onSelectNone?: () => void;

  // UI customization
  hideTypeSelector?: boolean;  // For modal (type pre-selected)
  hideInventoryStatus?: boolean;  // For modal (hide inventory status)
  showItemSelector?: boolean;  // Show "Áp dụng cho" section
}

export default function EventFormFields({
  formData,
  onChange,
  onDynamicPricingChange,
  onYieldThresholdsChange,
  categories = [],
  selectedItems = [],
  onSelectionChange = () => {},
  onToggleItem,
  onToggleCategory,
  onSelectAll,
  onSelectNone,
  hideTypeSelector = false,
  hideInventoryStatus = false,
  showItemSelector = false
}: EventFormFieldsProps) {
  const t = useTranslations('events.new');

  // Memoize callbacks to prevent infinite loops
  const handleDaysChange = useCallback((days: number[]) => {
    onChange('days_of_week', days);
  }, [onChange]);

  const handleStatusChange = useCallback((value: 'available' | 'unavailable') => {
    onChange('status', value);
    // Auto-set type to 'closure' when status is 'unavailable'
    if (value === 'unavailable') {
      onChange('type', 'closure');
    } else {
      // When switching back to 'available', reset to 'seasonal' if currently 'closure'
      if (formData.type === 'closure') {
        onChange('type', 'seasonal');
      }
    }
  }, [onChange, formData.type]);

  const handleTypeChange = useCallback((value: 'seasonal' | 'special' | 'closure') => {
    onChange('type', value);
  }, [onChange]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('name', e.target.value);
  }, [onChange]);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('start_date', e.target.value);
  }, [onChange]);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('end_date', e.target.value);
  }, [onChange]);

  const handlePricingTypeChange = useCallback((value: string) => {
    onChange('pricing_type', value);
  }, [onChange]);

  const handleRulesIdChange = useCallback((value: string | null) => {
    onChange('rules_id', value);
  }, [onChange]);

  const handleRecurrenceChange = useCallback((value: 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always') => {
    onChange('recurrence', value);
  }, [onChange]);

  return (
    <div className="space-y-6">
      {/* 1 & 2. Inventory Status and Event Type - on same row */}
      {(!hideInventoryStatus || !hideTypeSelector) && (
        <div className="grid grid-cols-2 gap-4">
          {!hideInventoryStatus && (
            <InventoryStatusSelector
              value={formData.status}
              onChange={handleStatusChange}
            />
          )}

          {/* Hide Event Type selector when status is unavailable */}
          {!hideTypeSelector && formData.status === 'available' && (
            <EventTypeSelector
              value={formData.type}
              onChange={handleTypeChange}
              hideClosureOption={true}
            />
          )}
        </div>
      )}

      {/* 3. Name */}
      <div className="space-y-2">
        <Label>{t('name')}</Label>
        <Input
          value={formData.name}
          onChange={handleNameChange}
          placeholder={t('namePlaceholder')}
          required
        />
        <p className="text-sm text-gray-500">
          {t('nameHint')}
        </p>
      </div>

      {/* 4. Price Type Selector (with Dynamic and Yield tabs) - Hide when status is unavailable */}
      {formData.status === 'available' && (
        <PriceTypeSelector
          value={formData.pricing_type}
          onChange={handlePricingTypeChange}
          dynamicPricing={formData.dynamic_pricing}
          yieldThresholds={formData.yield_thresholds}
          onDynamicPricingChange={onDynamicPricingChange}
          onYieldThresholdsChange={onYieldThresholdsChange}
        />
      )}

      {/* 4.5. Recurrence Selector */}
      <RecurrenceSelector
        value={formData.recurrence}
        onChange={handleRecurrenceChange}
      />

      {/* 5. Applicable Days (only show when recurrence is weekly) - on its own row */}
      {formData.recurrence === 'weekly' && (
        <ApplicableDaysSelector
          daysOfWeek={formData.days_of_week}
          onDaysChange={handleDaysChange}
        />
      )}

      {/* 6. Date Range (hide when recurrence is 'always') */}
      {formData.recurrence !== 'always' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label>{t('startDate')}</Label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={handleStartDateChange}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>{t('endDate')}</Label>
            <Input
              type="date"
              value={formData.end_date || ''}
              onChange={handleEndDateChange}
              disabled={formData.end_date === null}
              min={formData.start_date || undefined}
            />
            {/* Remove End Date Checkbox */}
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="remove-end-date-checkbox"
                checked={formData.end_date === null}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange('end_date', null);
                  } else {
                    onChange('end_date', '');
                  }
                }}
              />
              <Label htmlFor="remove-end-date-checkbox" className="text-sm cursor-pointer">
                {t('removeEndDate')}
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* 7. Ruleset */}
      <RulesetSelector
        value={formData.rules_id}
        onChange={handleRulesIdChange}
      />

      {/* 8. Active Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="active-checkbox"
          checked={formData.active}
          onCheckedChange={(checked) => onChange('active', checked)}
        />
        <Label htmlFor="active-checkbox" className="text-sm cursor-pointer">
          {t('activeEvent')}
        </Label>
      </div>

      {/* 9. Category/Item Selector (conditional) */}
      {showItemSelector && (
        <CategoryItemSelector
          categories={categories}
          selectedItems={selectedItems}
          onSelectionChange={onSelectionChange}
        />
      )}
    </div>
  );
}
