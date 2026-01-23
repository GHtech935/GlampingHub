"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Tent, Truck, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UpdatePricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitchId: string;
  pitchTypes: string[];
  onUpdate: (updates: BulkUpdateData) => Promise<void>;
}

// NEW SCHEMA V2: pitchType is only required when updating price
// Shared fields (extraChildPrice, extraAdultPrice) don't need pitch type
// minStay is now campsite-level only, removed from pricing
export interface BulkUpdateData {
  pitchId: string;
  pitchType?: string; // Only required when updating price
  fromDate: string;
  toDate: string;
  days: string[];
  priceType: string;
  updates: {
    price?: number;              // Goes to pitch_type_prices (requires pitchType)
    closeInPeriod?: boolean;     // Goes to availability_calendar
    arrivalAllowed?: boolean;    // Goes to availability_calendar
    departureAllowed?: boolean;  // Goes to availability_calendar
    extraChildPrice?: number;    // Goes to pricing_calendar (SHARED)
    extraAdultPrice?: number;    // Goes to pricing_calendar (SHARED)
  };
}

// Pitch type configuration with icons
const pitchTypeConfig: Record<string, { icon: React.ReactNode }> = {
  tent: { icon: <Tent className="w-4 h-4" /> },
  roof_tent: { icon: <Tent className="w-4 h-4" /> },
  trailer_tent: { icon: <Tent className="w-4 h-4" /> },
  campervan: { icon: <Truck className="w-4 h-4" /> },
  motorhome: { icon: <Truck className="w-4 h-4" /> },
  touring_caravan: { icon: <Bus className="w-4 h-4" /> },
};

// Pitch type display order
const pitchTypeOrder: string[] = [
  'tent',
  'roof_tent',
  'trailer_tent',
  'campervan',
  'motorhome',
  'touring_caravan',
];

// Sort pitch types by predefined order
const sortPitchTypes = (types: string[]): string[] => {
  return [...types].sort((a, b) => {
    const indexA = pitchTypeOrder.indexOf(a);
    const indexB = pitchTypeOrder.indexOf(b);
    const orderA = indexA === -1 ? 999 : indexA;
    const orderB = indexB === -1 ? 999 : indexB;
    return orderA - orderB;
  });
};

export function UpdatePricesModal({
  isOpen,
  onClose,
  pitchId,
  pitchTypes,
  onUpdate,
}: UpdatePricesModalProps) {
  const t = useTranslations('admin.pricingPage');
  const tPitchTypes = useTranslations('pitch.types');

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get default dates: today and 2 months from today
  const getDefaultDates = () => {
    const today = new Date();
    const twoMonthsLater = new Date();
    twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

    return {
      from: formatDate(today),
      to: formatDate(twoMonthsLater)
    };
  };

  const defaultDates = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaultDates.from);
  const [toDate, setToDate] = useState(defaultDates.to);
  const [priceType, setPriceType] = useState("standard");
  const [selectedPitchType, setSelectedPitchType] = useState<string>(sortPitchTypes(pitchTypes)[0] || "");
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ]);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [childPrice, setChildPrice] = useState<number | undefined>(undefined);
  const [adultPrice, setAdultPrice] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checkbox states for selective updates (default: all unchecked)
  const [enablePrice, setEnablePrice] = useState(false);
  const [enableCloseInPeriod, setEnableCloseInPeriod] = useState(false);
  const [enableArrivalAllowed, setEnableArrivalAllowed] = useState(false);
  const [enableDepartureAllowed, setEnableDepartureAllowed] = useState(false);
  const [enableChildPrice, setEnableChildPrice] = useState(false);
  const [enableAdultPrice, setEnableAdultPrice] = useState(false);

  // Validation error states
  const [errors, setErrors] = useState<{
    dateRange?: string;
    days?: string;
    pitchType?: string;
    noFieldSelected?: string;
    price?: string;
  }>({});

  const getWeekdayFull = (day: string): string => {
    return t(`weekdays.${day}`);
  };

  const getWeekdayFromDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return t(`weekdays.${days[date.getDay()]}`);
  };

  const dayOptions = [
    { value: "monday", label: getWeekdayFull("monday") },
    { value: "tuesday", label: getWeekdayFull("tuesday") },
    { value: "wednesday", label: getWeekdayFull("wednesday") },
    { value: "thursday", label: getWeekdayFull("thursday") },
    { value: "friday", label: getWeekdayFull("friday") },
    { value: "saturday", label: getWeekdayFull("saturday") },
    { value: "sunday", label: getWeekdayFull("sunday") },
  ];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const calculateNights = () => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    const newErrors: typeof errors = {};

    // Validate pitch type is selected ONLY when updating price
    // Shared fields (minStay, extraChildPrice, extraAdultPrice) don't need pitch type
    if (enablePrice && !selectedPitchType) {
      newErrors.pitchType = t('updateModal.errors.pitchType') || 'Please select a pitch type';
    }

    // Validate date range
    if (!fromDate || !toDate) {
      newErrors.dateRange = t('updateModal.errors.dateRange');
    }

    // Validate: không cho chọn ngày trong quá khứ
    const today = formatDate(new Date());
    if (fromDate && fromDate < today) {
      newErrors.dateRange = t('updateModal.errors.pastDate');
    }

    // Validate at least one day is selected
    if (selectedDays.length === 0) {
      newErrors.days = t('updateModal.errors.days');
    }

    // Validate at least one field is enabled for update
    const hasAnyFieldEnabled = enablePrice || enableCloseInPeriod || enableArrivalAllowed ||
      enableDepartureAllowed || enableChildPrice || enableAdultPrice;

    if (!hasAnyFieldEnabled) {
      newErrors.noFieldSelected = t('updateModal.errors.noFieldSelected');
    }

    // Validate price value if price field is enabled
    if (enablePrice && (price === undefined || price === null)) {
      newErrors.price = t('updateModal.errors.price');
    }

    // If there are any errors, set them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors and proceed
    setErrors({});
    setIsSubmitting(true);

    // Only include fields that are enabled
    const updates: BulkUpdateData['updates'] = {};
    if (enablePrice) updates.price = price;
    if (enableCloseInPeriod) updates.closeInPeriod = true;
    if (enableArrivalAllowed) updates.arrivalAllowed = true;
    if (enableDepartureAllowed) updates.departureAllowed = true;
    if (enableChildPrice) updates.extraChildPrice = childPrice ?? 0;
    if (enableAdultPrice) updates.extraAdultPrice = adultPrice ?? 0;

    const bulkData: BulkUpdateData = {
      pitchId,
      // Only include pitchType when updating price (per-type field)
      ...(enablePrice && selectedPitchType ? { pitchType: selectedPitchType } : {}),
      fromDate,
      toDate,
      days: selectedDays,
      priceType,
      updates,
    };

    try {
      await onUpdate(bulkData);
      onClose();
    } catch (error) {
      console.error("Failed to update prices:", error);
      Swal.fire({
        icon: 'error',
        title: t('updateModal.error'),
        text: t('updateModal.updateFailed'),
        confirmButtonColor: '#7c3aed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {t('updateModal.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date range */}
          <div>
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-gray-600 whitespace-nowrap">{t('from')} - {getWeekdayFromDate(fromDate)}</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={fromDate}
                    min={formatDate(new Date())}
                    onChange={(e) => { setFromDate(e.target.value); setErrors(prev => ({ ...prev, dateRange: undefined })); }}
                    className={`pl-10 ${errors.dateRange ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center pb-2">
                <span className="text-gray-400">→</span>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 whitespace-nowrap">{t('until')} - {getWeekdayFromDate(toDate)}</Label>
                <Input
                  type="date"
                  value={toDate}
                  min={fromDate || formatDate(new Date())}
                  onChange={(e) => { setToDate(e.target.value); setErrors(prev => ({ ...prev, dateRange: undefined })); }}
                  className={errors.dateRange ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              </div>
              {/* Nights calculation */}
              <div className="flex items-center pb-2">
                {fromDate && toDate && (
                  <div className="text-sm italic font-medium whitespace-nowrap">
                    {calculateNights()} {calculateNights() === 1 ? t('night') : t('nights')}
                  </div>
                )}
              </div>
            </div>
            {errors.dateRange && <p className="text-red-500 text-sm mt-1">{errors.dateRange}</p>}
          </div>

          {/* Days selection */}
          <div>
            <Label className="text-gray-600">{t('updateModal.days')}</Label>
            <div className={`flex flex-wrap gap-2 mt-2 p-2 rounded-md ${errors.days ? 'border border-red-500' : ''}`}>
              {dayOptions.map((day) => (
                <button
                  key={day.value}
                  onClick={() => { toggleDay(day.value); setErrors(prev => ({ ...prev, days: undefined })); }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedDays.includes(day.value)
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {errors.days && <p className="text-red-500 text-sm mt-1">{errors.days}</p>}
          </div>

          {/* No field selected error */}
          {errors.noFieldSelected && (
            <div className="p-3 bg-red-50 border border-red-500 rounded-md">
              <p className="text-red-500 text-sm">{errors.noFieldSelected}</p>
            </div>
          )}

          {/* Section: Per-Pitch-Type Fields (price requires pitch type) */}
          <div className="border rounded-lg p-4 space-y-4 bg-blue-50/30">
            <div className="text-sm font-medium text-gray-700">
              {t('updateModal.perTypeSection') || 'Price by Slot Type'}
              <span className="font-normal text-gray-500 ml-2">
                ({t('updateModal.perTypeSectionHint') || 'Select slot type when updating price'})
              </span>
            </div>

            {/* Slot type + Price on same row */}
            <div className={`grid grid-cols-2 gap-4 ${!enablePrice ? 'opacity-50' : ''}`}>
              {/* Slot Type selector (first) */}
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={enablePrice}
                  onCheckedChange={(checked) => { setEnablePrice(checked === true); setErrors(prev => ({ ...prev, noFieldSelected: undefined, price: undefined, pitchType: undefined })); }}
                  className="mt-8"
                />
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-normal text-gray-600">{t('updateModal.pitchType') || 'Slot Type'}</Label>
                  <Select
                    value={selectedPitchType}
                    onValueChange={(value) => {
                      setSelectedPitchType(value);
                      setErrors(prev => ({ ...prev, pitchType: undefined }));
                    }}
                    disabled={!enablePrice}
                  >
                    <SelectTrigger className={`${errors.pitchType ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder={t('updateModal.selectPitchType') || 'Select slot type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {sortPitchTypes(pitchTypes).map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary">
                              {pitchTypeConfig[type]?.icon || type.charAt(0).toUpperCase()}
                            </span>
                            {tPitchTypes(type)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.pitchType && <p className="text-red-500 text-sm">{errors.pitchType}</p>}
                </div>
              </div>

              {/* Price input (second) */}
              <div className="space-y-1">
                <Label className="text-sm font-normal text-gray-600">{t('price')}</Label>
                <CurrencyInput
                  value={price}
                  onValueChange={(val) => { setPrice(val); setErrors(prev => ({ ...prev, price: undefined })); }}
                  placeholder={t('price')}
                  minValue={0}
                  className={`${errors.price ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  disabled={!enablePrice}
                />
                {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
              </div>
            </div>
          </div>

          {/* Section: Shared Fields (applies to ALL pitch types) */}
          <div className="border rounded-lg p-4 space-y-4 bg-green-50/30">
            <div className="text-sm font-medium text-gray-700">
              {t('updateModal.sharedSection') || 'Shared Settings'}
              <span className="font-normal text-gray-500 ml-2">
                ({t('updateModal.sharedSectionHint') || 'Applies to all pitch types'})
              </span>
            </div>

            {/* Close in this period */}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={enableCloseInPeriod}
                onCheckedChange={(checked) => { setEnableCloseInPeriod(checked === true); setErrors(prev => ({ ...prev, noFieldSelected: undefined })); }}
              />
              <Label className="text-sm font-normal cursor-pointer">
                {t('updateModal.closeInPeriod')}
              </Label>
            </div>

            {/* Arrival allowed */}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={enableArrivalAllowed}
                onCheckedChange={(checked) => { setEnableArrivalAllowed(checked === true); setErrors(prev => ({ ...prev, noFieldSelected: undefined })); }}
              />
              <Label className="text-sm font-normal cursor-pointer">
                {t('updateModal.isArrivalAllowed')}
              </Label>
            </div>

            {/* Departure allowed */}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={enableDepartureAllowed}
                onCheckedChange={(checked) => { setEnableDepartureAllowed(checked === true); setErrors(prev => ({ ...prev, noFieldSelected: undefined })); }}
              />
              <Label className="text-sm font-normal cursor-pointer">
                {t('updateModal.isDepartureAllowed')}
              </Label>
            </div>

            {/* Extra person pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`flex items-center gap-3 ${!enableChildPrice ? 'opacity-50' : ''}`}>
                <Checkbox
                  checked={enableChildPrice}
                  onCheckedChange={(checked) => { setEnableChildPrice(checked === true); setErrors(prev => ({ ...prev, noFieldSelected: undefined })); }}
                />
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-normal text-gray-600">
                    {t('children')}
                  </Label>
                  <CurrencyInput
                    value={childPrice}
                    onValueChange={setChildPrice}
                    placeholder={t('children')}
                    minValue={0}
                    disabled={!enableChildPrice}
                  />
                </div>
              </div>
              <div className={`flex items-center gap-3 ${!enableAdultPrice ? 'opacity-50' : ''}`}>
                <Checkbox
                  checked={enableAdultPrice}
                  onCheckedChange={(checked) => { setEnableAdultPrice(checked === true); setErrors(prev => ({ ...prev, noFieldSelected: undefined })); }}
                />
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-normal text-gray-600">
                    {t('adults')}
                  </Label>
                  <CurrencyInput
                    value={adultPrice}
                    onValueChange={setAdultPrice}
                    placeholder={t('adults')}
                    minValue={0}
                    disabled={!enableAdultPrice}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? t('updateModal.saving').toUpperCase() : t('updateModal.save').toUpperCase()}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('updateModal.cancel').toUpperCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
