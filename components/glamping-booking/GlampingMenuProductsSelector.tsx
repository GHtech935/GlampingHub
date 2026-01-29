'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Minus, Plus, ShoppingCart, Utensils, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import Image from 'next/image';
import VoucherInput, { AppliedVoucher } from '@/components/booking/VoucherInput';

export interface MenuProduct {
  id: string;
  name: any; // JSONB: {en: string, vi: string} or string
  description?: any; // JSONB: {en: string, vi: string} or string
  price: number;
  unit?: any; // JSONB: {en: string, vi: string} or string
  image_url?: string;
  is_required: boolean;
  display_order: number;
  category_id?: string;
  category_name?: any; // JSONB: {en: string, vi: string} or string
  min_guests?: number | null;
  max_guests?: number | null;
}

export interface MenuProductSelection {
  quantity: number;
  price: number;
  name: string;
  voucher?: {
    code: string;
    id: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null;
}

interface GlampingMenuProductsSelectorProps {
  menuProducts: MenuProduct[];
  nightlySelections: Record<number, Record<string, MenuProductSelection>>;
  onChange: (selections: Record<number, Record<string, MenuProductSelection>>) => void;
  locale?: string;
  totalCountedGuests?: number;
  nights: number;
  checkInDate?: Date; // For display in tabs
}

// Helper function to extract localized string from JSONB field
const getLocalizedString = (value: any, locale: string, fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale] || value.vi || value.en || fallback;
  }
  return fallback;
};

export function GlampingMenuProductsSelector({
  menuProducts,
  nightlySelections,
  onChange,
  locale = 'vi',
  totalCountedGuests,
  nights,
  checkInDate,
}: GlampingMenuProductsSelectorProps) {
  const [activeNight, setActiveNight] = useState<number>(0);
  const texts = {
    vi: {
      title: 'Món ăn / Đồ uống',
      subtitle: 'Chọn các món ăn và đồ uống cho chuyến đi của bạn',
      required: 'Bắt buộc',
      optional: 'Tùy chọn',
      total: 'Tổng tiền món ăn',
      noProducts: 'Không có sản phẩm nào',
    },
    en: {
      title: 'Food & Drinks',
      subtitle: 'Select food and drinks for your trip',
      required: 'Required',
      optional: 'Optional',
      total: 'Total food & drinks',
      noProducts: 'No products available',
    },
  };

  const t = texts[locale as 'vi' | 'en'] || texts.vi;

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, MenuProduct[]> = {};

    menuProducts.forEach((product) => {
      const categoryName = getLocalizedString(product.category_name, locale, locale === 'vi' ? 'Khác' : 'Other');
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(product);
    });

    return groups;
  }, [menuProducts, locale]);

  // Get selections for active night
  const activeNightSelections = useMemo(() => {
    return nightlySelections[activeNight] || {};
  }, [nightlySelections, activeNight]);

  // Calculate total across all nights (including voucher discounts)
  const totalAmount = useMemo(() => {
    return Object.values(nightlySelections).reduce((sum, nightSelections) => {
      if (!nightSelections) return sum; // Skip null/undefined nights
      return sum + Object.entries(nightSelections).reduce((nightSum, [productId, selection]) => {
        if (!selection) return nightSum; // Skip null/undefined selections
        const itemTotal = selection.price * selection.quantity;
        const discount = selection.voucher?.discountAmount || 0;
        return nightSum + itemTotal - discount;
      }, 0);
    }, 0);
  }, [nightlySelections]);

  // Calculate total combo guests for active night
  const totalComboGuests = useMemo(() => {
    return Object.entries(activeNightSelections).reduce((sum, [productId, selection]) => {
      if (!selection) return sum; // Skip null/undefined selections
      const product = menuProducts.find(p => p.id === productId);
      if (!product) return sum;

      // Only count combo products (min/max not null)
      if (product.min_guests !== null && product.max_guests !== null &&
          product.min_guests !== undefined && product.max_guests !== undefined) {
        // Both fixed and variable combos: quantity × max_guests
        // Example: "1-2 người" × 2 = 2 combos × 2 người = 4 người
        // Example: "Combo 2 người" × 3 = 3 combos × 2 người = 6 người
        return sum + (product.max_guests * selection.quantity);
      }
      return sum; // Non-combo items don't count
    }, 0);
  }, [activeNightSelections, menuProducts]);

  // Calculate max quantity allowed for a menu product (for active night)
  const getMaxQuantity = (product: MenuProduct): number => {
    const { min_guests, max_guests } = product;

    // Traditional item (no guest limits) - no restriction
    if (min_guests === null || min_guests === undefined ||
        max_guests === null || max_guests === undefined) {
      return 999; // Effectively unlimited
    }

    // If no totalCountedGuests, allow unlimited
    if (totalCountedGuests === undefined || totalCountedGuests === 0) {
      return 999;
    }

    // Calculate remaining guests needed (excluding current product)
    const currentSelection = activeNightSelections[product.id];
    const currentQty = currentSelection?.quantity || 0;

    // Calculate current combo guests for THIS product
    // Both fixed and variable combos use: quantity × max_guests
    const currentProductGuests = currentQty * max_guests;

    // Calculate total combo guests from OTHER products
    const otherComboGuests = totalComboGuests - currentProductGuests;

    // Remaining guests that need to be covered
    const remainingGuests = Math.max(0, totalCountedGuests - otherComboGuests);

    // If already covered all guests with other products, don't allow more combos
    if (remainingGuests === 0) {
      return currentQty; // Keep current selection, but don't allow increasing
    }

    // Both fixed and variable combos: max quantity = ceil(remainingGuests / max_guests)
    // Example 1: 3 người cần phục vụ, món "1-2 người" → max = ceil(3/2) = 2 món
    // Example 2: 5 người cần phục vụ, món "Combo 2 người" → max = ceil(5/2) = 3 món
    // Example 3: 1 người còn thiếu, món "1-2 người" → max = ceil(1/2) = 1 món
    return Math.ceil(remainingGuests / max_guests);
  };

  const handleQuantityChange = (productId: string, product: MenuProduct, delta: number) => {
    const current = activeNightSelections[productId];
    const currentQty = current?.quantity || 0;
    const maxQty = getMaxQuantity(product);

    // Apply limits: min = 0, max = calculated max
    const newQty = Math.max(0, Math.min(maxQty, currentQty + delta));

    // Update nightlySelections with new quantity for active night
    const newNightlySelections = { ...nightlySelections };
    const newNightSelections = { ...(newNightlySelections[activeNight] || {}) };

    if (newQty === 0) {
      // Remove product when quantity becomes 0
      delete newNightSelections[productId];
    } else {
      newNightSelections[productId] = {
        quantity: newQty,
        price: product.price,
        name: getLocalizedString(product.name, locale, 'Unknown'),
        voucher: current?.voucher || null
      };
    }

    newNightlySelections[activeNight] = newNightSelections;
    onChange(newNightlySelections);
  };

  const handleVoucherApplied = (productId: string, voucher: AppliedVoucher) => {
    const current = activeNightSelections[productId];
    if (!current) return;

    const newNightlySelections = { ...nightlySelections };
    const newNightSelections = { ...(newNightlySelections[activeNight] || {}) };

    newNightSelections[productId] = {
      ...current,
      voucher: {
        code: voucher.code,
        id: voucher.id,
        discountAmount: voucher.discountAmount,
        discountType: voucher.discountType as 'percentage' | 'fixed',
        discountValue: voucher.discountValue
      }
    };

    newNightlySelections[activeNight] = newNightSelections;
    onChange(newNightlySelections);
  };

  const handleVoucherRemoved = (productId: string) => {
    const current = activeNightSelections[productId];
    if (!current) return;

    const newNightlySelections = { ...nightlySelections };
    const newNightSelections = { ...(newNightlySelections[activeNight] || {}) };

    newNightSelections[productId] = {
      ...current,
      voucher: null
    };

    newNightlySelections[activeNight] = newNightSelections;
    onChange(newNightlySelections);
  };

  // Check if a night has valid combo coverage
  const isNightValid = (nightIndex: number): boolean => {
    if (totalCountedGuests === undefined || totalCountedGuests === 0) return true;

    const nightSelections = nightlySelections[nightIndex] || {};
    const nightComboGuests = Object.entries(nightSelections).reduce((sum, [productId, selection]) => {
      if (!selection) return sum; // Skip null/undefined selections
      const product = menuProducts.find(p => p.id === productId);
      if (!product) return sum;

      if (product.min_guests !== null && product.max_guests !== null &&
          product.min_guests !== undefined && product.max_guests !== undefined) {
        return sum + (product.max_guests * selection.quantity);
      }
      return sum;
    }, 0);

    return nightComboGuests >= totalCountedGuests;
  };

  if (menuProducts.length === 0) {
    return null;
  }

  // For single night, don't show tabs
  const showTabs = nights > 1;

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Utensils className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <p className="text-sm text-gray-500">{t.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {showTabs ? (
          <Tabs value={String(activeNight)} onValueChange={(val) => setActiveNight(parseInt(val))}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${nights}, minmax(0, 1fr))` }}>
              {Array.from({ length: nights }).map((_, index) => {
                const date = checkInDate ? addDays(checkInDate, index) : null;
                const label = date
                  ? `Ngày ${index + 1} (${format(date, 'dd/MM')})`
                  : `Ngày ${index + 1}`;
                const hasError = !isNightValid(index);

                return (
                  <TabsTrigger
                    key={index}
                    value={String(index)}
                    className={hasError ? 'border-red-500 data-[state=active]:border-red-600' : ''}
                  >
                    {label}
                    {hasError && <AlertCircle className="ml-1 h-3 w-3 text-red-500" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Array.from({ length: nights }).map((_, nightIndex) => (
              <TabsContent key={nightIndex} value={String(nightIndex)} className="space-y-6 mt-4">
        {Object.entries(groupedProducts).map(([categoryName, products]) => (
          <div key={categoryName}>
            <h4 className="font-medium text-gray-700 mb-3 text-sm uppercase tracking-wide">
              {categoryName}
            </h4>
            <div className="space-y-3">
              {products.map((product) => {
                const selection = activeNightSelections[product.id];
                const quantity = selection?.quantity || 0;
                const hasQuantity = quantity > 0;
                const maxQuantity = getMaxQuantity(product);
                const isAtMax = quantity >= maxQuantity;

                return (
                  <div
                    key={product.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      hasQuantity
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Product Image */}
                      {product.image_url && (
                        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={product.image_url}
                            alt={getLocalizedString(product.name, locale, 'Product')}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">
                            {getLocalizedString(product.name, locale, 'Unknown')}
                          </span>
                          {product.is_required ? (
                            <Badge variant="destructive" className="text-xs">
                              {t.required}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {t.optional}
                            </Badge>
                          )}
                          {/* Show combo badge */}
                          {product.min_guests !== null && product.max_guests !== null && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {product.min_guests === product.max_guests
                                ? `Combo ${product.max_guests} người`
                                : `${product.min_guests}-${product.max_guests} người`
                              }
                            </Badge>
                          )}
                          {/* Show max limit hint for combo items */}
                          {product.min_guests !== null && product.max_guests !== null &&
                           maxQuantity < 999 && totalCountedGuests !== undefined && totalCountedGuests > 0 && (
                            <span className="text-xs text-gray-500">
                              (Tối đa: {maxQuantity})
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                            {getLocalizedString(product.description, locale)}
                          </p>
                        )}
                        <p className="text-primary font-semibold mt-1">
                          {formatCurrency(product.price)}
                          {product.unit && (
                            <span className="text-gray-500 font-normal text-sm">
                              {' '}
                              / {getLocalizedString(product.unit, locale, '')}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(product.id, product, -1)}
                          disabled={quantity === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(product.id, product, 1)}
                          disabled={isAtMax}
                          title={isAtMax ? `Tối đa ${maxQuantity}` : ''}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Voucher Input & Pricing Summary - Only show when quantity > 0 and price > 0 */}
                    {hasQuantity && product.price > 0 && (
                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* Left column: Voucher Input */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <VoucherInput
                            itemId={product.id}
                            totalAmount={product.price * quantity}
                            applicationType="menu_only"
                            appliedVoucher={selection.voucher ? {
                              id: selection.voucher.id,
                              code: selection.voucher.code,
                              name: '',
                              description: '',
                              discountType: selection.voucher.discountType,
                              discountValue: selection.voucher.discountValue,
                              discountAmount: selection.voucher.discountAmount,
                              isStackable: false
                            } : null}
                            onVoucherApplied={(voucher) => handleVoucherApplied(product.id, voucher)}
                            onVoucherRemoved={() => handleVoucherRemoved(product.id)}
                            validationEndpoint="/api/glamping/validate-voucher"
                            locale={locale}
                          />
                        </div>

                        {/* Right column: Pricing Breakdown */}
                        <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 text-sm">
                          <div className="flex justify-between text-gray-600">
                            <span>{formatCurrency(product.price)} × {quantity}</span>
                            <span>{formatCurrency(product.price * quantity)}</span>
                          </div>

                          {selection.voucher && (
                            <div className="flex justify-between text-green-600 font-medium">
                              <span>- Giảm giá ({selection.voucher.code})</span>
                              <span>-{formatCurrency(selection.voucher.discountAmount)}</span>
                            </div>
                          )}

                          <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-gray-200">
                            <span>Tổng</span>
                            <span className="text-blue-600">
                              {formatCurrency(
                                (product.price * quantity) - (selection.voucher?.discountAmount || 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

                {/* Validation Summary - Per Night */}
                {totalCountedGuests !== undefined && totalCountedGuests > 0 && (
                  <div className={`p-4 rounded-lg border ${
                    totalComboGuests >= totalCountedGuests
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Số khách cần món ăn (đêm này):</span>
                        <strong>{totalCountedGuests} người</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Đã chọn combo cho:</span>
                        <strong>{totalComboGuests} người</strong>
                      </div>
                      {totalComboGuests < totalCountedGuests && (
                        <div className="text-red-600 font-medium pt-2 border-t border-red-200">
                          ⚠ Thiếu {totalCountedGuests - totalComboGuests} người - Vui lòng chọn thêm combo
                        </div>
                      )}
                      {totalComboGuests >= totalCountedGuests && (
                        <div className="text-green-600 font-medium pt-2 border-t border-green-200">
                          ✓ Đủ combo cho đêm này
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <>
            {Object.entries(groupedProducts).map(([categoryName, products]) => (
              <div key={categoryName}>
                <h4 className="font-medium text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  {categoryName}
                </h4>
                <div className="space-y-3">
                  {products.map((product) => {
                    const selection = activeNightSelections[product.id];
                    const quantity = selection?.quantity || 0;
                    const hasQuantity = quantity > 0;
                    const maxQuantity = getMaxQuantity(product);
                    const isAtMax = quantity >= maxQuantity;

                    return (
                      <div
                        key={product.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          hasQuantity
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Product Image */}
                          {product.image_url && (
                            <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={product.image_url}
                                alt={getLocalizedString(product.name, locale, 'Product')}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">
                                {getLocalizedString(product.name, locale, 'Unknown')}
                              </span>
                              {product.is_required ? (
                                <Badge variant="destructive" className="text-xs">
                                  {t.required}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  {t.optional}
                                </Badge>
                              )}
                              {/* Show combo badge */}
                              {product.min_guests !== null && product.max_guests !== null && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  {product.min_guests === product.max_guests
                                    ? `Combo ${product.max_guests} người`
                                    : `${product.min_guests}-${product.max_guests} người`
                                  }
                                </Badge>
                              )}
                              {/* Show max limit hint for combo items */}
                              {product.min_guests !== null && product.max_guests !== null &&
                               maxQuantity < 999 && totalCountedGuests !== undefined && totalCountedGuests > 0 && (
                                <span className="text-xs text-gray-500">
                                  (Tối đa: {maxQuantity})
                                </span>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                                {getLocalizedString(product.description, locale)}
                              </p>
                            )}
                            <p className="text-primary font-semibold mt-1">
                              {formatCurrency(product.price)}
                              {product.unit && (
                                <span className="text-gray-500 font-normal text-sm">
                                  {' '}
                                  / {getLocalizedString(product.unit, locale, '')}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(product.id, product, -1)}
                              disabled={quantity === 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(product.id, product, 1)}
                              disabled={isAtMax}
                              title={isAtMax ? `Tối đa ${maxQuantity}` : ''}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Voucher Input & Pricing Summary - Only show when quantity > 0 and price > 0 */}
                        {hasQuantity && product.price > 0 && (
                          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {/* Left column: Voucher Input */}
                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                              <VoucherInput
                                itemId={product.id}
                                totalAmount={product.price * quantity}
                                applicationType="menu_only"
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
                                onVoucherApplied={(voucher) => handleVoucherApplied(product.id, voucher)}
                                onVoucherRemoved={() => handleVoucherRemoved(product.id)}
                                validationEndpoint="/api/glamping/validate-voucher"
                                locale={locale}
                              />
                            </div>

                            {/* Right column: Pricing Breakdown */}
                            <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 text-sm">
                              <div className="flex justify-between text-gray-600">
                                <span>{formatCurrency(product.price)} × {quantity}</span>
                                <span>{formatCurrency(product.price * quantity)}</span>
                              </div>

                              {selection?.voucher && (
                                <div className="flex justify-between text-green-600 font-medium">
                                  <span>- Giảm giá ({selection.voucher.code})</span>
                                  <span>-{formatCurrency(selection.voucher.discountAmount)}</span>
                                </div>
                              )}

                              <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-gray-200">
                                <span>Tổng</span>
                                <span className="text-blue-600">
                                  {formatCurrency(
                                    (product.price * quantity) - (selection?.voucher?.discountAmount || 0)
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Validation Summary - Single Night */}
            {totalCountedGuests !== undefined && totalCountedGuests > 0 && (
              <div className={`p-4 rounded-lg border ${
                totalComboGuests >= totalCountedGuests
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Số khách cần món ăn:</span>
                    <strong>{totalCountedGuests} người</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Đã chọn combo cho:</span>
                    <strong>{totalComboGuests} người</strong>
                  </div>
                  {totalComboGuests < totalCountedGuests && (
                    <div className="text-red-600 font-medium pt-2 border-t border-red-200">
                      ⚠ Thiếu {totalCountedGuests - totalComboGuests} người - Vui lòng chọn thêm combo
                    </div>
                  )}
                  {totalComboGuests >= totalCountedGuests && (
                    <div className="text-green-600 font-medium pt-2 border-t border-green-200">
                      ✓ Đủ combo cho tất cả khách
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Total - Across All Nights */}
        {totalAmount > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="font-medium text-gray-700 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {t.total}
            </span>
            <span className="font-bold text-lg text-primary">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
