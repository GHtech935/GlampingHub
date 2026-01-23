'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, Utensils } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

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
}

export interface MenuProductSelection {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

interface GlampingMenuProductsSelectorProps {
  menuProducts: MenuProduct[];
  selections: Record<string, number>;
  onChange: (selections: Record<string, number>) => void;
  locale?: string;
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
  selections,
  onChange,
  locale = 'vi',
}: GlampingMenuProductsSelectorProps) {
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

  // Calculate total
  const totalAmount = useMemo(() => {
    return menuProducts.reduce((sum, product) => {
      const quantity = selections[product.id] || 0;
      return sum + product.price * quantity;
    }, 0);
  }, [menuProducts, selections]);

  const handleQuantityChange = (productId: string, delta: number) => {
    const currentQty = selections[productId] || 0;
    const newQty = Math.max(0, currentQty + delta);

    const newSelections = { ...selections };
    if (newQty === 0) {
      delete newSelections[productId];
    } else {
      newSelections[productId] = newQty;
    }

    onChange(newSelections);
  };

  if (menuProducts.length === 0) {
    return null;
  }

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
        {Object.entries(groupedProducts).map(([categoryName, products]) => (
          <div key={categoryName}>
            <h4 className="font-medium text-gray-700 mb-3 text-sm uppercase tracking-wide">
              {categoryName}
            </h4>
            <div className="space-y-3">
              {products.map((product) => {
                const quantity = selections[product.id] || 0;

                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      quantity > 0
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
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
                        onClick={() => handleQuantityChange(product.id, -1)}
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
                        onClick={() => handleQuantityChange(product.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Total */}
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
