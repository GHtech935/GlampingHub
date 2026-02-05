"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Locale, MultilingualText } from "@/lib/i18n-utils";
import { getLocalizedText } from "@/lib/i18n-utils";
import { GlampingItemSelector } from "@/components/admin/GlampingItemSelector";
import { GlampingTentFormSections } from "./GlampingTentFormSections";
import type { AppliedVoucher } from "@/components/booking/VoucherInput";

interface GlampingItem {
  id: string;
  name: MultilingualText | string;
  sku: string;
  category_name: MultilingualText | string;
  inventory_quantity: number;
  unlimited_inventory: boolean;
  status: string;
  max_guests?: number;
}

interface GlampingParameter {
  id: string;
  parameter_id: string;
  name: MultilingualText | string;
  color_code: string;
  controls_inventory: boolean;
  sets_pricing: boolean;
  min_quantity?: number;
  max_quantity?: number;
  counted_for_menu?: boolean;
}

interface GlampingAddTentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  bookingId: string;
  zoneId: string;
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Thêm lều mới',
    selectItem: 'Chọn Item',
    selectDatesAndParams: 'Chọn Ngày & Số lượng khách',
    voucher: 'Voucher lưu trú',
    specialRequests: 'Yêu cầu đặc biệt',
    specialRequestsPlaceholder: 'Nhập yêu cầu đặc biệt (nếu có)...',
    pricingSummary: 'Tổng tiền lều',
    accommodation: 'Lưu trú',
    voucherDiscount: 'Giảm giá voucher',
    total: 'Tổng cộng',
    cancel: 'Huỷ',
    add: 'Thêm lều',
    adding: 'Đang thêm...',
    addSuccess: 'Đã thêm lều thành công',
    addFailed: 'Không thể thêm lều',
    selectItemFirst: 'Vui lòng chọn item trước',
    selectDatesFirst: 'Vui lòng chọn ngày check-in và check-out',
    selectGuestsFirst: 'Vui lòng chọn số lượng khách',
    pricingError: 'Không thể tải giá. Vui lòng thử lại.',
  },
  en: {
    title: 'Add New Tent',
    selectItem: 'Select Item',
    selectDatesAndParams: 'Select Dates & Guests',
    voucher: 'Accommodation Voucher',
    specialRequests: 'Special Requests',
    specialRequestsPlaceholder: 'Enter special requests (optional)...',
    pricingSummary: 'Tent Total',
    accommodation: 'Accommodation',
    voucherDiscount: 'Voucher discount',
    total: 'Total',
    cancel: 'Cancel',
    add: 'Add Tent',
    adding: 'Adding...',
    addSuccess: 'Tent added successfully',
    addFailed: 'Failed to add tent',
    selectItemFirst: 'Please select an item first',
    selectDatesFirst: 'Please select check-in and check-out dates',
    selectGuestsFirst: 'Please select guest count',
    pricingError: 'Failed to load pricing. Please try again.',
  },
};

export function GlampingAddTentModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  zoneId,
  locale = 'vi',
}: GlampingAddTentModalProps) {
  const t = texts[locale];

  // Form state
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItemData, setSelectedItemData] = useState<GlampingItem | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [parameters, setParameters] = useState<GlampingParameter[]>([]);
  const [parameterQuantities, setParameterQuantities] = useState<Record<string, number>>({});
  const [loadingParameters, setLoadingParameters] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [accommodationVoucher, setAccommodationVoucher] = useState<{
    code: string;
    id: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
  } | null>(null);

  // Pricing state
  const [parameterPricing, setParameterPricing] = useState<Record<string, number>>({});
  const [parameterPricingModes, setParameterPricingModes] = useState<Record<string, 'per_person' | 'per_group'>>({});
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedItemId('');
      setSelectedItemData(null);
      setDateRange(undefined);
      setParameters([]);
      setParameterQuantities({});
      setSpecialRequests('');
      setAccommodationVoucher(null);
      setParameterPricing({});
      setParameterPricingModes({});
      setPricingError(null);
    }
  }, [isOpen]);

  // Fetch item parameters when item changes
  useEffect(() => {
    if (!selectedItemId) {
      setParameters([]);
      setParameterQuantities({});
      return;
    }

    const fetchItemDetails = async () => {
      setLoadingParameters(true);
      try {
        const response = await fetch(`/api/glamping/items/${selectedItemId}/details`);
        if (!response.ok) throw new Error('Failed to fetch item details');

        const data = await response.json();
        const itemParams = data.parameters || [];
        setParameters(itemParams);

        // Initialize quantities with min values
        const initialQuantities: Record<string, number> = {};
        itemParams.forEach((param: GlampingParameter) => {
          initialQuantities[param.parameter_id || param.id] = param.min_quantity || 0;
        });
        setParameterQuantities(initialQuantities);
      } catch (error) {
        console.error('Error fetching item details:', error);
      } finally {
        setLoadingParameters(false);
      }
    };

    fetchItemDetails();
  }, [selectedItemId]);

  // Fetch pricing when dates or quantities change
  useEffect(() => {
    if (!selectedItemId || !dateRange?.from || !dateRange?.to) {
      setParameterPricing({});
      setParameterPricingModes({});
      setPricingError(null);
      return;
    }

    const hasQuantity = Object.values(parameterQuantities).some(q => q > 0);
    if (!hasQuantity) return;

    const fetchPricing = async () => {
      setPricingLoading(true);
      setPricingError(null);
      try {
        const params = new URLSearchParams({
          itemId: selectedItemId,
          checkIn: format(dateRange.from!, 'yyyy-MM-dd'),
          checkOut: format(dateRange.to!, 'yyyy-MM-dd'),
          adults: '0',
          children: '0',
        });

        Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
          if (quantity > 0) {
            params.append(`param_${paramId}`, quantity.toString());
          }
        });

        const response = await fetch(`/api/glamping/booking/calculate-pricing?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch pricing');
        }

        if (data.parameterPricing) {
          setParameterPricing(data.parameterPricing);
        }
        if (data.parameterPricingModes) {
          setParameterPricingModes(data.parameterPricingModes);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
        setPricingError(locale === 'vi' ? 'Không thể tải giá. Vui lòng thử lại.' : 'Failed to load pricing. Please try again.');
        setParameterPricing({});
      } finally {
        setPricingLoading(false);
      }
    };

    const timer = setTimeout(fetchPricing, 300);
    return () => clearTimeout(timer);
  }, [selectedItemId, dateRange, parameterQuantities, locale]);

  // Calculate accommodation cost
  const accommodationCost = useMemo(() => {
    let total = 0;
    Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
      if (quantity > 0) {
        const unitPrice = parameterPricing[paramId] || 0;
        const pricingMode = parameterPricingModes[paramId] || 'per_person';
        if (pricingMode === 'per_group') {
          total += unitPrice;
        } else {
          total += quantity * unitPrice;
        }
      }
    });
    return total;
  }, [parameterQuantities, parameterPricing, parameterPricingModes]);

  // Calculate total after voucher
  const totalAfterVoucher = useMemo(() => {
    return accommodationCost - (accommodationVoucher?.discountAmount || 0);
  }, [accommodationCost, accommodationVoucher]);

  // Calculate nights
  const nights = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  }, [dateRange]);

  const handleItemChange = (itemId: string, itemData: GlampingItem) => {
    setSelectedItemId(itemId);
    setSelectedItemData(itemData);
    // Reset dependent state
    setParameterQuantities({});
    setAccommodationVoucher(null);
    setParameterPricing({});
    setParameterPricingModes({});
  };

  const handleVoucherApplied = (voucher: AppliedVoucher) => {
    setAccommodationVoucher({
      code: voucher.code,
      id: voucher.id,
      discountAmount: voucher.discountAmount,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
    });
  };

  const handleVoucherRemoved = () => {
    setAccommodationVoucher(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedItemId) {
      toast.error(t.selectItemFirst);
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
      toast.error(t.selectDatesFirst);
      return;
    }
    const hasGuests = Object.values(parameterQuantities).some(q => q > 0);
    if (!hasGuests) {
      toast.error(t.selectGuestsFirst);
      return;
    }

    setSubmitting(true);
    try {
      // Build parameters array for API
      const paramsForApi = Object.entries(parameterQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([paramId, quantity]) => ({
          parameterId: paramId,
          quantity,
          unitPrice: parameterPricing[paramId] || 0,
          pricingMode: parameterPricingModes[paramId] || 'per_person',
        }));

      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/tents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          checkInDate: format(dateRange.from, 'yyyy-MM-dd'),
          checkOutDate: format(dateRange.to, 'yyyy-MM-dd'),
          parameters: paramsForApi,
          subtotal: accommodationCost,
          specialRequests: specialRequests || undefined,
          voucherCode: accommodationVoucher?.code || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add tent');
      }

      toast.success(t.addSuccess);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error adding tent:', error);
      toast.error(error instanceof Error ? error.message : t.addFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {pricingError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              ⚠️ {pricingError}
            </div>
          )}

          {/* Section 1: Item Selection */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">1</span>
              {t.selectItem}
              <span className="text-red-500">*</span>
            </h3>
            <GlampingItemSelector
              zoneId={zoneId}
              selectedItemId={selectedItemId}
              onItemChange={handleItemChange}
              locale={locale}
            />
          </div>

          {/* Sections 2, 3, 4 - Shared Component */}
          <GlampingTentFormSections
            mode="add"
            zoneId={zoneId}
            itemId={selectedItemId}
            locale={locale}
            disabled={!selectedItemId || submitting}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            parameters={parameters}
            parameterQuantities={parameterQuantities}
            onQuantitiesChange={setParameterQuantities}
            loadingParameters={loadingParameters}
            parameterPricing={parameterPricing}
            parameterPricingModes={parameterPricingModes}
            pricingLoading={pricingLoading}
            accommodationVoucher={
              accommodationVoucher
                ? {
                    id: accommodationVoucher.id,
                    code: accommodationVoucher.code,
                    name: '',
                    description: '',
                    discountType: accommodationVoucher.discountType,
                    discountValue: accommodationVoucher.discountValue,
                    discountAmount: accommodationVoucher.discountAmount,
                    isStackable: false,
                  }
                : null
            }
            onVoucherApplied={handleVoucherApplied}
            onVoucherRemoved={handleVoucherRemoved}
            accommodationCost={accommodationCost}
            specialRequests={specialRequests}
            onSpecialRequestsChange={setSpecialRequests}
            nights={nights}
            totalAfterVoucher={totalAfterVoucher}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || pricingLoading || !!pricingError}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.adding}
              </>
            ) : (
              t.add
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
