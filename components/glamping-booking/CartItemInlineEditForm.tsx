"use client";

import React, { useState, useCallback, useMemo } from 'react';
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

  // Child pricing state: childItemId -> { parameterPricing, parameterPricingModes, loading }
  const [childPricingMap, setChildPricingMap] = useState<Record<string, {
    parameterPricing: Record<string, number>;
    parameterPricingModes: Record<string, string>;
    loading: boolean;
  }>>({});

  // Use ref flag to prevent circular dependency between pricing fetch and sync effects.
  // Without this, syncing pricing back into addonSelections triggers another fetch.
  const isSyncingPricingRef = React.useRef(false);

  // Track previous addon selections to detect which addon changed
  const prevAddonSelectionsRef = React.useRef(formState.addonSelections);

  // Fetch pricing for selected addons
  React.useEffect(() => {
    // Skip API call if this addonSelections update is from pricing sync (not user action).
    // This breaks the circular dependency: fetch → sync → fetch → sync → ...
    if (isSyncingPricingRef.current) {
      isSyncingPricingRef.current = false;
      return;
    }

    if (!addons || addons.length === 0) return;

    const selectedAddons = addons.filter(
      (a) => formState.addonSelections[a.addon_item_id]?.selected
    );

    if (selectedAddons.length === 0) {
      setAddonPricingMap({});
      prevAddonSelectionsRef.current = formState.addonSelections;
      return;
    }

    // Detect which addons changed (quantities or dates changed)
    const changedAddonIds: string[] = [];
    const currentSelections = formState.addonSelections;
    const prevSelections = prevAddonSelectionsRef.current;

    selectedAddons.forEach((addon) => {
      const curr = currentSelections[addon.addon_item_id];
      const prev = prevSelections?.[addon.addon_item_id];

      // Check if addon was just selected or quantities/dates changed
      if (!prev ||
          JSON.stringify(curr?.parameterQuantities) !== JSON.stringify(prev?.parameterQuantities) ||
          JSON.stringify(curr?.dates) !== JSON.stringify(prev?.dates)) {
        changedAddonIds.push(addon.addon_item_id);
      }
    });

    // Check if any addons were deselected and need to be removed from pricing map
    const selectedAddonIds = new Set(selectedAddons.map(a => a.addon_item_id));
    const deselectedAddonIds = Object.keys(addonPricingMap).filter(id => !selectedAddonIds.has(id));

    // If addons were deselected, clean up their pricing
    if (deselectedAddonIds.length > 0) {
      const cleanedMap = { ...addonPricingMap };
      deselectedAddonIds.forEach(id => delete cleanedMap[id]);
      setAddonPricingMap(cleanedMap);
      prevAddonSelectionsRef.current = currentSelections;
      if (changedAddonIds.length === 0) return;
    }

    // If nothing changed, skip fetch
    if (changedAddonIds.length === 0) {
      return;
    }

    // Only fetch addons that changed
    const addonsToFetch = addons.filter(a => changedAddonIds.includes(a.addon_item_id));

    // Update ref immediately to prevent re-fetching same changes
    prevAddonSelectionsRef.current = currentSelections;

    // Determine dates for each addon and fetch pricing
    const fetchChangedAddonPricing = async () => {
      // Preserve existing pricing for addons that didn't change
      const newMap: typeof addonPricingMap = { ...addonPricingMap };

      // Mark only changed addons as loading (ensure full structure)
      addonsToFetch.forEach((addon) => {
        newMap[addon.addon_item_id] = {
          parameterPricing: newMap[addon.addon_item_id]?.parameterPricing || {},
          parameterPricingModes: newMap[addon.addon_item_id]?.parameterPricingModes || {},
          loading: true,
        };
      });
      setAddonPricingMap({ ...newMap });

      await Promise.all(
        addonsToFetch.map(async (addon) => {
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

    const timer = setTimeout(fetchChangedAddonPricing, 800);
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
      isSyncingPricingRef.current = true;  // Set flag before update
      formState.setAddonSelections(updatedSelections);
    }
  }, [addonPricingMap, addons]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup effect to reset flag after render cycle
  React.useEffect(() => {
    isSyncingPricingRef.current = false;
  }, [formState.addonSelections]);

  // Track previous child selections to detect changes
  const prevChildSelectionsRef = React.useRef<string>('');

  // Fetch pricing for selected product group children
  // NOTE: Does NOT check isSyncingPricingRef because that flag is for the regular addon
  // pricing fetch cycle. Child pricing has its own fingerprint-based dedup.
  React.useEffect(() => {
    if (!addons || addons.length === 0) return;

    // Collect all selected children from product group parents
    const childrenToFetch: Array<{
      addonItemId: string;
      childItemId: string;
      parameterQuantities: Record<string, number>;
      pricePercentage: number;
      dates?: { from: string; to: string };
    }> = [];

    addons.forEach((addon) => {
      if (!addon.is_product_group_parent) return;
      const sel = formState.addonSelections[addon.addon_item_id];
      if (!sel?.selected || !sel.selectedChildren) return;

      Object.entries(sel.selectedChildren).forEach(([childId, childData]) => {
        if (!childData) return;
        // Determine dates: use child dates, addon dates, or parent tent dates
        const effectiveDates = childData.dates || sel.dates || (formState.dateRange?.from && formState.dateRange?.to
          ? { from: format(formState.dateRange.from, 'yyyy-MM-dd'), to: format(formState.dateRange.to, 'yyyy-MM-dd') }
          : undefined);

        childrenToFetch.push({
          addonItemId: addon.addon_item_id,
          childItemId: childId,
          parameterQuantities: childData.parameterQuantities,
          pricePercentage: addon.price_percentage,
          dates: effectiveDates,
        });
      });
    });

    // Build a fingerprint to detect changes
    const fingerprint = JSON.stringify(childrenToFetch.map(c => ({
      id: c.childItemId,
      pq: c.parameterQuantities,
      d: c.dates,
    })));

    // Also check if any child is missing pricing data (e.g. timer was cancelled by
    // a re-render before the fetch could complete). If so, force re-fetch.
    const anyMissingPricing = childrenToFetch.some(
      c => !childPricingMap[c.childItemId]
    );

    if (fingerprint === prevChildSelectionsRef.current && !anyMissingPricing) return;
    prevChildSelectionsRef.current = fingerprint;

    if (childrenToFetch.length === 0) {
      setChildPricingMap({});
      return;
    }

    const fetchChildPricing = async () => {
      const newMap: typeof childPricingMap = {};

      // Mark all as loading
      childrenToFetch.forEach((child) => {
        newMap[child.childItemId] = {
          parameterPricing: {},
          parameterPricingModes: {},
          loading: true,
        };
      });
      setChildPricingMap({ ...newMap });

      await Promise.all(
        childrenToFetch.map(async (child) => {
          if (!child.dates?.from || !child.dates?.to) {
            newMap[child.childItemId] = {
              parameterPricing: {},
              parameterPricingModes: {},
              loading: false,
            };
            return;
          }

          try {
            const params = new URLSearchParams({
              itemId: child.childItemId,
              checkIn: child.dates.from,
              checkOut: child.dates.to,
            });

            Object.entries(child.parameterQuantities).forEach(([paramId, qty]) => {
              if (qty > 0) {
                params.append(`param_${paramId}`, qty.toString());
              }
            });

            const response = await fetch(
              `/api/glamping/booking/calculate-pricing?${params}`
            );
            const data = await response.json();

            if (response.ok) {
              // Apply price_percentage from parent addon
              const adjustedPricing: Record<string, number> = {};
              const pct = child.pricePercentage / 100;
              Object.entries(data.parameterPricing || {}).forEach(
                ([paramId, price]) => {
                  adjustedPricing[paramId] = (price as number) * pct;
                }
              );

              newMap[child.childItemId] = {
                parameterPricing: adjustedPricing,
                parameterPricingModes: data.parameterPricingModes || {},
                loading: false,
              };
            } else {
              newMap[child.childItemId] = {
                parameterPricing: {},
                parameterPricingModes: {},
                loading: false,
              };
            }
          } catch {
            newMap[child.childItemId] = {
              parameterPricing: {},
              parameterPricingModes: {},
              loading: false,
            };
          }
        })
      );

      setChildPricingMap({ ...newMap });
    };

    const timer = setTimeout(fetchChildPricing, 800);
    return () => clearTimeout(timer);
  }, [addons, formState.addonSelections, formState.dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync child pricing into addonSelections (totalPrice, parameterPricing for children)
  React.useEffect(() => {
    if (!addons || addons.length === 0) return;

    // Only run when no child pricing is still loading
    const anyLoading = Object.values(childPricingMap).some(p => p.loading);
    if (anyLoading) return;
    if (Object.keys(childPricingMap).length === 0) return;

    const currentSelections = formState.addonSelections;
    let hasChanges = false;
    const updatedSelections = { ...currentSelections };

    for (const addon of addons) {
      if (!addon.is_product_group_parent) continue;
      const sel = currentSelections[addon.addon_item_id];
      if (!sel?.selected || !sel.selectedChildren) continue;

      let parentTotal = 0;
      const updatedChildren = { ...sel.selectedChildren };

      for (const [childId, childData] of Object.entries(sel.selectedChildren)) {
        if (!childData) continue;
        const childPricing = childPricingMap[childId];
        if (!childPricing) continue;

        // Find the child's parameters from the addon
        const childDef = addon.product_group_children?.find(c => c.child_item_id === childId);
        if (!childDef) continue;

        // Compute child total
        let childTotal = 0;
        const computedParamPricing: Record<string, { unitPrice: number; pricingMode: string; paramName: string }> = {};

        childDef.parameters.forEach((param) => {
          const qty = childData.parameterQuantities[param.id] || 0;
          const unitPrice = childPricing.parameterPricing[param.id] || 0;
          const pricingMode = childPricing.parameterPricingModes[param.id] || 'per_person';
          const isPerGroup = pricingMode === 'per_group';
          childTotal += isPerGroup ? unitPrice : unitPrice * qty;

          computedParamPricing[param.id] = {
            unitPrice,
            pricingMode,
            paramName: getParamName(param),
          };
        });

        // Only update if values changed
        if (
          childData.totalPrice !== childTotal ||
          JSON.stringify(childData.parameterPricing) !== JSON.stringify(computedParamPricing)
        ) {
          updatedChildren[childId] = {
            ...childData,
            totalPrice: childTotal,
            parameterPricing: computedParamPricing,
          };
          hasChanges = true;
        }

        // Apply voucher discount for parent total calculation
        const voucherDiscount = childData.voucher?.discountAmount || 0;
        parentTotal += Math.max(0, (updatedChildren[childId].totalPrice || childTotal) - voucherDiscount);
      }

      // Update parent addon total
      if (hasChanges || sel.totalPrice !== parentTotal) {
        updatedSelections[addon.addon_item_id] = {
          ...sel,
          selectedChildren: updatedChildren,
          totalPrice: parentTotal,
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      isSyncingPricingRef.current = true;
      formState.setAddonSelections(updatedSelections);
    }
  }, [childPricingMap, addons]); // eslint-disable-line react-hooks/exhaustive-deps

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
      selectedDate: value, // Store the original single date selected by customer
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

  // Child voucher handlers (for product group children)
  const handleChildVoucherApplied = useCallback((addonItemId: string, childItemId: string, voucher: AppliedVoucher) => {
    const current = { ...formState.addonSelections };
    const sel = current[addonItemId];
    if (!sel?.selectedChildren?.[childItemId]) return;

    current[addonItemId] = {
      ...sel,
      selectedChildren: {
        ...sel.selectedChildren,
        [childItemId]: {
          ...sel.selectedChildren[childItemId],
          voucher: {
            code: voucher.code,
            id: voucher.id,
            discountAmount: voucher.discountAmount,
            discountType: voucher.discountType as 'percentage' | 'fixed',
            discountValue: voucher.discountValue,
          },
        },
      },
    };
    formState.setAddonSelections(current);
  }, [formState]);

  const handleChildVoucherRemoved = useCallback((addonItemId: string, childItemId: string) => {
    const current = { ...formState.addonSelections };
    const sel = current[addonItemId];
    if (!sel?.selectedChildren?.[childItemId]) return;

    current[addonItemId] = {
      ...sel,
      selectedChildren: {
        ...sel.selectedChildren,
        [childItemId]: {
          ...sel.selectedChildren[childItemId],
          voucher: null,
        },
      },
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
      // For regular addons, voucher is on the addon itself
      totalDiscount += sel.voucher?.discountAmount || 0;
      // For product group parents, vouchers are on child items
      if (sel.isProductGroupParent && sel.selectedChildren) {
        Object.values(sel.selectedChildren).forEach((child) => {
          totalDiscount += child?.voucher?.discountAmount || 0;
        });
      }
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

                        {/* Addon Date - single date picker within parent range (hidden for product group parents) */}
                        {isSelected && !addon.is_product_group_parent && addon.dates_setting === 'inherit_parent' && formState.dateRange?.from && formState.dateRange?.to && (() => {
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

                        {isSelected && !addon.is_product_group_parent && addon.dates_setting === 'custom' && (
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

                        {/* Product Group Parent - single dropdown child selection */}
                        {isSelected && addon.is_product_group_parent && addon.product_group_children && (() => {
                          const selectedChildIds = Object.keys(selection?.selectedChildren || {});
                          const selectedChildId = selectedChildIds.length > 0 ? selectedChildIds[0] : '';
                          const selectedChild = selectedChildId
                            ? addon.product_group_children.find(c => c.child_item_id === selectedChildId)
                            : null;
                          const childSelected = selectedChild ? selection?.selectedChildren?.[selectedChildId] : null;

                          return (
                            <div className="space-y-3 mt-2">
                              {/* Dropdown to select ONE child */}
                              <select
                                className={cn(
                                  "w-full text-xs rounded-md border px-2 py-1.5 pr-6 font-medium transition-all cursor-pointer truncate",
                                  "bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-300",
                                  selectedChildId
                                    ? "border-purple-400 text-purple-800"
                                    : "border-gray-200 text-gray-500"
                                )}
                                value={selectedChildId}
                                onChange={(e) => {
                                  const updatedSelections = { ...formState.addonSelections };
                                  const addonSel = { ...updatedSelections[addon.addon_item_id] };

                                  if (!e.target.value) {
                                    // Clear all children
                                    addonSel.selectedChildren = {};
                                  } else {
                                    // Select only the chosen child
                                    const child = addon.product_group_children!.find(c => c.child_item_id === e.target.value);
                                    if (child) {
                                      const paramQtys: Record<string, number> = {};
                                      child.parameters.forEach(p => {
                                        paramQtys[p.id] = p.min_quantity || 1;
                                      });
                                      addonSel.selectedChildren = {
                                        [child.child_item_id]: {
                                          childItemId: child.child_item_id,
                                          childName: getParamName(child),
                                          parameterQuantities: paramQtys,
                                        },
                                      };
                                    }
                                  }

                                  addonSel.isProductGroupParent = true;
                                  updatedSelections[addon.addon_item_id] = addonSel;
                                  formState.setAddonSelections(updatedSelections);
                                }}
                              >
                                <option value="">Chọn dịch vụ...</option>
                                {addon.product_group_children.map((child) => (
                                  <option key={child.child_item_id} value={child.child_item_id}>
                                    {formatCurrency(child.base_price)} - {getParamName(child)}
                                  </option>
                                ))}
                              </select>

                              {/* Selected child's parameters with quantity controls + pricing */}
                              {selectedChild && childSelected && selectedChild.parameters.length > 0 && (() => {
                                const childPricing = childPricingMap[selectedChildId];
                                return (
                                  <div className="space-y-2 pl-2 border-l-2 border-purple-300">
                                    {selectedChild.parameters.map((param) => {
                                      const qty = childSelected.parameterQuantities[param.id] || 0;
                                      const paramPrice = childPricing?.parameterPricing?.[param.id];
                                      const pricingMode = childPricing?.parameterPricingModes?.[param.id] || 'per_person';
                                      const isPerGroup = pricingMode === 'per_group';

                                      return (
                                        <div key={param.id}>
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <span className="text-[11px] text-gray-600">{getParamName(param)}</span>
                                              <div className="text-[10px] text-gray-500 min-h-[16px] flex items-center">
                                                {childPricing?.loading ? (
                                                  <Loader2 className="h-2.5 w-2.5 animate-spin text-gray-400" />
                                                ) : paramPrice != null && paramPrice > 0 ? (
                                                  `${formatCurrency(paramPrice)}/${isPerGroup ? t('inlineEdit.perGroup') : t('inlineEdit.perPerson')}`
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => {
                                                  const updatedSelections = { ...formState.addonSelections };
                                                  const addonSel = { ...updatedSelections[addon.addon_item_id] };
                                                  const children = { ...(addonSel.selectedChildren || {}) };
                                                  const childData = { ...children[selectedChildId] };
                                                  const pq = { ...childData.parameterQuantities };
                                                  pq[param.id] = Math.max(param.min_quantity || 0, (pq[param.id] || 0) - 1);
                                                  childData.parameterQuantities = pq;
                                                  children[selectedChildId] = childData;
                                                  addonSel.selectedChildren = children;
                                                  updatedSelections[addon.addon_item_id] = addonSel;
                                                  formState.setAddonSelections(updatedSelections);
                                                }}
                                                disabled={qty <= (param.min_quantity || 0)}
                                              >
                                                <Minus className="h-2.5 w-2.5" />
                                              </Button>
                                              <span className="text-xs font-medium w-5 text-center">{qty}</span>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => {
                                                  const updatedSelections = { ...formState.addonSelections };
                                                  const addonSel = { ...updatedSelections[addon.addon_item_id] };
                                                  const children = { ...(addonSel.selectedChildren || {}) };
                                                  const childData = { ...children[selectedChildId] };
                                                  const pq = { ...childData.parameterQuantities };
                                                  pq[param.id] = Math.min(param.max_quantity || 99, (pq[param.id] || 0) + 1);
                                                  childData.parameterQuantities = pq;
                                                  children[selectedChildId] = childData;
                                                  addonSel.selectedChildren = children;
                                                  updatedSelections[addon.addon_item_id] = addonSel;
                                                  formState.setAddonSelections(updatedSelections);
                                                }}
                                                disabled={qty >= (param.max_quantity || 99)}
                                              >
                                                <Plus className="h-2.5 w-2.5" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Child total & voucher */}
                                    {(() => {
                                      let childTotal = 0;
                                      if (!childPricing?.loading) {
                                        selectedChild.parameters.forEach((param) => {
                                          const qty = childSelected.parameterQuantities[param.id] || 0;
                                          const price = childPricing?.parameterPricing?.[param.id] || 0;
                                          const mode = childPricing?.parameterPricingModes?.[param.id] || 'per_person';
                                          childTotal += mode === 'per_group' ? price : price * qty;
                                        });
                                      }

                                      const memoizedChildVoucher = childSelected.voucher ? {
                                        id: childSelected.voucher.id,
                                        code: childSelected.voucher.code,
                                        name: '',
                                        description: '',
                                        discountType: childSelected.voucher.discountType,
                                        discountValue: childSelected.voucher.discountValue,
                                        discountAmount: childSelected.voucher.discountAmount,
                                        isStackable: false,
                                      } : null;

                                      const voucherDiscount = childSelected.voucher?.discountAmount || 0;
                                      const childFinalTotal = Math.max(0, childTotal - voucherDiscount);

                                      return (
                                        <>
                                          {(childPricing?.loading || childTotal > 0) && (
                                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-purple-200">
                                              <span className="text-xs text-gray-600">{t('inlineEdit.serviceTotal')}</span>
                                              <span className="text-sm font-semibold text-purple-700">
                                                {childPricing?.loading ? (
                                                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                ) : (
                                                  formatCurrency(childTotal)
                                                )}
                                              </span>
                                            </div>
                                          )}

                                          {/* Voucher input for child item */}
                                          <div className="mt-2">
                                            <VoucherInput
                                              key={selectedChildId}
                                              itemId={selectedChildId}
                                              zoneId={item.zoneId}
                                              totalAmount={childTotal}
                                              applicationType="common_item"
                                              validationEndpoint="/api/glamping/validate-voucher"
                                              locale={locale}
                                              appliedVoucher={memoizedChildVoucher}
                                              onVoucherApplied={(voucher) => handleChildVoucherApplied(addon.addon_item_id, selectedChildId, voucher)}
                                              onVoucherRemoved={() => handleChildVoucherRemoved(addon.addon_item_id, selectedChildId)}
                                              disabled={childPricing?.loading || childTotal === 0}
                                            />
                                          </div>

                                          {/* Final total after voucher */}
                                          {(childPricing?.loading || (voucherDiscount > 0 && childTotal > 0)) && (
                                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-purple-200">
                                              <span className="text-xs font-semibold text-gray-700">{t('inlineEdit.grandTotal')}</span>
                                              <span className="text-sm font-bold text-purple-700">
                                                {childPricing?.loading ? (
                                                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                ) : (
                                                  formatCurrency(childFinalTotal)
                                                )}
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
                        })()}

                        {/* Addon Parameters - shown when selected (not for product group parents) */}
                        {isSelected && !addon.is_product_group_parent && addon.parameters.length > 0 && (() => {
                          const addonPricing = addonPricingMap[addon.addon_item_id];
                          return (
                            <div className="space-y-2 mt-2">
                              {addon.parameters.map((param) => {
                                const qty = selection?.parameterQuantities[param.id] || 0;
                                const paramPrice = addonPricing?.parameterPricing?.[param.id];
                                const pricingMode = addonPricing?.parameterPricingModes?.[param.id] || 'per_person';
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
                                        <div className="text-xs text-gray-500 min-h-[20px] flex items-center">
                                          {addonPricing?.loading ? (
                                            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                                          ) : paramPrice != null && paramPrice > 0 ? (
                                            `${formatCurrency(paramPrice)}/${isPerGroup ? t('inlineEdit.perGroup') : t('inlineEdit.perPerson')}`
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </div>
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
                              {(() => {
                                // Calculate addon total
                                let addonTotal = 0;
                                if (!addonPricing?.loading) {
                                  addon.parameters.forEach((param) => {
                                    const qty = selection?.parameterQuantities[param.id] || 0;
                                    const price = addonPricing?.parameterPricing?.[param.id] || 0;
                                    const mode = addonPricing?.parameterPricingModes?.[param.id] || 'per_person';
                                    addonTotal += mode === 'per_group' ? price : price * qty;
                                  });
                                }

                                // Create stable appliedVoucher object
                                const memoizedAppliedVoucher = selection?.voucher ? {
                                  id: selection.voucher.id,
                                  code: selection.voucher.code,
                                  name: '',
                                  description: '',
                                  discountType: selection.voucher.discountType,
                                  discountValue: selection.voucher.discountValue,
                                  discountAmount: selection.voucher.discountAmount,
                                  isStackable: false
                                } : null;

                                const voucherDiscount = selection?.voucher?.discountAmount || 0;
                                const addonFinalTotal = Math.max(0, addonTotal - voucherDiscount);

                                return (
                                  <>
                                    {(addonPricing?.loading || addonTotal > 0) && (
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-purple-200">
                                        <span className="text-xs text-gray-600">{t('inlineEdit.serviceTotal')}</span>
                                        <span className="text-sm font-semibold text-purple-700">
                                          {addonPricing?.loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                          ) : (
                                            formatCurrency(addonTotal)
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {/* Voucher input for addon - always rendered */}
                                    <div className="mt-2">
                                      <VoucherInput
                                        key={addon.addon_item_id}
                                        itemId={addon.addon_item_id}
                                        zoneId={item.zoneId}
                                        totalAmount={addonTotal}
                                        applicationType="common_item"
                                        validationEndpoint="/api/glamping/validate-voucher"
                                        locale={locale}
                                        appliedVoucher={memoizedAppliedVoucher}
                                        onVoucherApplied={(voucher) => handleAddonVoucherApplied(addon.addon_item_id, voucher)}
                                        onVoucherRemoved={() => handleAddonVoucherRemoved(addon.addon_item_id)}
                                        disabled={addonPricing?.loading || addonTotal === 0}
                                      />
                                    </div>

                                    {/* Final total after voucher */}
                                    {(addonPricing?.loading || (voucherDiscount > 0 && addonTotal > 0)) && (
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-purple-200">
                                        <span className="text-xs font-semibold text-gray-700">{t('inlineEdit.grandTotal')}</span>
                                        <span className="text-sm font-bold text-purple-700">
                                          {addonPricing?.loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                          ) : (
                                            formatCurrency(addonFinalTotal)
                                          )}
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
