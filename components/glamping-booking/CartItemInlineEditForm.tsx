"use client";

import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Check, ChevronDown, ChevronUp, Edit2, Minus, Plus, Package, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useTranslations } from 'next-intl';
import { useClientLocale } from '@/components/providers/ClientI18nProvider';
import { cn, formatCurrency } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { GlampingDateRangePickerWithCalendar } from '@/components/admin/GlampingDateRangePickerWithCalendar';
import { GlampingMenuProductsSelector } from '@/components/glamping-booking/GlampingMenuProductsSelector';
import VoucherInput, { type AppliedVoucher } from '@/components/booking/VoucherInput';
import { useCartItemFormState } from '@/hooks/useCartItemFormState';
import { useMenuProductsData } from '@/hooks/useMenuProductsData';
import { useCartItemPricing } from '@/hooks/useCartItemPricing';
import { useCartItemSave, type AutoSaveStatus } from '@/hooks/useCartItemSave';
import { useGlampingParameters } from '@/hooks/useGlampingParameters';
import { useItemAddons, type ItemAddon } from '@/hooks/useItemAddons';
import type { GlampingCartItem, AddonSelection } from '@/components/providers/GlampingCartProvider';

interface CartItemInlineEditFormProps {
  item: GlampingCartItem;
  isOpen: boolean;
}

// Auto-save status indicator component
function AutoSaveIndicator({ status, t }: { status: AutoSaveStatus; t: (key: string) => string }) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{t('inlineEdit.saving')}</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Check className="h-3 w-3" />
        <span>{t('inlineEdit.saved')}</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600">
        <span>{t('inlineEdit.saveError')}</span>
      </div>
    );
  }

  return null;
}

export function CartItemInlineEditForm({
  item,
  isOpen
}: CartItemInlineEditFormProps) {
  const t = useTranslations('booking');
  const { locale } = useClientLocale();
  const [isBookingInfoExpanded, setIsBookingInfoExpanded] = useState(false);
  const [zoneSettings, setZoneSettings] = useState<{
    enableSinglePersonSurchargeAlert?: boolean;
    singlePersonSurchargeAlertText?: { vi: string; en: string };
  }>({});

  // Fetch zone settings for single person surcharge alert
  React.useEffect(() => {
    const fetchZoneSettings = async () => {
      if (!item.zoneId) return;
      try {
        const response = await fetch(`/api/glamping/zones/${item.zoneId}`);
        if (response.ok) {
          const data = await response.json();
          setZoneSettings({
            enableSinglePersonSurchargeAlert: data.zone?.enable_single_person_surcharge_alert || false,
            singlePersonSurchargeAlertText: data.zone?.single_person_surcharge_alert_text || { vi: 'Số tiền đã bao gồm phụ thu 1 người', en: 'Price includes single person surcharge' },
          });
        }
      } catch (error) {
        console.error('Error fetching zone settings:', error);
      }
    };
    fetchZoneSettings();
  }, [item.zoneId]);

  // Use custom hooks
  const formState = useCartItemFormState(item);
  // Fetch all available parameters for the item
  const { parameters, loading: parametersLoading } = useGlampingParameters(item.itemId);
  const { menuProducts, loading: menuLoading } = useMenuProductsData(item.itemId);
  const { addons, loading: addonsLoading } = useItemAddons(item.itemId);
  const { pricingData, pricingLoading } = useCartItemPricing({
    itemId: item.itemId,
    dateRange: formState.dateRange,
    parameterQuantities: formState.parameterQuantities,
    accommodationVoucher: formState.accommodationVoucher
  });
  const { isSaving, menuProductsTotal, menuDiscountAmount, autoSaveStatus } = useCartItemSave({
    cartItemId: item.id,
    item,
    formState: { ...formState, isDirty: formState.isDirty },
    pricingData,
    menuProductsData: menuProducts,
    parametersData: parameters,
    autoSave: true
  });

  // Calculate number of nights
  const nights = React.useMemo(() => {
    if (!formState.dateRange?.from || !formState.dateRange?.to) return 0;
    return differenceInDays(formState.dateRange.to, formState.dateRange.from);
  }, [formState.dateRange]);

  // Calculate accommodation cost locally (not from API totals which may have qty=0 bug)
  // This ensures qty=0 parameters contribute 0 to the total
  const calculatedAccommodationCost = React.useMemo(() => {
    if (!pricingData?.parameterPricing || !parameters || parameters.length === 0) {
      return pricingData?.totals?.accommodationCost || 0;
    }

    let total = 0;
    parameters.forEach((param) => {
      const paramId = param.id || param.parameter_id;
      const qty = formState.parameterQuantities[paramId] || 0;
      const pricePerUnitAllNights = pricingData.parameterPricing?.[paramId] || 0;
      const pricingMode = pricingData.parameterPricingModes?.[paramId] || 'per_person';
      const isPerGroup = pricingMode === 'per_group';

      // per_group: fixed price, per_person: price × quantity
      total += isPerGroup ? pricePerUnitAllNights : pricePerUnitAllNights * qty;
    });

    return total;
  }, [pricingData, parameters, formState.parameterQuantities]);

  // Calculate total counted guests from parameters
  const totalCountedGuests = React.useMemo(() => {
    if (!parameters || parameters.length === 0) return 0;

    return Object.entries(formState.parameterQuantities).reduce((total, [paramId, quantity]) => {
      const param = parameters.find(p => p.id === paramId || p.parameter_id === paramId);
      if (param && param.counted_for_menu) {
        return total + (quantity || 0);
      }
      return total;
    }, 0);
  }, [formState.parameterQuantities, parameters]);

  // Fix menu product prices from API data if they got corrupted in cart
  // This handles cases where old data saved with discounted prices instead of original prices
  React.useEffect(() => {
    if (!menuProducts || menuProducts.length === 0) return;
    if (Object.keys(formState.menuProducts).length === 0) return;

    let needsFix = false;
    const fixedMenuProducts = { ...formState.menuProducts };

    // Create a map of product prices from API
    const productPriceMap: Record<string, number> = {};
    menuProducts.forEach(product => {
      productPriceMap[product.id] = product.price;
    });

    // Check each night's selections and fix prices if needed
    Object.entries(fixedMenuProducts).forEach(([nightIndex, nightSelections]) => {
      if (!nightSelections) return;

      Object.entries(nightSelections).forEach(([productId, selection]) => {
        if (!selection) return;

        const correctPrice = productPriceMap[productId];
        if (correctPrice !== undefined && selection.price !== correctPrice) {
          // Price is wrong, fix it
          needsFix = true;
          (fixedMenuProducts as any)[nightIndex][productId] = {
            ...selection,
            price: correctPrice
          };
        }
      });
    });

    // Update form state if prices were fixed
    if (needsFix) {
      console.log('[CartItemInlineEditForm] Fixed corrupted menu product prices');
      formState.setMenuProducts(fixedMenuProducts);
    }
  }, [menuProducts, formState.menuProducts, formState.setMenuProducts]);

  // Addon pricing state: addonItemId -> { parameterPricing, parameterPricingModes, loading }
  const [addonPricingMap, setAddonPricingMap] = useState<Record<string, {
    parameterPricing: Record<string, number>;
    parameterPricingModes: Record<string, string>;
    loading: boolean;
  }>>({});

  // Fetch pricing for selected addons
  React.useEffect(() => {
    if (!addons || addons.length === 0) return;

    const selectedAddons = addons.filter(
      (a) => formState.addonSelections[a.addon_item_id]?.selected
    );

    if (selectedAddons.length === 0) {
      setAddonPricingMap({});
      return;
    }

    // Determine dates for each addon and fetch pricing
    const fetchAllAddonPricing = async () => {
      const newMap: typeof addonPricingMap = {};

      // Mark all as loading
      selectedAddons.forEach((addon) => {
        newMap[addon.addon_item_id] = {
          parameterPricing: {},
          parameterPricingModes: {},
          loading: true,
        };
      });
      setAddonPricingMap({ ...newMap });

      await Promise.all(
        selectedAddons.map(async (addon) => {
          const sel = formState.addonSelections[addon.addon_item_id];
          if (!sel) return;

          // Determine effective dates from the addon selection's dates
          const checkIn = sel.dates?.from;
          const checkOut = sel.dates?.to;

          if (!checkIn || !checkOut) {
            newMap[addon.addon_item_id] = {
              parameterPricing: {},
              parameterPricingModes: {},
              loading: false,
            };
            return;
          }

          try {
            const params = new URLSearchParams({
              itemId: addon.addon_item_id,
              checkIn,
              checkOut,
            });

            // Add parameter quantities
            Object.entries(sel.parameterQuantities).forEach(([paramId, qty]) => {
              if (qty > 0) {
                params.append(`param_${paramId}`, qty.toString());
              }
            });

            const response = await fetch(
              `/api/glamping/booking/calculate-pricing?${params}`
            );
            const data = await response.json();

            if (response.ok) {
              // Apply price_percentage
              const adjustedPricing: Record<string, number> = {};
              const pct = addon.price_percentage / 100;
              Object.entries(data.parameterPricing || {}).forEach(
                ([paramId, price]) => {
                  adjustedPricing[paramId] = (price as number) * pct;
                }
              );

              newMap[addon.addon_item_id] = {
                parameterPricing: adjustedPricing,
                parameterPricingModes: data.parameterPricingModes || {},
                loading: false,
              };
            } else {
              newMap[addon.addon_item_id] = {
                parameterPricing: {},
                parameterPricingModes: {},
                loading: false,
              };
            }
          } catch {
            newMap[addon.addon_item_id] = {
              parameterPricing: {},
              parameterPricingModes: {},
              loading: false,
            };
          }
        })
      );

      setAddonPricingMap({ ...newMap });
    };

    const timer = setTimeout(fetchAllAddonPricing, 600);
    return () => clearTimeout(timer);
  }, [addons, formState.addonSelections, formState.dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync computed addon pricing (totalPrice, addonName, parameterPricing) into addonSelections
  // This runs when addonPricingMap finishes loading, and writes back into selections
  React.useEffect(() => {
    if (!addons || addons.length === 0) return;

    // Only run when no addon pricing is still loading
    const anyLoading = Object.values(addonPricingMap).some(p => p.loading);
    if (anyLoading) return;

    const currentSelections = formState.addonSelections;
    let hasChanges = false;
    const updatedSelections = { ...currentSelections };

    for (const addon of addons) {
      const sel = currentSelections[addon.addon_item_id];
      if (!sel || !sel.selected) continue;

      const addonPricing = addonPricingMap[addon.addon_item_id];
      if (!addonPricing) continue;

      // Compute totalPrice and parameterPricing
      let computedTotal = 0;
      const computedParamPricing: Record<string, { unitPrice: number; pricingMode: string; paramName: string }> = {};

      addon.parameters.forEach((param) => {
        const qty = sel.parameterQuantities[param.id] || 0;
        const unitPrice = addonPricing.parameterPricing[param.id] || 0;
        const pricingMode = addonPricing.parameterPricingModes[param.id] || 'per_person';
        const isPerGroup = pricingMode === 'per_group';
        const paramTotal = isPerGroup ? unitPrice : unitPrice * qty;
        computedTotal += paramTotal;

        computedParamPricing[param.id] = {
          unitPrice,
          pricingMode,
          paramName: getParamName(param),
        };
      });

      const addonName = getParamName(addon);

      // Only update if values actually changed (avoid infinite loop)
      if (
        sel.totalPrice !== computedTotal ||
        sel.addonName !== addonName ||
        JSON.stringify(sel.parameterPricing) !== JSON.stringify(computedParamPricing)
      ) {
        updatedSelections[addon.addon_item_id] = {
          ...sel,
          totalPrice: computedTotal,
          addonName,
          parameterPricing: computedParamPricing,
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      formState.setAddonSelections(updatedSelections);
    }
  }, [addonPricingMap, addons]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: build default dates for an addon based on its dates_setting and parent range
  // For inherit_parent: user picks a single date within parent range.
  // Pricing is calculated for 1 night: [selectedDate, selectedDate+1].
  const getDefaultAddonDates = useCallback((addon: ItemAddon): { from: string; to: string } | undefined => {
    if (addon.dates_setting === 'inherit_parent') {
      if (formState.dateRange?.from) {
        const fromStr = format(formState.dateRange.from, 'yyyy-MM-dd');
        const nextDay = new Date(formState.dateRange.from);
        nextDay.setDate(nextDay.getDate() + 1);
        return { from: fromStr, to: format(nextDay, 'yyyy-MM-dd') };
      }
    } else if (addon.dates_setting === 'custom') {
      if (addon.custom_start_date && addon.custom_end_date) {
        return { from: addon.custom_start_date, to: addon.custom_end_date };
      }
    }
    return undefined;
  }, [formState.dateRange]);

  // Initialize addon selections for required addons
  React.useEffect(() => {
    if (!addons || addons.length === 0) return;
    const currentSelections = { ...formState.addonSelections };
    let hasChanges = false;

    addons.forEach((addon) => {
      if (!currentSelections[addon.addon_item_id]) {
        // Initialize: auto-select required addons, default quantity=1
        if (addon.is_required) {
          const defaultParamQtys: Record<string, number> = {};
          addon.parameters.forEach((p) => {
            defaultParamQtys[p.id] = p.min_quantity || 0;
          });
          currentSelections[addon.addon_item_id] = {
            addonItemId: addon.addon_item_id,
            selected: true,
            quantity: 1,
            parameterQuantities: defaultParamQtys,
            dates: getDefaultAddonDates(addon),
          };
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      formState.setAddonSelections(currentSelections);
    }
  }, [addons, getDefaultAddonDates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Addon selection handlers
  const handleAddonToggle = useCallback((addonItemId: string, selected: boolean, addon: ItemAddon) => {
    const current = { ...formState.addonSelections };
    if (selected) {
      const defaultParamQtys: Record<string, number> = {};
      addon.parameters.forEach((p) => {
        defaultParamQtys[p.id] = p.min_quantity || 0;
      });
      current[addonItemId] = {
        addonItemId,
        selected: true,
        quantity: 1,
        parameterQuantities: defaultParamQtys,
        dates: getDefaultAddonDates(addon),
      };
    } else {
      delete current[addonItemId];
    }
    formState.setAddonSelections(current);
  }, [formState, getDefaultAddonDates]);

  const handleAddonParamQtyChange = useCallback((addonItemId: string, paramId: string, delta: number, addon: ItemAddon) => {
    const current = { ...formState.addonSelections };
    const sel = current[addonItemId];
    if (!sel) return;

    const param = addon.parameters.find(p => p.id === paramId);
    const min = param?.min_quantity || 0;
    const max = param?.max_quantity || 99;
    const currentQty = sel.parameterQuantities[paramId] || 0;
    const newQty = Math.max(min, Math.min(max, currentQty + delta));

    current[addonItemId] = {
      ...sel,
      parameterQuantities: {
        ...sel.parameterQuantities,
        [paramId]: newQty,
      },
    };
    formState.setAddonSelections(current);
  }, [formState]);

  // Single-date change for inherit_parent: sets from=date, to=date+1
  const handleAddonSingleDateChange = useCallback((addonItemId: string, value: string) => {
    const current = { ...formState.addonSelections };
    const sel = current[addonItemId];
    if (!sel) return;

    const nextDay = new Date(value);
    nextDay.setDate(nextDay.getDate() + 1);

    current[addonItemId] = {
      ...sel,
      dates: { from: value, to: format(nextDay, 'yyyy-MM-dd') },
    };
    formState.setAddonSelections(current);
  }, [formState]);

  // Range date change for custom dates (from/to independently)
  const handleAddonDateChange = useCallback((addonItemId: string, field: 'from' | 'to', value: string) => {
    const current = { ...formState.addonSelections };
    const sel = current[addonItemId];
    if (!sel) return;

    const currentDates = sel.dates || { from: '', to: '' };
    current[addonItemId] = {
      ...sel,
      dates: {
        ...currentDates,
        [field]: value,
      },
    };
    formState.setAddonSelections(current);
  }, [formState]);

  // Addon voucher handlers
  const handleAddonVoucherApplied = useCallback((addonItemId: string, voucher: AppliedVoucher) => {
    const current = { ...formState.addonSelections };
    const sel = current[addonItemId];
    if (!sel) return;

    current[addonItemId] = {
      ...sel,
      voucher: {
        code: voucher.code,
        id: voucher.id,
        discountAmount: voucher.discountAmount,
        discountType: voucher.discountType as 'percentage' | 'fixed',
        discountValue: voucher.discountValue,
      },
    };
    formState.setAddonSelections(current);
  }, [formState]);

  const handleAddonVoucherRemoved = useCallback((addonItemId: string) => {
    const current = { ...formState.addonSelections };
    const sel = current[addonItemId];
    if (!sel) return;

    current[addonItemId] = {
      ...sel,
      voucher: null,
    };
    formState.setAddonSelections(current);
  }, [formState]);

  // Compute addon totals for pricing preview display
  const { addonsTotalCost, addonsDiscountAmount } = React.useMemo(() => {
    let totalCost = 0;
    let totalDiscount = 0;
    Object.values(formState.addonSelections).forEach((sel) => {
      if (!sel || !sel.selected) return;
      totalCost += sel.totalPrice || 0;
      totalDiscount += sel.voucher?.discountAmount || 0;
    });
    return { addonsTotalCost: totalCost, addonsDiscountAmount: totalDiscount };
  }, [formState.addonSelections]);

  if (!isOpen) {
    return null;
  }

  // Format date for display
  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) return '--';
    return format(date, 'dd/MM/yyyy', { locale: vi });
  };

  // Get parameter name helper (locale-aware)
  const getParamName = (param: any) => {
    if (!param) return '';
    if (typeof param.name === 'object' && param.name !== null) {
      return param.name[locale] || param.name.vi || param.name.en || '';
    }
    return param.name || '';
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 mt-4">
      <div className="flex items-center justify-between">
        <AutoSaveIndicator status={autoSaveStatus} t={t} />
      </div>

      {/* Booking Info Section - Collapsible */}
      <div className={cn(
        "bg-white rounded-lg border border-gray-200 relative",
        isBookingInfoExpanded ? "overflow-hidden" : "overflow-visible pb-5 mb-4"
      )}>
        {/* Summary Header - Always visible */}
        <div
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsBookingInfoExpanded(!isBookingInfoExpanded)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-gray-800">{t('inlineEdit.bookingInfo')}</h4>
                <Badge variant="secondary" className="text-xs">
                  {nights} {t('inlineEdit.nights')}
                </Badge>
              </div>

              {/* Dates */}
              <div className="text-sm text-gray-600 mb-2">
                <span>Check-in: </span>
                <strong>{formatDisplayDate(formState.dateRange?.from)}</strong>
                <span className="mx-2">→</span>
                <span>Check-out: </span>
                <strong>{formatDisplayDate(formState.dateRange?.to)}</strong>
              </div>

              {/* Parameters Summary */}
              {parameters && parameters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parameters.map((param) => {
                    const quantity = formState.parameterQuantities[param.id] || formState.parameterQuantities[param.parameter_id] || 0;
                    if (quantity === 0) return null;

                    return (
                      <Badge
                        key={param.id || param.parameter_id}
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: param.color_code || undefined,
                          color: param.color_code || undefined
                        }}
                      >
                        {getParamName(param)}: {quantity}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Accommodation Price */}
              {calculatedAccommodationCost > 0 && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">{t('inlineEdit.tentCost')}: </span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(calculatedAccommodationCost)}
                  </span>
                </div>
              )}
            </div>

            {/* Close Button - Only when expanded */}
            {isBookingInfoExpanded && (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="flex-shrink-0"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                {t('inlineEdit.close')}
                <ChevronUp className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* CTA Button - Only when collapsed, overlapping bottom edge */}
        {!isBookingInfoExpanded && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
            <Button
              type="button"
              variant="default"
              size="lg"
              className="shadow-lg whitespace-nowrap px-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsBookingInfoExpanded(true);
              }}
            >
              <MousePointerClick className="h-4 w-4 mr-2 animate-bounce" />
              {t('inlineEdit.clickToEdit')}
            </Button>
          </div>
        )}

        {/* Collapsible Content - Date Picker & Parameters */}
        <Collapsible open={isBookingInfoExpanded}>
          <CollapsibleContent>
            <div className="p-4 pt-0 border-t border-gray-200">
              <GlampingDateRangePickerWithCalendar
                itemId={item.itemId}
                dateRange={formState.dateRange}
                onDateRangeChange={formState.setDateRange}
                locale="vi"
                parameters={parameters}
                parameterQuantities={formState.parameterQuantities}
                onQuantitiesChange={formState.setParameterQuantities}
                loadingParameters={parametersLoading}
                overrideParameterPricing={pricingData?.parameterPricing}
                overrideParameterPricingModes={pricingData?.parameterPricingModes}
                overrideNightlyPricing={pricingData?.nightlyPricing}
                pricingLoading={pricingLoading || (formState.dateRange?.from && formState.dateRange?.to && !pricingData)}
                enableSinglePersonSurchargeAlert={zoneSettings.enableSinglePersonSurchargeAlert}
                singlePersonSurchargeAlertText={zoneSettings.singlePersonSurchargeAlertText}
              />
            </div>

            {/* Menu Products */}
            {menuLoading ? (
              <div className="flex items-center justify-center py-4 border-t border-gray-200 mx-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">{t('inlineEdit.loadingFood')}</span>
              </div>
            ) : menuProducts.length > 0 ? (
              <div className="p-4 border-t border-gray-200">
                <GlampingMenuProductsSelector
                  menuProducts={menuProducts}
                  nightlySelections={formState.menuProducts}
                  onChange={formState.setMenuProducts}
                  locale="vi"
                  totalCountedGuests={totalCountedGuests}
                  nights={nights}
                  checkInDate={formState.dateRange?.from}
                />
              </div>
            ) : null}

            {/* Add-ons (Common Items) */}
            {addonsLoading ? (
              <div className="flex items-center justify-center py-4 border-t border-gray-200 mx-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">{t('inlineEdit.loadingAddons')}</span>
              </div>
            ) : addons.length > 0 ? (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-purple-600" />
                  <h5 className="font-semibold text-sm text-gray-800">{t('inlineEdit.addons')}</h5>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {addons.map((addon) => {
                    const selection = formState.addonSelections[addon.addon_item_id];
                    const isSelected = selection?.selected || false;

                    return (
                      <div
                        key={addon.addon_item_id}
                        className={`rounded-lg border p-3 transition-colors ${
                          isSelected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        {/* Addon Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getParamName(addon)}</span>
                            {addon.is_required && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                {t('inlineEdit.required')}
                              </Badge>
                            )}
                            {addon.price_percentage < 100 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {t('inlineEdit.pricePercent', { percent: addon.price_percentage })}
                              </Badge>
                            )}
                          </div>
                          {!addon.is_required && (
                            <Switch
                              checked={isSelected}
                              onCheckedChange={(checked) => handleAddonToggle(addon.addon_item_id, checked, addon)}
                            />
                          )}
                        </div>

                        {/* Addon Date - single date picker within parent range */}
                        {isSelected && addon.dates_setting === 'inherit_parent' && formState.dateRange?.from && formState.dateRange?.to && (() => {
                          const parentFrom = format(formState.dateRange.from!, 'yyyy-MM-dd');
                          // Max selectable = checkout - 1 day (last bookable night)
                          const lastNight = new Date(formState.dateRange.to!);
                          lastNight.setDate(lastNight.getDate() - 1);
                          const parentMaxDate = format(lastNight, 'yyyy-MM-dd');

                          return (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-600 shrink-0">{t('inlineEdit.date')}</span>
                              <input
                                type="date"
                                className="w-32 text-xs border rounded px-2 py-1"
                                value={selection?.dates?.from || parentFrom}
                                min={parentFrom}
                                max={parentMaxDate}
                                onChange={(e) => handleAddonSingleDateChange(addon.addon_item_id, e.target.value)}
                              />
                            </div>
                          );
                        })()}

                        {isSelected && addon.dates_setting === 'custom' && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 shrink-0">{t('inlineEdit.fromDate')}</span>
                              <input
                                type="date"
                                className="w-32 text-xs border rounded px-2 py-1"
                                value={selection?.dates?.from || ''}
                                min={addon.custom_start_date || undefined}
                                max={selection?.dates?.to || addon.custom_end_date || undefined}
                                onChange={(e) => handleAddonDateChange(addon.addon_item_id, 'from', e.target.value)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 shrink-0">{t('inlineEdit.toDate')}</span>
                              <input
                                type="date"
                                className="w-32 text-xs border rounded px-2 py-1"
                                value={selection?.dates?.to || ''}
                                min={selection?.dates?.from || addon.custom_start_date || undefined}
                                max={addon.custom_end_date || undefined}
                                onChange={(e) => handleAddonDateChange(addon.addon_item_id, 'to', e.target.value)}
                              />
                            </div>
                            {addon.custom_start_date && addon.custom_end_date && (
                              <p className="text-[10px] text-gray-400">
                                {t('inlineEdit.dateRange', { from: format(new Date(addon.custom_start_date), 'dd/MM/yyyy'), to: format(new Date(addon.custom_end_date), 'dd/MM/yyyy') })}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Addon Parameters - shown when selected */}
                        {isSelected && addon.parameters.length > 0 && (() => {
                          const addonPricing = addonPricingMap[addon.addon_item_id];
                          return (
                            <div className="space-y-2 mt-2">
                              {addon.parameters.map((param) => {
                                const qty = selection?.parameterQuantities[param.id] || 0;
                                const paramPrice = addonPricing?.parameterPricing[param.id];
                                const pricingMode = addonPricing?.parameterPricingModes[param.id] || 'per_person';
                                const isPerGroup = pricingMode === 'per_group';
                                const paramTotal = paramPrice != null
                                  ? (isPerGroup ? paramPrice : paramPrice * qty)
                                  : null;

                                return (
                                  <div key={param.id}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-xs text-gray-600">
                                          {getParamName(param)}
                                        </span>
                                        {addonPricing?.loading ? (
                                          <div><Loader2 className="h-3 w-3 animate-spin text-gray-400" /></div>
                                        ) : paramPrice != null && paramPrice > 0 ? (
                                          <div className="text-xs text-gray-500">
                                            {formatCurrency(paramPrice)}/{isPerGroup ? t('inlineEdit.perGroup') : t('inlineEdit.perPerson')}
                                          </div>
                                        ) : null}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => handleAddonParamQtyChange(addon.addon_item_id, param.id, -1, addon)}
                                          disabled={qty <= (param.min_quantity || 0)}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-sm font-medium w-6 text-center">{qty}</span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => handleAddonParamQtyChange(addon.addon_item_id, param.id, 1, addon)}
                                          disabled={qty >= (param.max_quantity || 99)}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Addon total & voucher */}
                              {!addonPricing?.loading && (() => {
                                let addonTotal = 0;
                                addon.parameters.forEach((param) => {
                                  const qty = selection?.parameterQuantities[param.id] || 0;
                                  const price = addonPricing?.parameterPricing[param.id] || 0;
                                  const mode = addonPricing?.parameterPricingModes[param.id] || 'per_person';
                                  addonTotal += mode === 'per_group' ? price : price * qty;
                                });
                                const voucherDiscount = selection?.voucher?.discountAmount || 0;
                                const addonFinalTotal = Math.max(0, addonTotal - voucherDiscount);
                                return (
                                  <>
                                    {addonTotal > 0 && (
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-purple-200">
                                        <span className="text-xs text-gray-600">{t('inlineEdit.serviceTotal')}</span>
                                        <span className="text-sm font-semibold text-purple-700">
                                          {formatCurrency(addonTotal)}
                                        </span>
                                      </div>
                                    )}

                                    {/* Voucher input for addon */}
                                    {addonTotal > 0 && (
                                      <div className="mt-2">
                                        <VoucherInput
                                          itemId={addon.addon_item_id}
                                          zoneId={item.zoneId}
                                          totalAmount={addonTotal}
                                          applicationType="common_item"
                                          validationEndpoint="/api/glamping/validate-voucher"
                                          locale={locale}
                                          appliedVoucher={selection?.voucher ? {
                                            id: selection.voucher.id,
                                            code: selection.voucher.code,
                                            name: '',
                                            description: '',
                                            discountType: selection.voucher.discountType,
                                            discountValue: selection.voucher.discountValue,
                                            discountAmount: selection.voucher.discountAmount,
                                            isStackable: false
                                          } : null}
                                          onVoucherApplied={(voucher) => handleAddonVoucherApplied(addon.addon_item_id, voucher)}
                                          onVoucherRemoved={() => handleAddonVoucherRemoved(addon.addon_item_id)}
                                        />
                                      </div>
                                    )}

                                    {/* Final total after voucher */}
                                    {voucherDiscount > 0 && addonTotal > 0 && (
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-purple-200">
                                        <span className="text-xs font-semibold text-gray-700">{t('inlineEdit.grandTotal')}</span>
                                        <span className="text-sm font-bold text-purple-700">
                                          {formatCurrency(addonFinalTotal)}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Accommodation Voucher */}
      <div>
        <VoucherInput
          zoneId={item.zoneId}
          itemId={item.itemId}
          checkIn={formState.dateRange?.from ? format(formState.dateRange.from, 'yyyy-MM-dd') : undefined}
          checkOut={formState.dateRange?.to ? format(formState.dateRange.to, 'yyyy-MM-dd') : undefined}
          totalAmount={calculatedAccommodationCost}
          applicationType="accommodation"
          appliedVoucher={formState.accommodationVoucher}
          onVoucherApplied={formState.setAccommodationVoucher}
          onVoucherRemoved={() => formState.setAccommodationVoucher(null)}
          validationEndpoint="/api/glamping/validate-voucher"
          locale="vi"
        />
      </div>

      {/* Pricing Preview */}
      <Card className="bg-white border-blue-200">
        <CardContent className="pt-6">
          {pricingLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">{t('inlineEdit.calculatingPrice')}</span>
            </div>
          ) : pricingData ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('inlineEdit.tentCost')}</span>
                <span className="font-semibold">
                  {formatCurrency(calculatedAccommodationCost)}
                </span>
              </div>

              {formState.accommodationVoucher && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>- {t('inlineEdit.tentVoucher', { code: formState.accommodationVoucher.code })}</span>
                  <span>-{formatCurrency(formState.accommodationVoucher.discountAmount)}</span>
                </div>
              )}

              {menuProductsTotal > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>{t('inlineEdit.food')}</span>
                    <span className="font-semibold">
                      {formatCurrency(menuProductsTotal)}
                    </span>
                  </div>
                  {menuDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>- {t('inlineEdit.foodVoucher')}</span>
                      <span>-{formatCurrency(menuDiscountAmount)}</span>
                    </div>
                  )}
                </>
              )}

              {addonsTotalCost > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>{t('inlineEdit.addons')}</span>
                    <span className="font-semibold">
                      {formatCurrency(addonsTotalCost)}
                    </span>
                  </div>
                  {addonsDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>- {t('inlineEdit.addonVoucher')}</span>
                      <span>-{formatCurrency(addonsDiscountAmount)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>{t('inlineEdit.grandTotal')}</span>
                <span className="text-blue-600">
                  {formatCurrency(
                    calculatedAccommodationCost -
                    (formState.accommodationVoucher?.discountAmount || 0) +
                    menuProductsTotal -
                    menuDiscountAmount +
                    addonsTotalCost -
                    addonsDiscountAmount
                  )}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">{t('inlineEdit.selectDatesToSeePrice')}</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
