"use client";

import React, { useState, useCallback } from 'react';
import { Edit2, ChevronDown, ChevronUp, Check, X, Loader2, Package, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { GlampingMenuProductsSelector, MenuProduct, MenuProductSelection } from '@/components/glamping-booking/GlampingMenuProductsSelector';
import VoucherInput, { type AppliedVoucher } from '@/components/booking/VoucherInput';
import { useItemAddons, type ItemAddon } from '@/hooks/useItemAddons';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

// Types for tent data from API
export interface TentMenuProduct {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  servingDate?: string;
  name: any; // JSONB
  description?: any;
  unit?: any;
  imageUrl?: string;
  minGuests?: number | null;
  maxGuests?: number | null;
  categoryId?: string;
  categoryName?: any;
}

export interface TentParameter {
  id: string;
  parameterId: string;
  label: string;
  bookedQuantity: number;
  colorCode?: string;
  visibility?: string;
  countedForMenu?: boolean;
}

export interface TentCommonItem {
  addonItemId: string;
  itemName: any;
  parameterId: string;
  parameterName: string;
  quantity: number;
  unitPrice: number;
  pricingMode: string;
  dates?: { from: string; to: string } | null;
  voucher?: { code: string; id: string; discountAmount: number; discountType: string; discountValue: number } | null;
}

export interface TentData {
  id: string;
  itemId: string;
  itemName: any; // JSONB: {en, vi}
  zoneName: any; // JSONB: {en, vi}
  zoneId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  subtotal: number;
  specialRequests?: string;
  displayOrder: number;
  parameters: TentParameter[];
  menuProducts: TentMenuProduct[];
  commonItems?: TentCommonItem[];
}

// Addon selection state (mirrors AddonSelection from GlampingCartProvider)
interface ConfirmationAddonSelection {
  addonItemId: string;
  selected: boolean;
  quantity: number;
  parameterQuantities: Record<string, number>;
  dates?: { from: string; to: string };
  voucher?: {
    code: string;
    id: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null;
  totalPrice?: number;
  addonName?: string;
  parameterPricing?: Record<string, { unitPrice: number; pricingMode: string; paramName: string }>;
}

interface ConfirmationItemsListProps {
  tents: TentData[];
  bookingId: string;
  canEditMenu: boolean;
  canEditCommonItems?: boolean;
  onMenuUpdated: () => void;
  locale?: string;
}

// Helper function to extract localized string from JSONB field
function getLocalizedString(value: any, locale: string = 'vi', fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale] || value.vi || value.en || fallback;
  }
  return fallback;
}

export function ConfirmationItemsList({
  tents,
  bookingId,
  canEditMenu,
  canEditCommonItems,
  onMenuUpdated,
  locale = 'vi',
}: ConfirmationItemsListProps) {
  const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(new Set());
  const [expandedCommonItems, setExpandedCommonItems] = useState<Set<string>>(new Set());
  const [editingTentId, setEditingTentId] = useState<string | null>(null);
  const [editingAddonTentId, setEditingAddonTentId] = useState<string | null>(null);
  const [menuSelections, setMenuSelections] = useState<Record<number, Record<string, MenuProductSelection>>>({});
  const [availableMenuItems, setAvailableMenuItems] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAddons, setSavingAddons] = useState(false);

  // Addon state
  const [addonSelections, setAddonSelections] = useState<Record<string, ConfirmationAddonSelection>>({});
  const [addonPricingMap, setAddonPricingMap] = useState<Record<string, {
    parameterPricing: Record<string, number>;
    parameterPricingModes: Record<string, string>;
    loading: boolean;
  }>>({});

  // Use ref flag to prevent circular dependency between pricing fetch and sync effects.
  // Without this, syncing pricing back into addonSelections triggers another fetch.
  const isSyncingPricingRef = React.useRef(false);

  // Fetch addons for the tent being edited
  const editingAddonTent = tents.find(t => t.id === editingAddonTentId);
  const { addons, loading: addonsLoading } = useItemAddons(editingAddonTent?.itemId || null);

  if (!tents || tents.length === 0) {
    return null;
  }

  const toggleMenuExpansion = (tentId: string) => {
    setExpandedMenuItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tentId)) {
        newSet.delete(tentId);
      } else {
        newSet.add(tentId);
      }
      return newSet;
    });
  };

  const toggleCommonItemsExpansion = (tentId: string) => {
    setExpandedCommonItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tentId)) {
        newSet.delete(tentId);
      } else {
        newSet.add(tentId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: vi });
    } catch {
      return dateString;
    }
  };

  // Get param/addon name helper
  const getParamName = (param: any) => {
    if (!param) return '';
    if (typeof param.name === 'object' && param.name !== null) {
      return param.name[locale] || param.name.vi || param.name.en || '';
    }
    return param.name || '';
  };

  // ─── Menu Products Handlers ─────────────────────────────────────────────────

  const handleEditClick = async (tent: TentData) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/glamping/bookings/${bookingId}/tents/${tent.id}/available-menu-items`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Cannot load menu items');
      }

      const menuItems: MenuProduct[] = data.menuItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        unit: item.unit,
        image_url: item.image_url,
        is_required: item.is_required || false,
        display_order: item.display_order || 0,
        category_id: item.category_id,
        category_name: item.category_name,
        min_guests: item.min_guests,
        max_guests: item.max_guests,
      }));

      setAvailableMenuItems(menuItems);

      const nightlySelections: Record<number, Record<string, MenuProductSelection>> = {};

      tent.menuProducts.forEach((mp) => {
        let nightIndex = 0;
        if (mp.servingDate) {
          const checkIn = new Date(tent.checkInDate);
          const servingDate = new Date(mp.servingDate);
          nightIndex = Math.floor((servingDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          if (nightIndex < 0) nightIndex = 0;
        }

        if (!nightlySelections[nightIndex]) {
          nightlySelections[nightIndex] = {};
        }

        nightlySelections[nightIndex][mp.menuItemId] = {
          quantity: mp.quantity,
          price: mp.unitPrice,
          name: getLocalizedString(mp.name, locale, 'Unknown'),
          voucher: null,
        };
      });

      if (Object.keys(nightlySelections).length === 0) {
        nightlySelections[0] = {};
      }

      setMenuSelections(nightlySelections);
      setEditingTentId(tent.id);
    } catch (error: any) {
      toast.error(error.message || 'Error loading menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTentId(null);
    setMenuSelections({});
    setAvailableMenuItems([]);
  };

  const handleSaveMenu = async (tent: TentData) => {
    setSaving(true);
    try {
      const menuProducts: Array<{
        id: string;
        quantity: number;
        price: number;
        name: string;
        servingDate?: string;
      }> = [];

      Object.entries(menuSelections).forEach(([nightIndexStr, nightSelections]) => {
        const nightIndex = parseInt(nightIndexStr);
        const checkIn = new Date(tent.checkInDate);
        const servingDate = addDays(checkIn, nightIndex);

        Object.entries(nightSelections).forEach(([menuItemId, selection]) => {
          if (selection.quantity > 0) {
            menuProducts.push({
              id: menuItemId,
              quantity: selection.quantity,
              price: selection.price,
              name: selection.name,
              servingDate: format(servingDate, 'yyyy-MM-dd'),
            });
          }
        });
      });

      const response = await fetch(`/api/glamping/bookings/${bookingId}/tents/${tent.id}/menu-products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuProducts }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Cannot update menu');
      }

      toast.success('Menu updated successfully!', {
        description: `New total: ${formatCurrency(result.updated_total_amount)}`,
      });

      setEditingTentId(null);
      setMenuSelections({});
      setAvailableMenuItems([]);
      onMenuUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Error updating menu');
    } finally {
      setSaving(false);
    }
  };

  // ─── Common Items (Addon) Handlers ──────────────────────────────────────────

  const getDefaultAddonDates = (addon: ItemAddon, tent: TentData): { from: string; to: string } | undefined => {
    if (addon.dates_setting === 'inherit_parent') {
      const fromStr = tent.checkInDate.split('T')[0];
      const nextDay = new Date(tent.checkInDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return { from: fromStr, to: format(nextDay, 'yyyy-MM-dd') };
    } else if (addon.dates_setting === 'custom') {
      if (addon.custom_start_date && addon.custom_end_date) {
        return { from: addon.custom_start_date, to: addon.custom_end_date };
      }
    }
    return undefined;
  };

  const handleEditAddonsClick = (tent: TentData) => {
    // Initialize addon selections from existing common items
    const initialSelections: Record<string, ConfirmationAddonSelection> = {};

    if (tent.commonItems && tent.commonItems.length > 0) {
      // Group existing common items by addonItemId
      const grouped = new Map<string, TentCommonItem[]>();
      tent.commonItems.forEach((ci) => {
        if (!grouped.has(ci.addonItemId)) {
          grouped.set(ci.addonItemId, []);
        }
        grouped.get(ci.addonItemId)!.push(ci);
      });

      for (const [addonItemId, items] of grouped.entries()) {
        const parameterQuantities: Record<string, number> = {};
        const parameterPricing: Record<string, { unitPrice: number; pricingMode: string; paramName: string }> = {};

        items.forEach((item) => {
          parameterQuantities[item.parameterId] = item.quantity;
          parameterPricing[item.parameterId] = {
            unitPrice: item.unitPrice,
            pricingMode: item.pricingMode,
            paramName: item.parameterName || '',
          };
        });

        const firstItem = items[0];
        initialSelections[addonItemId] = {
          addonItemId,
          selected: true,
          quantity: 1,
          parameterQuantities,
          dates: firstItem.dates || undefined,
          voucher: firstItem.voucher ? {
            ...firstItem.voucher,
            discountType: firstItem.voucher.discountType as 'percentage' | 'fixed',
          } : null,
          parameterPricing,
        };
      }
    }

    setAddonSelections(initialSelections);
    setAddonPricingMap({});
    setEditingAddonTentId(tent.id);
  };

  const handleCancelAddonEdit = () => {
    setEditingAddonTentId(null);
    setAddonSelections({});
    setAddonPricingMap({});
  };

  const handleAddonToggle = (addonItemId: string, selected: boolean, addon: ItemAddon, tent: TentData) => {
    const current = { ...addonSelections };
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
        dates: getDefaultAddonDates(addon, tent),
      };
    } else {
      delete current[addonItemId];
    }
    setAddonSelections(current);
  };

  const handleAddonParamQtyChange = (addonItemId: string, paramId: string, delta: number, addon: ItemAddon) => {
    const current = { ...addonSelections };
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
    setAddonSelections(current);
  };

  const handleAddonSingleDateChange = (addonItemId: string, value: string) => {
    const current = { ...addonSelections };
    const sel = current[addonItemId];
    if (!sel) return;

    const nextDay = new Date(value);
    nextDay.setDate(nextDay.getDate() + 1);

    current[addonItemId] = {
      ...sel,
      dates: { from: value, to: format(nextDay, 'yyyy-MM-dd') },
    };
    setAddonSelections(current);
  };

  const handleAddonDateChange = (addonItemId: string, field: 'from' | 'to', value: string) => {
    const current = { ...addonSelections };
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
    setAddonSelections(current);
  };

  const handleAddonVoucherApplied = (addonItemId: string, voucher: AppliedVoucher) => {
    const current = { ...addonSelections };
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
    setAddonSelections(current);
  };

  const handleAddonVoucherRemoved = (addonItemId: string) => {
    const current = { ...addonSelections };
    const sel = current[addonItemId];
    if (!sel) return;

    current[addonItemId] = {
      ...sel,
      voucher: null,
    };
    setAddonSelections(current);
  };

  // Fetch addon pricing when selections change
  React.useEffect(() => {
    // Skip API call if this addonSelections update is from pricing sync (not user action).
    // This breaks the circular dependency: fetch → sync → fetch → sync → ...
    if (isSyncingPricingRef.current) {
      isSyncingPricingRef.current = false;
      return;
    }

    if (!addons || addons.length === 0 || !editingAddonTentId) return;

    const selectedAddons = addons.filter(
      (a) => addonSelections[a.addon_item_id]?.selected
    );

    if (selectedAddons.length === 0) {
      setAddonPricingMap({});
      return;
    }

    const fetchAllAddonPricing = async () => {
      const newMap: typeof addonPricingMap = {};

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
          const sel = addonSelections[addon.addon_item_id];
          if (!sel) return;

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

    const timer = setTimeout(fetchAllAddonPricing, 800);
    return () => clearTimeout(timer);
  }, [addons, addonSelections, editingAddonTentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync computed addon pricing into selections
  React.useEffect(() => {
    if (!addons || addons.length === 0) return;

    const anyLoading = Object.values(addonPricingMap).some(p => p.loading);
    if (anyLoading) return;

    let hasChanges = false;
    const updatedSelections = { ...addonSelections };

    for (const addon of addons) {
      const sel = addonSelections[addon.addon_item_id];
      if (!sel || !sel.selected) continue;

      const pricing = addonPricingMap[addon.addon_item_id];
      if (!pricing) continue;

      let computedTotal = 0;
      const computedParamPricing: Record<string, { unitPrice: number; pricingMode: string; paramName: string }> = {};

      addon.parameters.forEach((param) => {
        const qty = sel.parameterQuantities[param.id] || 0;
        const unitPrice = pricing.parameterPricing[param.id] || 0;
        const pricingMode = pricing.parameterPricingModes[param.id] || 'per_person';
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
      setAddonSelections(updatedSelections);
    }
  }, [addonPricingMap, addons]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup effect to reset flag after render cycle
  React.useEffect(() => {
    isSyncingPricingRef.current = false;
  }, [addonSelections]);

  // Initialize required addons when addons load
  React.useEffect(() => {
    if (!addons || addons.length === 0 || !editingAddonTentId) return;
    const tent = tents.find(t => t.id === editingAddonTentId);
    if (!tent) return;

    const current = { ...addonSelections };
    let hasChanges = false;

    addons.forEach((addon) => {
      if (!current[addon.addon_item_id] && addon.is_required) {
        const defaultParamQtys: Record<string, number> = {};
        addon.parameters.forEach((p) => {
          defaultParamQtys[p.id] = p.min_quantity || 0;
        });
        current[addon.addon_item_id] = {
          addonItemId: addon.addon_item_id,
          selected: true,
          quantity: 1,
          parameterQuantities: defaultParamQtys,
          dates: getDefaultAddonDates(addon, tent),
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setAddonSelections(current);
    }
  }, [addons, editingAddonTentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveAddons = async (tent: TentData) => {
    setSavingAddons(true);
    try {
      const response = await fetch(`/api/glamping/bookings/${bookingId}/tents/${tent.id}/common-items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonSelections }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Cannot update common items');
      }

      toast.success('Dịch vụ chung đã được cập nhật!', {
        description: `Tổng mới: ${formatCurrency(result.updated_total_amount)}`,
      });

      setEditingAddonTentId(null);
      setAddonSelections({});
      setAddonPricingMap({});
      onMenuUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Lỗi cập nhật dịch vụ chung');
    } finally {
      setSavingAddons(false);
    }
  };

  // ─── Calculations ───────────────────────────────────────────────────────────

  const calculateMenuTotal = (menuProducts: TentMenuProduct[]): number => {
    return menuProducts.reduce((sum, mp) => sum + mp.totalPrice, 0);
  };

  const calculateCommonItemsTotal = (commonItems?: TentCommonItem[]): number => {
    if (!commonItems || commonItems.length === 0) return 0;
    let total = 0;
    // Group by addonItemId to calculate per-addon totals
    const grouped = new Map<string, TentCommonItem[]>();
    commonItems.forEach((ci) => {
      if (!grouped.has(ci.addonItemId)) {
        grouped.set(ci.addonItemId, []);
      }
      grouped.get(ci.addonItemId)!.push(ci);
    });

    for (const [, items] of grouped.entries()) {
      let addonTotal = 0;
      items.forEach((item) => {
        const isPerGroup = item.pricingMode === 'per_group';
        addonTotal += isPerGroup ? item.unitPrice : item.unitPrice * item.quantity;
      });
      // Apply voucher if present
      const firstItem = items[0];
      const voucherDiscount = firstItem.voucher?.discountAmount || 0;
      total += Math.max(0, addonTotal - voucherDiscount);
    }
    return total;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">
        Chi tiết lưu trú ({tents.length} {tents.length === 1 ? 'lều' : 'lều'})
      </h2>

      {tents.map((tent) => {
        const isMenuExpanded = expandedMenuItems.has(tent.id);
        const isCommonItemsExpanded = expandedCommonItems.has(tent.id);
        const hasMenuProducts = tent.menuProducts && tent.menuProducts.length > 0;
        const hasCommonItems = tent.commonItems && tent.commonItems.length > 0;
        const isEditing = editingTentId === tent.id;
        const isEditingAddons = editingAddonTentId === tent.id;
        const menuTotal = calculateMenuTotal(tent.menuProducts);
        const commonItemsTotal = calculateCommonItemsTotal(tent.commonItems);

        return (
          <Card key={tent.id} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Summary View */}
              <div className="flex gap-4">
                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {getLocalizedString(tent.itemName, locale)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getLocalizedString(tent.zoneName, locale)}
                      </p>
                    </div>
                  </div>

                  {/* Dates Info - Read Only */}
                  <div className="flex flex-wrap gap-2 mb-2 text-sm">
                    <Badge variant="secondary">
                      {formatDate(tent.checkInDate)} - {formatDate(tent.checkOutDate)}
                    </Badge>
                    <Badge variant="secondary">
                      {tent.nights} {tent.nights === 1 ? 'đêm' : 'đêm'}
                    </Badge>
                  </div>

                  {/* Parameters - Only show visibility = 'everyone' */}
                  {tent.parameters && tent.parameters.length > 0 && (
                    <div className="mb-2">
                      <div className="flex flex-wrap gap-2">
                        {tent.parameters
                          .filter((param) => param.visibility === 'everyone')
                          .map((param) => (
                            <Badge
                              key={param.id}
                              variant="outline"
                              style={{
                                borderColor: param.colorCode || undefined,
                                color: param.colorCode || undefined,
                              }}
                            >
                              {param.label}: {param.bookedQuantity}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Menu Products Section */}
                  {!isEditing && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleMenuExpansion(tent.id)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isMenuExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>
                            Món ăn & đồ uống
                            {hasMenuProducts && (
                              <span className="ml-1 text-blue-600">
                                ({formatCurrency(menuTotal)})
                              </span>
                            )}
                          </span>
                        </button>

                        {canEditMenu ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(tent)}
                            disabled={loading}
                          >
                            {loading && editingTentId === null ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Edit2 className="h-4 w-4 mr-1" />
                            )}
                            Chỉnh sửa
                          </Button>
                        ) : (
                          <span className="text-xs text-amber-600">
                            Không thể sửa (còn dưới 24h trước check-in)
                          </span>
                        )}
                      </div>

                      {isMenuExpanded && hasMenuProducts && (
                        <div className="mt-2 pl-5 space-y-2">
                          {(() => {
                            const byDate = new Map<string, TentMenuProduct[]>();
                            tent.menuProducts.forEach((mp) => {
                              const key = mp.servingDate || 'general';
                              if (!byDate.has(key)) byDate.set(key, []);
                              byDate.get(key)!.push(mp);
                            });

                            if (byDate.size <= 1 && !tent.menuProducts.some(mp => mp.servingDate)) {
                              return tent.menuProducts.map((mp) => (
                                <div key={mp.id} className="flex justify-between text-sm text-muted-foreground">
                                  <span>
                                    {getLocalizedString(mp.name, locale)} x {mp.quantity}
                                  </span>
                                  <span>{formatCurrency(mp.totalPrice)}</span>
                                </div>
                              ));
                            }

                            return Array.from(byDate.entries()).map(([dateKey, products]) => {
                              const dateLabel = dateKey === 'general'
                                ? 'Chung'
                                : format(new Date(dateKey), 'dd/MM/yyyy');

                              return (
                                <div key={dateKey} className="border-l-2 border-blue-200 pl-3 mb-2">
                                  <div className="font-medium text-sm text-blue-700 mb-1">
                                    {dateLabel}
                                  </div>
                                  {products.map((mp) => (
                                    <div key={mp.id} className="flex justify-between text-sm text-muted-foreground">
                                      <span>
                                        {getLocalizedString(mp.name, locale)} x {mp.quantity}
                                      </span>
                                      <span>{formatCurrency(mp.totalPrice)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {isMenuExpanded && !hasMenuProducts && (
                        <p className="mt-2 pl-5 text-sm text-gray-500">
                          Chưa chọn món ăn
                        </p>
                      )}
                    </div>
                  )}

                  {/* Common Items (Addons) Section */}
                  {!isEditingAddons && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleCommonItemsExpansion(tent.id)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isCommonItemsExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>
                            <Package className="h-3.5 w-3.5 inline mr-1" />
                            Dịch vụ chung
                            {hasCommonItems && (
                              <span className="ml-1 text-blue-600">
                                ({formatCurrency(commonItemsTotal)})
                              </span>
                            )}
                          </span>
                        </button>

                        {(canEditCommonItems ?? canEditMenu) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAddonsClick(tent)}
                            disabled={loading || isEditing}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Chỉnh sửa
                          </Button>
                        ) : (
                          <span className="text-xs text-amber-600">
                            Không thể sửa (còn dưới 24h trước check-in)
                          </span>
                        )}
                      </div>

                      {isCommonItemsExpanded && hasCommonItems && (
                        <div className="mt-2 pl-5 space-y-1">
                          {(() => {
                            // Group by addonItemId for display
                            const grouped = new Map<string, TentCommonItem[]>();
                            tent.commonItems!.forEach((ci) => {
                              if (!grouped.has(ci.addonItemId)) {
                                grouped.set(ci.addonItemId, []);
                              }
                              grouped.get(ci.addonItemId)!.push(ci);
                            });

                            return Array.from(grouped.entries()).map(([addonItemId, items]) => {
                              let addonTotal = 0;
                              items.forEach((item) => {
                                const isPerGroup = item.pricingMode === 'per_group';
                                addonTotal += isPerGroup ? item.unitPrice : item.unitPrice * item.quantity;
                              });
                              const voucherDiscount = items[0].voucher?.discountAmount || 0;
                              const finalTotal = Math.max(0, addonTotal - voucherDiscount);

                              return (
                                <div key={addonItemId} className="border-l-2 border-blue-200 pl-3 mb-2">
                                  <div className="font-medium text-sm text-blue-700 mb-1">
                                    {getLocalizedString(items[0].itemName, locale)}
                                  </div>
                                  {items.map((ci, idx) => (
                                    <div key={idx} className="flex justify-between text-sm text-muted-foreground">
                                      <span>
                                        {ci.parameterName || getLocalizedString(ci.itemName, locale)} x {ci.quantity}
                                      </span>
                                      <span>
                                        {formatCurrency(ci.pricingMode === 'per_group' ? ci.unitPrice : ci.unitPrice * ci.quantity)}
                                      </span>
                                    </div>
                                  ))}
                                  {voucherDiscount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                      <span>Voucher: {items[0].voucher?.code}</span>
                                      <span>-{formatCurrency(voucherDiscount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-sm font-medium text-blue-700 pt-1">
                                    <span>Tổng</span>
                                    <span>{formatCurrency(finalTotal)}</span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {isCommonItemsExpanded && !hasCommonItems && (
                        <p className="mt-2 pl-5 text-sm text-gray-500">
                          Chưa chọn dịch vụ chung
                        </p>
                      )}
                    </div>
                  )}

                  {/* Subtotal for this tent */}
                  {!isEditing && !isEditingAddons && (
                    <div className="flex justify-between items-center pt-3 border-t mt-3">
                      <span className="text-sm text-muted-foreground">Giá lều này:</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {formatCurrency(tent.subtotal + menuTotal + commonItemsTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline Menu Edit Form - Collapsible */}
              <Collapsible open={isEditing}>
                <CollapsibleContent>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h4 className="font-semibold mb-4">Chỉnh sửa món ăn & đồ uống</h4>

                    <GlampingMenuProductsSelector
                      menuProducts={availableMenuItems}
                      nightlySelections={menuSelections}
                      onChange={setMenuSelections}
                      nights={tent.nights}
                      checkInDate={new Date(tent.checkInDate)}
                      totalCountedGuests={
                        tent.parameters
                          ?.filter(p => p.countedForMenu)
                          .reduce((sum, p) => sum + (p.bookedQuantity || 0), 0) ||
                        tent.parameters?.reduce((sum, p) => sum + (p.bookedQuantity || 0), 0) || 0
                      }
                      locale={locale}
                    />

                    <div className="flex gap-4 mt-6 justify-end">
                      <Button onClick={() => handleSaveMenu(tent)} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Lưu thay đổi
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                        <X className="mr-2 h-4 w-4" />
                        Hủy
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Inline Addon Edit Form - Collapsible */}
              <Collapsible open={isEditingAddons}>
                <CollapsibleContent>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold">Chỉnh sửa dịch vụ chung</h4>
                    </div>

                    {addonsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-sm text-gray-600">Đang tải dịch vụ...</span>
                      </div>
                    ) : addons.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {addons.map((addon) => {
                          const selection = addonSelections[addon.addon_item_id];
                          const isSelected = selection?.selected || false;

                          return (
                            <div
                              key={addon.addon_item_id}
                              className={`rounded-lg border p-3 transition-colors ${
                                isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              {/* Addon Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{getParamName(addon)}</span>
                                  {addon.is_required && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                      Bắt buộc
                                    </Badge>
                                  )}
                                  {addon.price_percentage < 100 && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {addon.price_percentage}%
                                    </Badge>
                                  )}
                                </div>
                                {!addon.is_required && (
                                  <Switch
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleAddonToggle(addon.addon_item_id, checked, addon, tent)}
                                  />
                                )}
                              </div>

                              {/* Addon Date - inherit_parent */}
                              {isSelected && addon.dates_setting === 'inherit_parent' && (() => {
                                const parentFrom = tent.checkInDate.split('T')[0];
                                const lastNight = new Date(tent.checkOutDate);
                                lastNight.setDate(lastNight.getDate() - 1);
                                const parentMaxDate = format(lastNight, 'yyyy-MM-dd');

                                return (
                                  <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-xs text-gray-600 shrink-0">Ngày</span>
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

                              {/* Addon Date - custom */}
                              {isSelected && addon.dates_setting === 'custom' && (
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600 shrink-0">Từ ngày</span>
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
                                    <span className="text-xs text-gray-600 shrink-0">Đến ngày</span>
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
                                      {format(new Date(addon.custom_start_date), 'dd/MM/yyyy')} - {format(new Date(addon.custom_end_date), 'dd/MM/yyyy')}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Addon Parameters */}
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
                                                  {formatCurrency(paramPrice)}/{isPerGroup ? 'nhóm' : 'người'}
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
                                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-blue-200">
                                              <span className="text-xs text-gray-600">Tổng dịch vụ</span>
                                              <span className="text-sm font-semibold text-blue-700">
                                                {formatCurrency(addonTotal)}
                                              </span>
                                            </div>
                                          )}

                                          {/* Voucher input */}
                                          {addonTotal > 0 && (
                                            <div className="mt-2">
                                              <VoucherInput
                                                itemId={addon.addon_item_id}
                                                zoneId={tent.zoneId}
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
                                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-blue-200">
                                              <span className="text-xs font-semibold text-gray-700">Tổng cộng</span>
                                              <span className="text-sm font-bold text-blue-700">
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
                    ) : (
                      <p className="text-sm text-gray-500">Không có dịch vụ chung nào cho loại lều này.</p>
                    )}

                    <div className="flex gap-4 mt-6 justify-end">
                      <Button onClick={() => handleSaveAddons(tent)} disabled={savingAddons}>
                        {savingAddons ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Lưu thay đổi
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCancelAddonEdit} disabled={savingAddons}>
                        <X className="mr-2 h-4 w-4" />
                        Hủy
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
