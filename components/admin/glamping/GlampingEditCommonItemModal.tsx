"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import VoucherInput, { type AppliedVoucher } from '@/components/booking/VoucherInput';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { Locale } from "@/lib/i18n-utils";
import type { CommonItemEditData } from "./types";

interface AddonConfig {
  addon_item_id: string;
  dates_setting: string;
  custom_start_date: string | null;
  custom_end_date: string | null;
  price_percentage: number;
}

interface GlampingEditCommonItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  item: CommonItemEditData;
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Chỉnh sửa item chung',
    parameters: 'Thông số',
    paramName: 'Loại',
    paramQty: 'SL',
    paramPrice: 'Đơn giá',
    total: 'Tổng',
    save: 'Lưu thay đổi',
    cancel: 'Huỷ',
    saving: 'Đang lưu...',
    saveSuccess: 'Đã cập nhật item chung',
    saveFailed: 'Không thể cập nhật',
    addonDate: 'Ngày sử dụng',
    addonDateFrom: 'Từ ngày',
    addonDateTo: 'Đến ngày',
    loadingPricing: 'Đang tính giá...',
    overrideTotal: 'Ghi đè thành tiền',
    removeOverride: 'Bỏ ghi đè',
    overrideHint: 'Nhập tổng tiền...',
    calculatedPrice: 'Giá tính toán',
    subtotal: 'Tạm tính',
  },
  en: {
    title: 'Edit Common Item',
    parameters: 'Parameters',
    paramName: 'Type',
    paramQty: 'Qty',
    paramPrice: 'Unit Price',
    total: 'Total',
    save: 'Save Changes',
    cancel: 'Cancel',
    saving: 'Saving...',
    saveSuccess: 'Common item updated',
    saveFailed: 'Failed to update',
    addonDate: 'Service Date',
    addonDateFrom: 'From Date',
    addonDateTo: 'To Date',
    loadingPricing: 'Calculating price...',
    overrideTotal: 'Override Total',
    removeOverride: 'Remove override',
    overrideHint: 'Enter total...',
    calculatedPrice: 'Calculated',
    subtotal: 'Subtotal',
  },
};

// Timezone-safe: extract YYYY-MM-DD in local timezone
const toDateStr = (val: string): string => {
  if (!val) return '';
  if (val.length === 10 && !val.includes('T')) return val;
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const addDaysLocal = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST issues
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function GlampingEditCommonItemModal({
  isOpen,
  onClose,
  onSave,
  item,
  locale = 'vi',
}: GlampingEditCommonItemModalProps) {
  const t = texts[locale];

  const [parameters, setParameters] = useState(
    item.parameters.map(p => ({ ...p }))
  );
  const [saving, setSaving] = useState(false);

  // Addon config & dates state
  const [addonConfig, setAddonConfig] = useState<AddonConfig | null>(null);
  const [addonDates, setAddonDates] = useState<{ from: string; to: string } | null>(item.dates);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Pricing state
  const [pricingLoading, setPricingLoading] = useState(false);

  // Ref for tracking previous parameters to optimize fetches
  const prevParametersRef = useRef(parameters);

  // Price override state
  const [priceOverride, setPriceOverride] = useState<number | null>(item.priceOverride || null);
  const [showPriceOverride, setShowPriceOverride] = useState(!!item.priceOverride);

  // Voucher state
  const [voucher, setVoucher] = useState<{
    code: string;
    id: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null>(item.voucherCode ? {
    code: item.voucherCode,
    id: '', // We don't have the ID in edit mode, but it's not critical
    discountAmount: item.discountAmount || 0,
    discountType: 'fixed', // Default, actual type not stored
    discountValue: item.discountAmount || 0,
  } : null);

  // Fetch addon config on mount
  useEffect(() => {
    if (!item.tentItemId) return;
    setLoadingConfig(true);
    fetch(`/api/glamping/items/${item.tentItemId}`)
      .then(res => res.json())
      .then(data => {
        const addon = data.item?.addons?.find((a: any) => a.addon_item_id === item.itemId);
        setAddonConfig(addon || null);
      })
      .catch(err => {
        console.error('Error fetching addon config:', err);
      })
      .finally(() => setLoadingConfig(false));
  }, [item.tentItemId, item.itemId]);

  // Fetch pricing when dates change
  useEffect(() => {
    if (!addonConfig) return;

    // Create stable comparison key
    const currentKey = parameters.map(p => `${p.parameterId}:${p.quantity}`).join(',');
    const prevKey = prevParametersRef.current.map(p => `${p.parameterId}:${p.quantity}`).join(',');

    // Skip if quantities haven't changed
    if (currentKey === prevKey && parameters.every(p => p.unitPrice > 0)) {
      return;
    }

    const hasQuantity = parameters.some(p => p.quantity > 0);
    if (!hasQuantity) {
      prevParametersRef.current = parameters;
      return;
    }

    const effectiveCheckIn = addonDates?.from || item.tentCheckInDate;
    const effectiveCheckOut = addonDates?.to || item.tentCheckOutDate;

    if (!effectiveCheckIn || !effectiveCheckOut) return;

    // Update ref immediately
    prevParametersRef.current = parameters;

    const fetchPricing = async () => {
      setPricingLoading(true);
      try {
        const params = new URLSearchParams({
          itemId: item.itemId,
          checkIn: effectiveCheckIn,
          checkOut: effectiveCheckOut,
          adults: '0',
          children: '0',
        });

        parameters.forEach(p => {
          if (p.quantity > 0) {
            params.append(`param_${p.parameterId}`, p.quantity.toString());
          }
        });

        const res = await fetch(`/api/glamping/booking/calculate-pricing?${params}`);
        const data = await res.json();

        if (res.ok) {
          const pricePct = addonConfig.price_percentage ?? 100;

          if (data.parameterPricing) {
            setParameters(prev =>
              prev.map(p => ({
                ...p,
                unitPrice: ((data.parameterPricing[p.parameterId] as number) || p.unitPrice) * pricePct / 100,
                pricingMode: data.parameterPricingModes?.[p.parameterId] || p.pricingMode,
              }))
            );
          }
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      } finally {
        setPricingLoading(false);
      }
    };

    const timer = setTimeout(fetchPricing, 300);
    return () => clearTimeout(timer);
  }, [addonConfig, addonDates, item.tentCheckInDate, item.tentCheckOutDate, item.itemId, parameters]);

  const calculatedTotal = useMemo(() =>
    parameters.reduce(
      (sum, p) => {
        const mode = p.pricingMode || 'per_person';
        return sum + (mode === 'per_group' ? p.unitPrice : p.quantity * p.unitPrice);
      },
      0
    ),
    [parameters]
  );

  // Use override if set, otherwise use calculated
  const effectiveTotal = priceOverride !== null ? priceOverride : calculatedTotal;

  const finalTotal = useMemo(() => {
    const discount = voucher?.discountAmount || 0;
    return Math.max(0, effectiveTotal - discount);
  }, [effectiveTotal, voucher]);

  const updateParameterQuantity = (index: number, value: number) => {
    setParameters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: value };
      return updated;
    });
  };

  const handleVoucherApplied = (appliedVoucher: AppliedVoucher) => {
    setVoucher({
      code: appliedVoucher.code,
      id: appliedVoucher.id,
      discountAmount: appliedVoucher.discountAmount,
      discountType: appliedVoucher.discountType as 'percentage' | 'fixed',
      discountValue: appliedVoucher.discountValue,
    });
  };

  const handleVoucherRemoved = () => {
    setVoucher(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Extract selectedDate for inherit_parent mode (single date selection)
      const selectedDate = (datesSetting === 'inherit_parent' && addonDates?.from)
        ? addonDates.from
        : undefined;

      const res = await fetch(
        `/api/admin/glamping/bookings/${item.bookingId}/common-items`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: item.itemId,
            bookingTentId: item.bookingTentId,
            addonDates: addonDates || undefined,
            selectedDate: selectedDate,
            voucher: voucher,
            priceOverride: priceOverride,
            parameters: parameters.map(p => ({
              parameterId: p.parameterId,
              quantity: p.quantity,
            })),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      toast.success(t.saveSuccess);
      onSave();
    } catch (error: any) {
      console.error('Save common item failed:', error);
      toast.error(error.message || t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const datesSetting = addonConfig?.dates_setting || 'none';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t.title}: {item.itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Selection */}
          {loadingConfig ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              {datesSetting === 'inherit_parent' && item.tentCheckInDate && (
                <div>
                  <Label className="mb-2 block">{t.addonDate}</Label>
                  <input
                    type="date"
                    className="w-full text-sm border rounded px-3 py-2"
                    value={addonDates?.from || ''}
                    min={toDateStr(item.tentCheckInDate)}
                    max={addDaysLocal(toDateStr(item.tentCheckOutDate), -1)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setAddonDates({ from: val, to: addDaysLocal(val, 1) });
                      }
                    }}
                  />
                </div>
              )}

              {datesSetting === 'custom' && addonConfig && (
                <div className="space-y-2">
                  <div>
                    <Label className="mb-1 block">{t.addonDateFrom}</Label>
                    <input
                      type="date"
                      className="w-full text-sm border rounded px-3 py-2"
                      value={addonDates?.from || ''}
                      min={addonConfig.custom_start_date || undefined}
                      max={addonDates?.to || addonConfig.custom_end_date || undefined}
                      onChange={(e) => {
                        setAddonDates(prev => ({
                          from: e.target.value,
                          to: prev?.to || addonConfig.custom_end_date || e.target.value,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">{t.addonDateTo}</Label>
                    <input
                      type="date"
                      className="w-full text-sm border rounded px-3 py-2"
                      value={addonDates?.to || ''}
                      min={addonDates?.from || addonConfig.custom_start_date || undefined}
                      max={addonConfig.custom_end_date || undefined}
                      onChange={(e) => {
                        setAddonDates(prev => ({
                          from: prev?.from || addonConfig.custom_start_date || e.target.value,
                          to: e.target.value,
                        }));
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Parameters */}
          {parameters.length > 0 && (
            <div>
              <Label className="mb-2 block">{t.parameters}</Label>
              <div className="space-y-2">
                {parameters.map((param, idx) => {
                  const mode = param.pricingMode || 'per_person';
                  const isPerGroup = mode === 'per_group';
                  const rowTotal = isPerGroup ? param.unitPrice : param.quantity * param.unitPrice;
                  return (
                    <div key={`${param.parameterId}-${idx}`} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
                        {param.parameterName}
                      </span>
                      <div className="flex items-center gap-2">
                        {isPerGroup ? (
                          <span className="text-xs text-gray-400 w-16 text-center">-</span>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            value={param.quantity}
                            onChange={(e) => updateParameterQuantity(idx, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-sm text-center"
                          />
                        )}
                        {priceOverride === null && (
                          <>
                            <span className="text-xs text-gray-400">&times;</span>
                            <span className="text-sm text-gray-700 w-28 text-right tabular-nums flex items-center justify-end">
                              {pricingLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              ) : (
                                formatCurrency(param.unitPrice)
                              )}
                            </span>
                          </>
                        )}
                      </div>
                      {priceOverride === null && (
                        <span className="text-xs text-gray-500 w-24 text-right flex items-center justify-end">
                          = {pricingLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-1" />
                          ) : (
                            formatCurrency(rowTotal)
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtotal */}
          {calculatedTotal > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t.subtotal}</span>
                <span className="font-medium flex items-center gap-2">
                  {pricingLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{t.loadingPricing}</span>
                    </>
                  ) : (
                    formatCurrency(effectiveTotal)
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Price Override Section */}
          <div className="space-y-2">
            {!showPriceOverride ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPriceOverride(true);
                  setPriceOverride(calculatedTotal);
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.overrideTotal}
              </Button>
            ) : (
              <div className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {t.overrideTotal}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPriceOverride(false);
                      setPriceOverride(null);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <CurrencyInput
                  value={priceOverride || 0}
                  onValueChange={(val) => setPriceOverride(val || null)}
                  locale={locale}
                  placeholder={t.overrideHint}
                />

                <p className="text-xs text-muted-foreground">
                  {locale === 'vi' ? 'Để trống để tự tính' : 'Leave empty for auto-calc'}
                </p>
              </div>
            )}
          </div>

          {/* Voucher Input */}
          {effectiveTotal > 0 && (
            <div>
              <VoucherInput
                itemId={item.itemId}
                zoneId={item.zoneId || ''}
                totalAmount={effectiveTotal}
                applicationType="common_item"
                validationEndpoint="/api/glamping/validate-voucher"
                locale={locale}
                appliedVoucher={voucher ? {
                  id: voucher.id,
                  code: voucher.code,
                  name: '',
                  description: '',
                  discountType: voucher.discountType,
                  discountValue: voucher.discountValue,
                  discountAmount: voucher.discountAmount,
                  isStackable: false
                } : null}
                onVoucherApplied={handleVoucherApplied}
                onVoucherRemoved={handleVoucherRemoved}
              />
            </div>
          )}

          {/* Final Total */}
          {voucher && voucher.discountAmount > 0 && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-700">{t.total}</span>
                <span className="text-green-700">
                  {pricingLoading ? t.loadingPricing : formatCurrency(finalTotal)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving || pricingLoading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
