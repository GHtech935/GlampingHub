"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Locale } from "@/lib/i18n-utils";
import type { TentEditData } from "./types";
import { GlampingTentFormSections } from "./GlampingTentFormSections";
import type { AppliedVoucher } from "@/components/booking/VoucherInput";
import type { MultilingualText } from "@/lib/i18n-utils";

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

interface GlampingEditTentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  tent: TentEditData;
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Chỉnh sửa lều',
    save: 'Lưu thay đổi',
    cancel: 'Huỷ',
    saving: 'Đang lưu...',
    saveSuccess: 'Đã cập nhật lều',
    saveFailed: 'Không thể cập nhật',
    pricingError: 'Không thể tải giá. Vui lòng thử lại.',
  },
  en: {
    title: 'Edit Tent',
    save: 'Save Changes',
    cancel: 'Cancel',
    saving: 'Saving...',
    saveSuccess: 'Tent updated',
    saveFailed: 'Failed to update',
    pricingError: 'Failed to load pricing. Please try again.',
  },
};

/** Normalize any date string/ISO timestamp to YYYY-MM-DD for <input type="date"> */
function toDateInputValue(dateStr: string): string {
  if (!dateStr) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // ISO or other format — extract the date part
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function GlampingEditTentModal({
  isOpen,
  onClose,
  onSave,
  tent,
  locale = 'vi',
}: GlampingEditTentModalProps) {
  const t = texts[locale];

  const [checkInDate, setCheckInDate] = useState(() => toDateInputValue(tent.checkInDate));
  const [checkOutDate, setCheckOutDate] = useState(() => toDateInputValue(tent.checkOutDate));
  const [parameters, setParameters] = useState(
    tent.parameters.map(p => ({ ...p }))
  );
  // Initialize override state from tent props
  const [subtotalOverride, setSubtotalOverride] = useState<number | undefined>(
    tent.priceOverride !== null && tent.priceOverride !== undefined
      ? tent.priceOverride
      : undefined
  );
  const [showSubtotalOverride, setShowSubtotalOverride] = useState(
    tent.priceOverride !== null && tent.priceOverride !== undefined
  );
  const [specialRequests, setSpecialRequests] = useState(tent.specialRequests || '');
  const [accommodationVoucher, setAccommodationVoucher] = useState<AppliedVoucher | null>(
    tent.voucherCode ? {
      id: '',
      code: tent.voucherCode,
      name: '',
      description: '',
      discountType: tent.discountType || 'percentage',
      discountValue: tent.discountValue || 0,
      discountAmount: tent.discountAmount || 0,
      isStackable: false,
    } : null
  );
  const [saving, setSaving] = useState(false);

  // Add parameter fetching state
  // Initialize with tent.parameters data (convert structure to match GlampingParameter)
  const [itemParameters, setItemParameters] = useState<GlampingParameter[]>(() =>
    tent.parameters.map(p => ({
      id: p.parameterId,
      parameter_id: p.parameterId,
      name: p.parameterName || '',
      color_code: '',
      controls_inventory: false,
      sets_pricing: true,
      min_quantity: 0,
      max_quantity: 99,
      counted_for_menu: false,
    }))
  );
  const [loadingParameters, setLoadingParameters] = useState(false);

  // Add DateRange state for calendar
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: new Date(tent.checkInDate),
    to: new Date(tent.checkOutDate)
  }));

  // Sync DateRange → string dates for API calls
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setCheckInDate(format(dateRange.from, 'yyyy-MM-dd'))
      setCheckOutDate(format(dateRange.to, 'yyyy-MM-dd'))
    }
  }, [dateRange]);

  // Fetch item details when modal opens
  useEffect(() => {
    if (!isOpen || !tent.itemId) return;

    const fetchItemDetails = async () => {
      setLoadingParameters(true);
      try {
        const response = await fetch(`/api/glamping/items/${tent.itemId}/details`);
        if (!response.ok) throw new Error('Failed to fetch item details');

        const data = await response.json();
        const fetchedParams = data.parameters || [];

        // Merge fetched parameters with stored quantities
        const mergedParams = fetchedParams.map((param: any) => {
          const storedParam = tent.parameters.find(p => p.parameterId === (param.parameter_id || param.id));
          return {
            id: param.parameter_id || param.id,
            parameter_id: param.parameter_id || param.id,
            name: param.name,
            color_code: param.color_code || '',
            controls_inventory: param.controls_inventory || false,
            sets_pricing: param.sets_pricing || true,
            min_quantity: param.min_quantity || 0,
            max_quantity: param.max_quantity || 99,
            counted_for_menu: param.counted_for_menu || false,
            // Preserve stored quantity if exists
            quantity: storedParam?.quantity || param.min_quantity || 0,
          };
        });

        setItemParameters(mergedParams);

        // Update parameters state: use mergedParams quantities (which already merged stored + fetched)
        // Convert to the format expected by parameters state (with parameterId field)
        setParameters(mergedParams.map((mp: any) => ({
          parameterId: mp.parameter_id || mp.id,
          parameterName: typeof mp.name === 'string' ? mp.name : (mp.name?.vi || ''),
          quantity: mp.quantity || 0,
          unitPrice: 0, // Will be fetched from pricing API
        })));
      } catch (error) {
        console.error('Error fetching item details:', error);
      } finally {
        setLoadingParameters(false);
      }
    };

    fetchItemDetails();
  }, [isOpen, tent.itemId, tent.parameters]);

  // Pricing state fetched from API
  // Start empty and let API fetch populate it
  const [parameterPricing, setParameterPricing] = useState<Record<string, number>>({});
  const [parameterPricingModes, setParameterPricingModes] = useState<Record<string, 'per_person' | 'per_group'>>({});
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate nights
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate subtotal from API-fetched parameterPricing
  // parameterPricing[paramId] = total price per unit for ALL nights
  // per_person: price × quantity
  // per_group: price (fixed, no multiply)
  const calculatedSubtotal = parameters.reduce((sum, p) => {
    const pricePerUnit = parameterPricing[p.parameterId] || 0;
    const mode = parameterPricingModes[p.parameterId] || 'per_person';

    if (mode === 'per_group') {
      return sum + pricePerUnit; // Fixed price, don't multiply by quantity
    }
    return sum + p.quantity * pricePerUnit; // per_person: multiply by quantity
  }, 0);

  const effectiveSubtotal = subtotalOverride !== undefined ? subtotalOverride : calculatedSubtotal;

  // Fetch pricing from API
  const fetchPricing = useCallback(async () => {
    if (!checkInDate || !checkOutDate || !tent.itemId) return;

    const checkInD = new Date(checkInDate);
    const checkOutD = new Date(checkOutDate);
    if (checkOutD <= checkInD) return;

    setLoadingPricing(true);
    setPricingError(null);

    try {
      const params = new URLSearchParams({
        itemId: tent.itemId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
      });

      parameters.forEach(p => {
        params.set(`param_${p.parameterId}`, String(p.quantity));
      });

      const res = await fetch(`/api/glamping/booking/calculate-pricing?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch pricing');
      }

      const data = await res.json();
      if (data.parameterPricing) {
        setParameterPricing(data.parameterPricing);
      }
      if (data.parameterPricingModes) {
        setParameterPricingModes(data.parameterPricingModes);
      }
    } catch (error) {
      console.error('Fetch pricing failed:', error);
      setPricingError(t.pricingError);
      setParameterPricing({}); // Clear pricing on error
    } finally {
      setLoadingPricing(false);
    }
  }, [checkInDate, checkOutDate, tent.itemId, parameters, t.pricingError]);

  // Debounced fetch when dates or quantities change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPricing();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchPricing]);


  const handleSave = async () => {
    try {
      setSaving(true);

      const body: any = {
        checkInDate,
        checkOutDate,
        parameters: parameters.map(p => ({
          parameterId: p.parameterId,
          quantity: p.quantity,
          unitPrice: parameterPricing[p.parameterId] || p.unitPrice,
          pricingMode: parameterPricingModes[p.parameterId] || 'per_person',
        })),
        specialRequests,
      };

      // Handle subtotal override
      // If toggle is ON and value is set, send the override
      // If toggle is OFF (was previously ON), send null to clear it
      if (showSubtotalOverride && subtotalOverride !== undefined) {
        body.subtotalOverride = subtotalOverride;
      } else if (!showSubtotalOverride && tent.priceOverride !== null && tent.priceOverride !== undefined) {
        // User turned off override that was previously set - send null to clear it
        body.subtotalOverride = null;
      }

      // Handle voucher changes
      const originalVoucher = tent.voucherCode || null;
      const currentVoucher = accommodationVoucher?.code || null;
      if (currentVoucher !== originalVoucher) {
        body.voucherCode = currentVoucher;
        body.discountAmount = accommodationVoucher?.discountAmount || 0;
      }

      const res = await fetch(
        `/api/admin/glamping/bookings/${tent.bookingId}/tents/${tent.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      toast.success(t.saveSuccess);
      onSave();
    } catch (error: any) {
      console.error('Save tent failed:', error);
      toast.error(error.message || t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t.title}: {tent.itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {pricingError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              ⚠️ {pricingError}
            </div>
          )}

          <GlampingTentFormSections
            mode="edit"
            zoneId={tent.zoneId || ''}
            itemId={tent.itemId}
            bookingId={tent.bookingId}
            locale={locale}
            disabled={saving}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            parameters={itemParameters}
            loadingParameters={loadingParameters}
            parameterQuantities={(() => {
              const result = Object.fromEntries(
                itemParameters.map(ip => {
                  // Use current parameters state for quantity (updated by user input)
                  // parameters uses 'parameterId', itemParameters uses 'parameter_id'
                  const currentParam = parameters.find(
                    p => p.parameterId === (ip.parameter_id || ip.id)
                  );
                  return [ip.parameter_id || ip.id, currentParam?.quantity || 0];
                })
              );
              return result;
            })()}
            onQuantitiesChange={(quantities) => {
              // Update parameters state with new quantities
              // quantities keys use 'parameter_id' format, parameters uses 'parameterId'
              setParameters(prev => {
                // Update existing parameters
                const updated = prev.map(p => ({
                  ...p,
                  quantity: quantities[p.parameterId] || 0
                }));

                // Add any new parameters from itemParameters that aren't in prev
                const existingIds = new Set(prev.map(p => p.parameterId));
                const newParams = itemParameters
                  .filter(ip => !existingIds.has(ip.parameter_id || ip.id))
                  .map(ip => ({
                    parameterId: ip.parameter_id || ip.id,
                    parameterName: typeof ip.name === 'string' ? ip.name : (ip.name?.vi || ''),
                    quantity: quantities[ip.parameter_id || ip.id] || 0,
                    unitPrice: 0,
                  }));

                return [...updated, ...newParams];
              });
            }}
            parameterPricing={parameterPricing}
            parameterPricingModes={parameterPricingModes}
            pricingLoading={loadingPricing}
            accommodationVoucher={accommodationVoucher}
            onVoucherApplied={(voucher) => setAccommodationVoucher(voucher)}
            onVoucherRemoved={() => setAccommodationVoucher(null)}
            accommodationCost={calculatedSubtotal}
            specialRequests={specialRequests}
            onSpecialRequestsChange={setSpecialRequests}
            nights={nights}
            totalAfterVoucher={calculatedSubtotal - (accommodationVoucher?.discountAmount || 0)}
            showSubtotalOverride={showSubtotalOverride}
            subtotalOverride={subtotalOverride}
            onSubtotalOverrideChange={setSubtotalOverride}
            onToggleSubtotalOverride={() => setShowSubtotalOverride(!showSubtotalOverride)}
            calculatedSubtotal={calculatedSubtotal}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving || loadingPricing || !!pricingError}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {t.saving}
              </>
            ) : (
              t.save
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
