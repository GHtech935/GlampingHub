"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Plus,
  Minus,
  Tent,
  UtensilsCrossed,
  Ticket,
  X,
  CheckCircle2,
  ImageOff,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { format, addDays, parseISO, differenceInDays } from "date-fns";
import type { Locale } from "@/lib/i18n-utils";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";

interface TentItem {
  id: string;
  itemId: string;
  itemName: string;
  checkInDate: string;
  checkOutDate: string;
}

interface MenuItem {
  id: string;
  name: MultilingualText | string;
  description?: MultilingualText | string | null;
  category: string;
  category_name: MultilingualText | string;
  price: number;
  unit: MultilingualText | string;
  is_available: boolean;
  max_quantity?: number;
  requires_advance_booking: boolean;
  advance_hours?: number;
  min_guests?: number | null;
  max_guests?: number | null;
  image_url?: string | null;
}

interface SelectedMenuProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  unit: string;
  voucher?: {
    code: string;
    id: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  } | null;
}

interface GlampingAddMenuProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  bookingId: string;
  tents: TentItem[];
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Thêm sản phẩm',
    selectTent: 'Chọn lều',
    noProductsFound: 'Không tìm thấy sản phẩm',
    day: 'Ngày',
    cancel: 'Huỷ',
    add: 'Thêm sản phẩm',
    adding: 'Đang thêm...',
    addSuccess: 'Đã thêm sản phẩm thành công',
    addFailed: 'Không thể thêm sản phẩm',
    selectProductFirst: 'Vui lòng chọn sản phẩm',
    loading: 'Đang tải...',
    noTents: 'Chưa có lều nào trong booking',
    menuItems: 'Menu',
    selected: 'Đã chọn',
    total: 'Tổng cộng',
    applyVoucher: 'Áp dụng',
    voucherPlaceholder: 'Mã giảm giá...',
  },
  en: {
    title: 'Add Product',
    selectTent: 'Select Tent',
    noProductsFound: 'No products found',
    day: 'Day',
    cancel: 'Cancel',
    add: 'Add Product',
    adding: 'Adding...',
    addSuccess: 'Product added successfully',
    addFailed: 'Failed to add product',
    selectProductFirst: 'Please select a product',
    loading: 'Loading...',
    noTents: 'No tents in this booking',
    menuItems: 'Menu',
    selected: 'Selected',
    total: 'Total',
    applyVoucher: 'Apply',
    voucherPlaceholder: 'Discount code...',
  },
};

export function GlampingAddMenuProductModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  tents,
  locale = 'vi',
}: GlampingAddMenuProductModalProps) {
  const t = texts[locale];

  // State
  const [activeTentId, setActiveTentId] = useState<string>('');
  const [activeNight, setActiveNight] = useState<number>(0);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [zoneId, setZoneId] = useState<string>('');

  // Per-tent, per-night selections: tentId -> nightIndex -> productId -> selection
  const [selections, setSelections] = useState<
    Record<string, Record<number, Record<string, SelectedMenuProduct>>>
  >({});

  // Voucher codes per product
  const [productVoucherCodes, setProductVoucherCodes] = useState<Record<string, string>>({});
  const [productVoucherLoading, setProductVoucherLoading] = useState<Record<string, boolean>>({});
  const [productVoucherErrors, setProductVoucherErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);

  // Compute nights for each tent
  const tentNights = useMemo(() => {
    const result: Record<string, number> = {};
    tents.forEach(tent => {
      if (tent.checkInDate && tent.checkOutDate) {
        result[tent.id] = Math.max(1, differenceInDays(
          parseISO(tent.checkOutDate),
          parseISO(tent.checkInDate)
        ));
      } else {
        result[tent.id] = 1;
      }
    });
    return result;
  }, [tents]);

  // Current active tent
  const activeTent = useMemo(() => {
    return tents.find(t => t.id === activeTentId) || tents[0];
  }, [tents, activeTentId]);

  // Current night selections for active tent
  const activeNightSelections = useMemo(() => {
    if (!activeTentId) return {};
    return selections[activeTentId]?.[activeNight] || {};
  }, [selections, activeTentId, activeNight]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTentId('');
      setActiveNight(0);
      setMenuItems([]);
      setSelections({});
      setProductVoucherCodes({});
      setProductVoucherErrors({});
      setZoneId('');
    } else if (tents.length > 0) {
      setActiveTentId(tents[0].id);
    }
  }, [isOpen, tents]);

  // Reset night when tent changes
  useEffect(() => {
    if (activeTentId) {
      setActiveNight(0);
    }
  }, [activeTentId]);

  // Fetch zone and menu items when modal opens
  useEffect(() => {
    if (!isOpen || tents.length === 0) {
      return;
    }

    const fetchMenuData = async () => {
      setLoadingMenuItems(true);
      try {
        // First get booking details to get zoneId
        const bookingResponse = await fetch(`/api/admin/glamping/bookings/${bookingId}`);
        if (!bookingResponse.ok) throw new Error('Failed to fetch booking');

        const bookingData = await bookingResponse.json();
        // API returns booking directly (not wrapped), zone may come from booking.zone or from tents
        let fetchedZoneId = bookingData.zone?.id;

        // If zone not in booking directly, try to get from tents via items API
        if (!fetchedZoneId && tents.length > 0 && tents[0].itemId) {
          const itemResponse = await fetch(`/api/glamping/items/${tents[0].itemId}`);
          if (itemResponse.ok) {
            const itemData = await itemResponse.json();
            fetchedZoneId = itemData.item?.zone_id;
          }
        }

        if (!fetchedZoneId) {
          throw new Error('Zone not found');
        }

        setZoneId(fetchedZoneId);

        // Then fetch menu items
        const menuResponse = await fetch(`/api/admin/glamping/menu?zone_id=${fetchedZoneId}`);
        if (!menuResponse.ok) throw new Error('Failed to fetch menu items');

        const menuData = await menuResponse.json();
        const availableItems = (menuData.menuItems || []).filter((item: MenuItem) => item.is_available);
        setMenuItems(availableItems);
      } catch (error) {
        console.error('Error fetching menu data:', error);
        toast.error(locale === 'vi' ? 'Không thể tải danh sách sản phẩm' : 'Failed to load products');
      } finally {
        setLoadingMenuItems(false);
      }
    };

    fetchMenuData();
  }, [isOpen, bookingId, tents, locale]);

  // Group menu items by category
  const groupedItems = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      const categoryName = typeof item.category_name === 'string'
        ? item.category_name
        : getLocalizedText(item.category_name, locale as 'vi' | 'en') || (locale === 'vi' ? 'Khác' : 'Other');
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems, locale]);

  // Handle quantity change
  const handleQuantityChange = (item: MenuItem, quantity: number) => {
    const maxQty = item.max_quantity || 999;
    const finalQty = Math.max(0, Math.min(quantity, maxQty));

    setSelections(prev => {
      const newSelections = { ...prev };
      if (!newSelections[activeTentId]) {
        newSelections[activeTentId] = {};
      }
      if (!newSelections[activeTentId][activeNight]) {
        newSelections[activeTentId][activeNight] = {};
      }

      const nightSels = { ...newSelections[activeTentId][activeNight] };

      if (finalQty <= 0) {
        delete nightSels[item.id];
      } else {
        const itemName = typeof item.name === 'string'
          ? item.name
          : getLocalizedText(item.name, locale as 'vi' | 'en');
        const itemUnit = typeof item.unit === 'string'
          ? item.unit
          : getLocalizedText(item.unit, locale as 'vi' | 'en');

        nightSels[item.id] = {
          id: item.id,
          name: itemName,
          quantity: finalQty,
          price: item.price,
          unit: itemUnit,
          voucher: nightSels[item.id]?.voucher || null,
        };
      }

      newSelections[activeTentId][activeNight] = nightSels;
      return newSelections;
    });
  };

  const incrementQuantity = (item: MenuItem) => {
    const currentQty = activeNightSelections[item.id]?.quantity || 0;
    handleQuantityChange(item, currentQty + 1);
  };

  const decrementQuantity = (item: MenuItem) => {
    const currentQty = activeNightSelections[item.id]?.quantity || 0;
    if (currentQty > 0) {
      handleQuantityChange(item, currentQty - 1);
    }
  };

  // Voucher handling
  const handleApplyProductVoucher = async (productId: string) => {
    const code = productVoucherCodes[productId]?.trim();
    if (!code) return;

    setProductVoucherLoading(prev => ({ ...prev, [productId]: true }));
    setProductVoucherErrors(prev => ({ ...prev, [productId]: '' }));

    try {
      const product = activeNightSelections[productId];
      if (!product) return;

      const response = await fetch('/api/glamping/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          zoneId,
          itemId: productId,
          totalAmount: product.price * product.quantity,
          applicationType: 'menu_only',
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setSelections(prev => {
          const newSelections = { ...prev };
          const nightSels = { ...(newSelections[activeTentId]?.[activeNight] || {}) };
          nightSels[productId] = {
            ...nightSels[productId],
            voucher: {
              code: data.voucher.code,
              id: data.voucher.id,
              discountType: data.voucher.discountType,
              discountValue: data.voucher.discountValue,
              discountAmount: data.discountAmount,
            },
          };
          newSelections[activeTentId] = {
            ...(newSelections[activeTentId] || {}),
            [activeNight]: nightSels,
          };
          return newSelections;
        });
        setProductVoucherCodes(prev => ({ ...prev, [productId]: '' }));
      } else {
        setProductVoucherErrors(prev => ({
          ...prev,
          [productId]: data.error || (locale === 'vi' ? 'Mã không hợp lệ' : 'Invalid code'),
        }));
      }
    } catch {
      setProductVoucherErrors(prev => ({
        ...prev,
        [productId]: locale === 'vi' ? 'Lỗi xác thực' : 'Validation error',
      }));
    } finally {
      setProductVoucherLoading(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleRemoveProductVoucher = (productId: string) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      const nightSels = { ...(newSelections[activeTentId]?.[activeNight] || {}) };
      nightSels[productId] = { ...nightSels[productId], voucher: null };
      newSelections[activeTentId] = {
        ...(newSelections[activeTentId] || {}),
        [activeNight]: nightSels,
      };
      return newSelections;
    });
  };

  // Calculate total across all selections
  const { totalAmount, hasAnySelections } = useMemo(() => {
    let total = 0;
    let hasSelections = false;

    Object.values(selections).forEach(tentSels => {
      Object.values(tentSels).forEach(nightSels => {
        Object.values(nightSels).forEach(product => {
          if (product && product.quantity > 0) {
            hasSelections = true;
            const lineTotal = product.price * product.quantity;
            const discount = product.voucher?.discountAmount || 0;
            total += lineTotal - discount;
          }
        });
      });
    });

    return { totalAmount: total, hasAnySelections: hasSelections };
  }, [selections]);

  // Submit handler
  const handleSubmit = async () => {
    if (!hasAnySelections) {
      toast.error(t.selectProductFirst);
      return;
    }

    setSubmitting(true);
    try {
      // Collect all products to add
      const productsToAdd: Array<{
        bookingTentId: string;
        menuItemId: string;
        quantity: number;
        unitPrice: number;
        servingDate: string;
        voucherCode?: string;
      }> = [];

      Object.entries(selections).forEach(([tentId, tentSels]) => {
        const tent = tents.find(t => t.id === tentId);
        if (!tent) return;

        Object.entries(tentSels).forEach(([nightIdx, nightSels]) => {
          const servingDate = tent.checkInDate
            ? format(addDays(parseISO(tent.checkInDate), parseInt(nightIdx)), 'yyyy-MM-dd')
            : '';

          Object.values(nightSels).forEach(product => {
            if (product && product.quantity > 0) {
              productsToAdd.push({
                bookingTentId: tentId,
                menuItemId: product.id,
                quantity: product.quantity,
                unitPrice: product.price,
                servingDate,
                voucherCode: product.voucher?.code || undefined,
              });
            }
          });
        });
      });

      // Add products one by one
      for (const product of productsToAdd) {
        const response = await fetch(
          `/api/admin/glamping/bookings/${bookingId}/menu-products`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add product');
        }
      }

      toast.success(t.addSuccess);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error adding products:', error);
      toast.error(error instanceof Error ? error.message : t.addFailed);
    } finally {
      setSubmitting(false);
    }
  };

  // Render menu product list for current night
  const renderProductList = () => (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([categoryName, items]) => (
        <div key={categoryName} className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">{categoryName}</h4>
          <div className="grid gap-2">
            {items.map(item => {
              const quantity = activeNightSelections[item.id]?.quantity || 0;
              const productVoucher = activeNightSelections[item.id]?.voucher;
              const maxQty = item.max_quantity || 999;
              const isAtMax = quantity >= maxQty;
              const isCombo = item.min_guests !== null && item.min_guests !== undefined &&
                              item.max_guests !== null && item.max_guests !== undefined;
              const itemName = typeof item.name === 'string'
                ? item.name
                : getLocalizedText(item.name, locale as 'vi' | 'en');

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.image_url ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden">
                            <Image
                              src={item.image_url}
                              alt={itemName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageOff className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{itemName}</span>
                          {item.requires_advance_booking && item.advance_hours && (
                            <Badge variant="outline" className="text-xs">
                              {locale === 'vi'
                                ? `Đặt trước ${item.advance_hours}h`
                                : `${item.advance_hours}h advance`}
                            </Badge>
                          )}
                          {isCombo && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {item.min_guests === item.max_guests
                                ? `Combo ${item.max_guests} người`
                                : `${item.min_guests}-${item.max_guests} người`}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {formatCurrency(item.price)}
                          {item.unit && (
                            <span className="text-xs text-gray-500">
                              /{typeof item.unit === 'string' ? item.unit : getLocalizedText(item.unit, locale as 'vi' | 'en')}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => decrementQuantity(item)}
                          disabled={quantity === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          max={maxQty}
                          value={quantity}
                          onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0)}
                          className="h-8 w-14 text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => incrementQuantity(item)}
                          disabled={isAtMax}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Per-product voucher */}
                    {quantity > 0 && item.price > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        {productVoucher ? (
                          <div className="flex items-center gap-2 bg-green-50 rounded px-2 py-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            <Badge variant="default" className="font-mono text-xs">
                              {productVoucher.code}
                            </Badge>
                            <span className="text-xs text-green-700">
                              {productVoucher.discountType === 'percentage'
                                ? `(-${productVoucher.discountValue}%)`
                                : `(-${formatCurrency(productVoucher.discountAmount)})`}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 ml-auto"
                              onClick={() => handleRemoveProductVoucher(item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex gap-1.5">
                              <Ticket className="h-3.5 w-3.5 text-gray-400 mt-1.5 flex-shrink-0" />
                              <Input
                                type="text"
                                placeholder={t.voucherPlaceholder}
                                value={productVoucherCodes[item.id] || ''}
                                onChange={(e) => setProductVoucherCodes(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value.toUpperCase(),
                                }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyProductVoucher(item.id)}
                                className="h-7 text-xs flex-1"
                                disabled={productVoucherLoading[item.id]}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => handleApplyProductVoucher(item.id)}
                                disabled={!productVoucherCodes[item.id]?.trim() || productVoucherLoading[item.id]}
                              >
                                {productVoucherLoading[item.id] ? '...' : t.applyVoucher}
                              </Button>
                            </div>
                            {productVoucherErrors[item.id] && (
                              <p className="text-xs text-red-500 pl-5">{productVoucherErrors[item.id]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // Number of nights for active tent
  const nights = activeTent ? tentNights[activeTent.id] || 1 : 1;
  const showDayTabs = nights > 1;
  const showTentTabs = tents.length > 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {tents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t.noTents}</div>
          ) : loadingMenuItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">{t.loading}</span>
            </div>
          ) : menuItems.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t.noProductsFound}</AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Tent tabs if multiple tents */}
              {showTentTabs && (
                <Tabs value={activeTentId} onValueChange={setActiveTentId}>
                  <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${tents.length}, minmax(0, 1fr))` }}>
                    {tents.map((tent, index) => (
                      <TabsTrigger key={tent.id} value={tent.id} className="text-sm">
                        <Tent className="h-3.5 w-3.5 mr-1.5" />
                        {locale === 'vi' ? 'Lều' : 'Tent'} {index + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              {/* Tent info header */}
              {activeTent && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Tent className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">{activeTent.itemName}</span>
                    <span className="text-blue-600">
                      ({format(parseISO(activeTent.checkInDate), 'dd/MM')} -{' '}
                      {format(parseISO(activeTent.checkOutDate), 'dd/MM')})
                    </span>
                  </div>
                </div>
              )}

              {/* Day tabs */}
              {showDayTabs ? (
                <Tabs value={String(activeNight)} onValueChange={(val) => setActiveNight(parseInt(val))}>
                  <TabsList
                    className="w-full grid"
                    style={{ gridTemplateColumns: `repeat(${nights}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: nights }).map((_, index) => {
                      const date = activeTent?.checkInDate
                        ? addDays(parseISO(activeTent.checkInDate), index)
                        : null;
                      const label = date
                        ? `${t.day} ${index + 1} (${format(date, 'dd/MM')})`
                        : `${t.day} ${index + 1}`;

                      return (
                        <TabsTrigger key={index} value={String(index)} className="text-sm">
                          {label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {Array.from({ length: nights }).map((_, nightIndex) => (
                    <TabsContent key={nightIndex} value={String(nightIndex)} className="mt-4">
                      {renderProductList()}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="mt-4">{renderProductList()}</div>
              )}

              {/* Selection Summary */}
              {hasAnySelections && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm mb-2">{t.selected}:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {tents.map((tent, tentIndex) => {
                        const tentSels = selections[tent.id];
                        if (!tentSels) return null;

                        const tentNightCount = tentNights[tent.id] || 1;
                        const hasDayTabs = tentNightCount > 1;

                        return (
                          <div key={tent.id}>
                            {Object.entries(tentSels).map(([nightIdx, nightSels]) => {
                              const nightProducts = Object.values(nightSels).filter(p => p && p.quantity > 0);
                              if (nightProducts.length === 0) return null;

                              const nightDate = tent.checkInDate
                                ? addDays(parseISO(tent.checkInDate), parseInt(nightIdx))
                                : null;
                              const nightLabel = hasDayTabs && nightDate
                                ? `${t.day} ${parseInt(nightIdx) + 1} (${format(nightDate, 'dd/MM')})`
                                : null;

                              return (
                                <div key={`${tent.id}-${nightIdx}`}>
                                  {(showTentTabs || hasDayTabs) && (
                                    <p className="text-xs font-semibold text-gray-500 mt-1.5 mb-0.5">
                                      {showTentTabs && `${locale === 'vi' ? 'Lều' : 'Tent'} ${tentIndex + 1}`}
                                      {showTentTabs && nightLabel && ' - '}
                                      {nightLabel}
                                    </p>
                                  )}
                                  {nightProducts.map(product => {
                                    const lineTotal = product.price * product.quantity;
                                    const discount = product.voucher?.discountAmount || 0;
                                    return (
                                      <div key={`${tent.id}-${nightIdx}-${product.id}`} className="flex justify-between text-sm">
                                        <span className="text-gray-700">
                                          {product.name} x{product.quantity}
                                        </span>
                                        <span className={`font-medium ${discount > 0 ? 'text-green-600' : ''}`}>
                                          {discount > 0
                                            ? formatCurrency(lineTotal - discount)
                                            : formatCurrency(lineTotal)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-green-300 pt-2 mt-2 flex justify-between font-bold">
                      <span>{t.total}:</span>
                      <span className="text-green-700">{formatCurrency(totalAmount)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !hasAnySelections || tents.length === 0}
          >
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
