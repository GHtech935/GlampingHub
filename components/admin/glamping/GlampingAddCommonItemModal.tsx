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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, ChevronDown, Check } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "react-hot-toast";
import type { Locale, MultilingualText } from "@/lib/i18n-utils";
import { getLocalizedText } from "@/lib/i18n-utils";
import VoucherInput, { type AppliedVoucher } from "@/components/booking/VoucherInput";

interface TentItem {
  id: string;
  itemId: string;
  itemName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
}

interface ProductGroupChild {
  item_id: string;
  item_name: MultilingualText | string;
  item_sku: string;
  base_price: number;
  display_order: number;
  parameters: Array<{
    id: string;
    name: MultilingualText | string;
    color_code: string;
    min_quantity: number;
    max_quantity: number;
  }>;
}

interface AddonItem {
  addon_item_id: string;
  name: MultilingualText | string;
  sku: string;
  price_percentage: number;
  is_required: boolean;
  dates_setting: string;
  custom_start_date: string | null;
  custom_end_date: string | null;
  display_order: number;
  parameters: Array<{
    id: string;
    name: MultilingualText | string;
    color_code: string;
    min_quantity: number;
    max_quantity: number;
  }>;
  // Product group fields
  is_product_group_parent?: boolean;
  product_group_children?: ProductGroupChild[];
}

interface GlampingAddCommonItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  bookingId: string;
  zoneId: string;
  tents: TentItem[];
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Thêm item chung',
    selectTent: 'Chọn lều',
    selectTentPlaceholder: 'Chọn lều...',
    selectAddon: 'Chọn addon',
    selectAddonPlaceholder: 'Chọn addon...',
    parameters: 'Thông số',
    paramName: 'Loại',
    paramQty: 'SL',
    paramPrice: 'Đơn giá',
    total: 'Tổng cộng',
    cancel: 'Huỷ',
    add: 'Thêm',
    adding: 'Đang thêm...',
    addSuccess: 'Đã thêm item chung thành công',
    addFailed: 'Không thể thêm item chung',
    loadingAddons: 'Đang tải addons...',
    loadingItems: 'Đang tải danh sách...',
    noAddons: 'Không có addon nào',
    searchAddon: 'Tìm kiếm addon...',
    selectTentFirst: 'Vui lòng chọn lều',
    selectAddonFirst: 'Vui lòng chọn addon',
    setQuantityFirst: 'Vui lòng nhập số lượng',
    loadingPricing: 'Đang tính giá...',
    addonDate: 'Ngày sử dụng',
    addonDateFrom: 'Từ ngày',
    addonDateTo: 'Đến ngày',
    voucher: 'Voucher giảm giá',
    totalAfterDiscount: 'Tổng sau giảm giá',
    selectChild: 'Chọn dịch vụ',
    selectChildPlaceholder: 'Chọn dịch vụ...',
  },
  en: {
    title: 'Add Common Item',
    selectTent: 'Select Tent',
    selectTentPlaceholder: 'Select tent...',
    selectAddon: 'Select Addon',
    selectAddonPlaceholder: 'Select addon...',
    parameters: 'Parameters',
    paramName: 'Type',
    paramQty: 'Qty',
    paramPrice: 'Unit Price',
    total: 'Total',
    cancel: 'Cancel',
    add: 'Add',
    adding: 'Adding...',
    addSuccess: 'Common item added successfully',
    addFailed: 'Failed to add common item',
    loadingAddons: 'Loading addons...',
    loadingItems: 'Loading items...',
    noAddons: 'No addons available',
    searchAddon: 'Search addon...',
    selectTentFirst: 'Please select a tent',
    selectAddonFirst: 'Please select an addon',
    setQuantityFirst: 'Please enter quantity',
    loadingPricing: 'Calculating price...',
    addonDate: 'Service Date',
    addonDateFrom: 'From Date',
    addonDateTo: 'To Date',
    voucher: 'Discount Voucher',
    totalAfterDiscount: 'Total after discount',
    selectChild: 'Select service',
    selectChildPlaceholder: 'Select service...',
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

export function GlampingAddCommonItemModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  zoneId,
  tents,
  locale = 'vi',
}: GlampingAddCommonItemModalProps) {
  const t = texts[locale];

  const [selectedTentId, setSelectedTentId] = useState<string>('');
  const [allCommonItems, setAllCommonItems] = useState<Array<{ id: string; name: MultilingualText | string; sku: string }>>([]);
  const [loadingCommonItems, setLoadingCommonItems] = useState(false);
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [selectedAddonId, setSelectedAddonId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addonDropdownOpen, setAddonDropdownOpen] = useState(false);
  const [addonDates, setAddonDates] = useState<{ from: string; to: string } | null>(null);
  const [parameterQuantities, setParameterQuantities] = useState<Record<string, number>>({});
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // Pricing state
  const [parameterPricing, setParameterPricing] = useState<Record<string, number>>({});
  const [parameterPricingModes, setParameterPricingModes] = useState<Record<string, 'per_person' | 'per_group'>>({});
  const [pricingLoading, setPricingLoading] = useState(false);

  // Ref for tracking previous quantities to optimize fetches
  const prevQuantitiesRef = useRef(parameterQuantities);

  // Voucher state
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const selectedTent = useMemo(
    () => tents.find(t => t.id === selectedTentId),
    [tents, selectedTentId]
  );

  const selectedAddon = useMemo(
    () => addons.find(a => a.addon_item_id === selectedAddonId),
    [addons, selectedAddonId]
  );

  const selectedChild = useMemo(
    () => selectedAddon?.product_group_children?.find(c => c.item_id === selectedChildId),
    [selectedAddon, selectedChildId]
  );

  // Filter common items by search query
  const filteredCommonItems = useMemo(() => {
    if (!searchQuery.trim()) return allCommonItems;
    const q = searchQuery.toLowerCase().trim();
    return allCommonItems.filter(item => {
      const name = getLocalizedText(item.name, locale).toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [allCommonItems, searchQuery, locale]);

  // Get the display name for the selected item
  const selectedItemName = useMemo(() => {
    if (!selectedAddonId) return '';
    const item = allCommonItems.find(i => i.id === selectedAddonId);
    if (!item) return '';
    const name = getLocalizedText(item.name, locale);
    return item.sku ? `${name} (${item.sku})` : name;
  }, [selectedAddonId, allCommonItems, locale]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTentId('');
      setAllCommonItems([]);
      setAddons([]);
      setSelectedAddonId('');
      setSelectedChildId('');
      setAddonDates(null);
      setParameterQuantities({});
      setParameterPricing({});
      setParameterPricingModes({});
      setAppliedVoucher(null);
      setSearchQuery('');
      setAddonDropdownOpen(false);
    }
  }, [isOpen]);

  // Auto-select tent if only one
  useEffect(() => {
    if (isOpen && tents.length === 1) {
      setSelectedTentId(tents[0].id);
    }
  }, [isOpen, tents]);

  // Fetch ALL common items for the zone when tent is selected
  useEffect(() => {
    if (!selectedTentId) {
      setAllCommonItems([]);
      setSelectedAddonId('');
      setSearchQuery('');
      return;
    }

    const fetchAllCommonItems = async () => {
      setLoadingCommonItems(true);
      try {
        const res = await fetch(`/api/admin/glamping/items?zone_id=${zoneId}&is_tent_category=false`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAllCommonItems((data.items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
        })));
      } catch (error) {
        console.error('Error fetching common items:', error);
        setAllCommonItems([]);
      } finally {
        setLoadingCommonItems(false);
      }
    };

    fetchAllCommonItems();
  }, [selectedTentId, zoneId]);

  // Fetch item details + parameters when a common item is selected
  useEffect(() => {
    if (!selectedAddonId) {
      setAddons([]);
      return;
    }

    const fetchItemDetails = async () => {
      setLoadingAddons(true);
      setSelectedChildId('');
      try {
        const res = await fetch(`/api/admin/glamping/items/${selectedAddonId}`);
        if (!res.ok) throw new Error('Failed to fetch item details');
        const data = await res.json();
        const item = data.item;

        const isProductGroupParent = item.product_group_role === 'parent';

        const addonItem: AddonItem = {
          addon_item_id: item.id,
          name: item.name,
          sku: item.sku,
          price_percentage: 100,
          is_required: false,
          dates_setting: 'inherit_parent',
          custom_start_date: null,
          custom_end_date: null,
          display_order: 0,
          parameters: (item.parameters || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            color_code: p.color_code,
            min_quantity: p.min_quantity,
            max_quantity: p.max_quantity,
          })),
          is_product_group_parent: isProductGroupParent,
          product_group_children: isProductGroupParent
            ? (item.product_group_children || []).map((c: any) => ({
                item_id: c.item_id,
                item_name: c.item_name,
                item_sku: c.item_sku,
                base_price: c.base_price || 0,
                display_order: c.display_order,
                parameters: (c.parameters || []).map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  color_code: p.color_code,
                  min_quantity: p.min_quantity,
                  max_quantity: p.max_quantity,
                })),
              }))
            : undefined,
        };

        setAddons([addonItem]);
      } catch (error) {
        console.error('Error fetching item details:', error);
        setAddons([]);
      } finally {
        setLoadingAddons(false);
      }
    };

    fetchItemDetails();
  }, [selectedAddonId]);

  // Reset quantities and dates when addon changes and init with min values
  useEffect(() => {
    if (!selectedAddon) {
      setAddonDates(null);
      setParameterQuantities({});
      setParameterPricing({});
      setParameterPricingModes({});
      setAppliedVoucher(null);
      setSelectedChildId('');
      return;
    }

    // Set default dates based on dates_setting
    if (selectedAddon.dates_setting === 'inherit_parent' && selectedTent) {
      const fromStr = toDateStr(selectedTent.checkInDate);
      const toStr = addDaysLocal(fromStr, 1);
      setAddonDates({ from: fromStr, to: toStr });
    } else if (selectedAddon.dates_setting === 'custom' && selectedAddon.custom_start_date && selectedAddon.custom_end_date) {
      setAddonDates({ from: selectedAddon.custom_start_date, to: selectedAddon.custom_end_date });
    } else {
      setAddonDates(null);
    }

    // For product group parents, don't init parent params - wait for child selection
    if (selectedAddon.is_product_group_parent) {
      setParameterQuantities({});
      return;
    }

    const initial: Record<string, number> = {};
    selectedAddon.parameters.forEach(p => {
      initial[p.id] = p.min_quantity || 0;
    });
    setParameterQuantities(initial);
  }, [selectedAddon, selectedTent]);

  // When child is selected, reset quantities to child's parameters
  useEffect(() => {
    if (!selectedChild) {
      if (selectedAddon?.is_product_group_parent) {
        setParameterQuantities({});
        setParameterPricing({});
        setParameterPricingModes({});
        setAppliedVoucher(null);
      }
      return;
    }

    const initial: Record<string, number> = {};
    selectedChild.parameters.forEach(p => {
      initial[p.id] = p.min_quantity || 0;
    });
    setParameterQuantities(initial);
    setParameterPricing({});
    setParameterPricingModes({});
    setAppliedVoucher(null);
  }, [selectedChild, selectedAddon]);

  // Fetch pricing when addon selected + quantities change
  // For product group parents, use selectedChildId as the item to price
  useEffect(() => {
    const isProductGroup = selectedAddon?.is_product_group_parent;
    const effectiveItemId = isProductGroup ? selectedChildId : selectedAddonId;

    if (!effectiveItemId || !selectedTent) {
      setParameterPricing({});
      setParameterPricingModes({});
      prevQuantitiesRef.current = parameterQuantities;
      return;
    }

    // Detect which parameters changed
    const prevQty = prevQuantitiesRef.current;
    const hasChanges = JSON.stringify(parameterQuantities) !== JSON.stringify(prevQty);

    if (!hasChanges && Object.keys(parameterPricing).length > 0) {
      // Already have pricing and no changes - skip fetch
      return;
    }

    const hasQuantity = Object.values(parameterQuantities).some(q => q > 0);
    if (!hasQuantity) {
      prevQuantitiesRef.current = parameterQuantities;
      return;
    }

    // Update ref immediately to prevent re-fetch
    prevQuantitiesRef.current = parameterQuantities;

    const fetchPricing = async () => {
      setPricingLoading(true);
      try {
        // Use addon-specific dates when available, fall back to tent dates
        const effectiveCheckIn = addonDates?.from || selectedTent.checkInDate;
        const effectiveCheckOut = addonDates?.to || selectedTent.checkOutDate;

        const params = new URLSearchParams({
          itemId: effectiveItemId,
          checkIn: effectiveCheckIn,
          checkOut: effectiveCheckOut,
          adults: '0',
          children: '0',
        });

        Object.entries(parameterQuantities).forEach(([paramId, quantity]) => {
          if (quantity > 0) {
            params.append(`param_${paramId}`, quantity.toString());
          }
        });

        const res = await fetch(`/api/glamping/booking/calculate-pricing?${params}`);
        const data = await res.json();

        if (res.ok) {
          // Apply price_percentage from addon config
          const addon = addons.find(a => a.addon_item_id === selectedAddonId);
          const pricePct = addon?.price_percentage ?? 100;

          if (data.parameterPricing) {
            const adjusted: Record<string, number> = {};
            Object.entries(data.parameterPricing).forEach(([paramId, price]) => {
              adjusted[paramId] = (price as number) * pricePct / 100;
            });
            setParameterPricing(adjusted);
          }
          if (data.parameterPricingModes) {
            setParameterPricingModes(data.parameterPricingModes);
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
  }, [selectedAddonId, selectedChildId, selectedAddon, selectedTent, parameterQuantities, addons, addonDates]);

  // Calculate total
  const totalCost = useMemo(() => {
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

  // Dynamically recalculate voucher discount when totalCost changes
  // (e.g., user changes quantity after applying a percentage voucher)
  const effectiveDiscount = useMemo(() => {
    if (!appliedVoucher || totalCost <= 0) return 0;
    if (appliedVoucher.discountType === 'percentage') {
      return Math.min((totalCost * appliedVoucher.discountValue) / 100, totalCost);
    }
    return Math.min(appliedVoucher.discountAmount, totalCost);
  }, [appliedVoucher, totalCost]);

  const updateQuantity = (paramId: string, value: number) => {
    setParameterQuantities(prev => ({ ...prev, [paramId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedTentId) {
      toast.error(t.selectTentFirst);
      return;
    }
    if (!selectedAddonId) {
      toast.error(t.selectAddonFirst);
      return;
    }

    const isProductGroup = selectedAddon?.is_product_group_parent;

    // For product group: need a child selected
    if (isProductGroup && !selectedChildId) {
      toast.error(t.selectAddonFirst);
      return;
    }

    const hasQty = Object.values(parameterQuantities).some(q => q > 0);
    if (!hasQty) {
      toast.error(t.setQuantityFirst);
      return;
    }

    setSubmitting(true);
    try {
      const paramsForApi = Object.entries(parameterQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([paramId, quantity]) => ({
          parameterId: paramId,
          quantity,
          unitPrice: parameterPricing[paramId] || 0,
          pricingMode: parameterPricingModes[paramId] || 'per_person',
        }));

      // For inherit_parent mode (single date), extract the selected date from addonDates.from
      const selectedDate = (selectedAddon?.dates_setting === 'inherit_parent' && addonDates?.from)
        ? addonDates.from
        : undefined;

      // For product group: save the child as the actual item, and parent as metadata
      const effectiveAddonItemId = isProductGroup ? selectedChildId : selectedAddonId;
      const productGroupParentId = isProductGroup ? selectedAddonId : undefined;

      const res = await fetch(`/api/admin/glamping/bookings/${bookingId}/common-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingTentId: selectedTentId,
          addonItemId: effectiveAddonItemId,
          addonDates: addonDates || undefined,
          selectedDate: selectedDate,
          parameters: paramsForApi,
          voucher: appliedVoucher ? {
            code: appliedVoucher.code,
            id: appliedVoucher.id,
            discountAmount: effectiveDiscount,
            discountType: appliedVoucher.discountType,
            discountValue: appliedVoucher.discountValue,
          } : undefined,
          productGroupParentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add');
      }

      toast.success(t.addSuccess);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error adding common item:', error);
      toast.error(error instanceof Error ? error.message : t.addFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          {/* Step 1: Select Tent */}
          <div className="min-w-0">
            <Label className="mb-2 block">{t.selectTent}</Label>
            <Select value={selectedTentId} onValueChange={setSelectedTentId}>
              <SelectTrigger className="min-w-0">
                <SelectValue placeholder={t.selectTentPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {tents.map((tent) => (
                  <SelectItem key={tent.id} value={tent.id}>
                    {tent.itemName} ({formatDate(tent.checkInDate)} - {formatDate(tent.checkOutDate)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Select Addon */}
          {selectedTentId && (
            <div>
              <Label className="mb-2 block">{t.selectAddon}</Label>
              {loadingCommonItems ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.loadingItems}
                </div>
              ) : allCommonItems.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">{t.noAddons}</div>
              ) : (
                <Popover open={addonDropdownOpen} onOpenChange={setAddonDropdownOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className={selectedItemName ? 'text-foreground truncate' : 'text-muted-foreground'}>
                        {selectedItemName || t.selectAddonPlaceholder}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="z-[1300] w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <div className="flex items-center border-b border-border/50 px-3 py-2">
                      <Search className="h-4 w-4 text-muted-foreground/60 mr-2 shrink-0" />
                      <input
                        type="text"
                        className="flex-1 bg-transparent text-sm outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none placeholder:text-muted-foreground/60"
                        placeholder={t.searchAddon}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                      {filteredCommonItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-3 text-center">{t.noAddons}</div>
                      ) : (
                        filteredCommonItems.map((item) => {
                          const name = getLocalizedText(item.name, locale);
                          const isSelected = item.id === selectedAddonId;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${isSelected ? 'bg-accent' : ''}`}
                              onClick={() => {
                                setSelectedAddonId(item.id);
                                setAddonDropdownOpen(false);
                                setSearchQuery('');
                              }}
                            >
                              {isSelected && <Check className="h-4 w-4 shrink-0" />}
                              <span className={`truncate ${isSelected ? '' : 'ml-6'}`}>
                                {name}{item.sku ? ` (${item.sku})` : ''}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {loadingAddons && selectedAddonId && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-1 mt-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t.loadingAddons}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Date Selection (based on addon dates_setting) */}
          {selectedAddon && selectedAddon.dates_setting === 'inherit_parent' && selectedTent && (
            <div>
              <Label className="mb-2 block">{t.addonDate}</Label>
              <input
                type="date"
                className="w-full text-sm border rounded px-3 py-2"
                value={addonDates?.from || ''}
                min={toDateStr(selectedTent.checkInDate)}
                max={addDaysLocal(toDateStr(selectedTent.checkOutDate), -1)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setAddonDates({ from: val, to: addDaysLocal(val, 1) });
                  }
                }}
              />
            </div>
          )}

          {selectedAddon && selectedAddon.dates_setting === 'custom' && (
            <div className="space-y-2">
              <div>
                <Label className="mb-1 block">{t.addonDateFrom}</Label>
                <input
                  type="date"
                  className="w-full text-sm border rounded px-3 py-2"
                  value={addonDates?.from || ''}
                  min={selectedAddon.custom_start_date || undefined}
                  max={addonDates?.to || selectedAddon.custom_end_date || undefined}
                  onChange={(e) => {
                    setAddonDates(prev => ({
                      from: e.target.value,
                      to: prev?.to || selectedAddon.custom_end_date || e.target.value,
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
                  min={addonDates?.from || selectedAddon.custom_start_date || undefined}
                  max={selectedAddon.custom_end_date || undefined}
                  onChange={(e) => {
                    setAddonDates(prev => ({
                      from: prev?.from || selectedAddon.custom_start_date || e.target.value,
                      to: e.target.value,
                    }));
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 4a: Product Group - Child Selection + Child Parameters */}
          {selectedAddon && selectedAddon.is_product_group_parent && selectedAddon.product_group_children && selectedAddon.product_group_children.length > 0 && (
            <div className="space-y-4">
              {/* Child dropdown */}
              <div>
                <Label className="mb-2 block">{t.selectChild}</Label>
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectChildPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedAddon.product_group_children.map((child) => (
                      <SelectItem key={child.item_id} value={child.item_id}>
                        {formatCurrency(child.base_price)} - {getLocalizedText(child.item_name, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Child parameters */}
              {selectedChild && selectedChild.parameters.length > 0 && (
                <div>
                  <Label className="mb-2 block">{t.parameters}</Label>
                  <div className="space-y-2">
                    {selectedChild.parameters.map((param) => {
                      const qty = parameterQuantities[param.id] || 0;
                      const unitPrice = parameterPricing[param.id] || 0;
                      const mode = parameterPricingModes[param.id] || 'per_person';
                      const rowTotal = mode === 'per_group' ? unitPrice : qty * unitPrice;

                      return (
                        <div key={param.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                          <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
                            {getLocalizedText(param.name, locale)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={param.min_quantity || 0}
                              max={param.max_quantity || undefined}
                              value={qty}
                              onChange={(e) => updateQuantity(param.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-sm text-center"
                            />
                            <span className="text-xs text-gray-400">&times;</span>
                            <span className="text-sm text-gray-700 w-28 text-right tabular-nums flex items-center justify-end">
                              {pricingLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              ) : (
                                formatCurrency(unitPrice)
                              )}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 w-24 text-right flex items-center justify-end">
                            = {pricingLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-1" />
                            ) : (
                              formatCurrency(rowTotal)
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4b: Regular Parameters & Quantities (non-product-group) */}
          {selectedAddon && !selectedAddon.is_product_group_parent && selectedAddon.parameters.length > 0 && (
            <div>
              <Label className="mb-2 block">{t.parameters}</Label>
              <div className="space-y-2">
                {selectedAddon.parameters.map((param) => {
                  const qty = parameterQuantities[param.id] || 0;
                  const unitPrice = parameterPricing[param.id] || 0;
                  const mode = parameterPricingModes[param.id] || 'per_person';
                  const rowTotal = mode === 'per_group' ? unitPrice : qty * unitPrice;

                  return (
                    <div key={param.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
                        {getLocalizedText(param.name, locale)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={param.min_quantity || 0}
                          max={param.max_quantity || undefined}
                          value={qty}
                          onChange={(e) => updateQuantity(param.id, parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-sm text-center"
                        />
                        <span className="text-xs text-gray-400">&times;</span>
                        <span className="text-sm text-gray-700 w-28 text-right tabular-nums flex items-center justify-end">
                          {pricingLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                          ) : (
                            formatCurrency(unitPrice)
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 w-24 text-right flex items-center justify-end">
                        = {pricingLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-1" />
                        ) : (
                          formatCurrency(rowTotal)
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voucher */}
          {totalCost > 0 && (
            <div>
              <Label className="mb-2 block">{t.voucher}</Label>
              <VoucherInput
                itemId={selectedAddon?.is_product_group_parent ? selectedChildId : selectedAddonId}
                zoneId={zoneId}
                totalAmount={totalCost}
                applicationType="common_item"
                validationEndpoint="/api/glamping/validate-voucher"
                locale={locale}
                appliedVoucher={appliedVoucher}
                onVoucherApplied={(voucher) => setAppliedVoucher(voucher)}
                onVoucherRemoved={() => setAppliedVoucher(null)}
              />
            </div>
          )}

          {/* Pricing Summary */}
          {totalCost > 0 && (
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.total}</span>
                  <span className="font-medium text-purple-700 flex items-center gap-2">
                    {pricingLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{t.loadingPricing}</span>
                      </>
                    ) : (
                      formatCurrency(totalCost)
                    )}
                  </span>
                </div>
                {appliedVoucher && effectiveDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600 mt-1">
                      <span>Voucher {appliedVoucher.code}</span>
                      <span>-{formatCurrency(effectiveDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t border-purple-200">
                      <span>{t.totalAfterDiscount}</span>
                      <span className="text-purple-700">
                        {formatCurrency(Math.max(0, totalCost - effectiveDiscount))}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || pricingLoading}>
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
