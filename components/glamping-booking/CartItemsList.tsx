"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Edit2, ChevronDown, ChevronUp, Tent, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useGlampingCart, GlampingCartItem, isPerNightMenuProducts } from '@/components/providers/GlampingCartProvider';
import { CartItemInlineEditForm } from './CartItemInlineEditForm';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useTranslations } from 'next-intl';

export function CartItemsList() {
  const { cart, removeFromCart, clearCart } = useGlampingCart();
  const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(new Set());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const t = useTranslations('booking');

  // Get zoneId from first item in cart
  const zoneId = cart?.items?.[0]?.zoneId;

  if (!cart || cart.items.length === 0) {
    return null;
  }

  const toggleMenuExpansion = (itemId: string) => {
    setExpandedMenuItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleEditItem = (itemId: string) => {
    // Auto-save is enabled, so we can switch items without confirmation
    setEditingItemId(editingItemId === itemId ? null : itemId);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: vi });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Giỏ hàng của bạn ({cart.items.length} {cart.items.length === 1 ? 'lều' : 'lều'})
        </h2>
        <div className="flex items-center gap-2">
          {/* Add More Tents button */}
          {zoneId && (
            <Link
              href={`/glamping/zones/${zoneId}`}
              className="inline-flex items-center gap-2 bg-primary hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded-full shadow-sm transition-all hover:scale-105"
            >
              <div className="relative">
                <Tent className="h-4 w-4" />
                <Plus className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 bg-white text-primary rounded-full" />
              </div>
              <span className="font-medium">{t('addMoreTents')}</span>
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Xóa tất cả
          </Button>
        </div>
      </div>

      {/* Zone Info */}
      <div className="mb-4 rounded-lg">
        <p className="text-sm">
          <strong>Khu glamping:</strong> {cart.zoneName.vi}
        </p>
        <p className="text-xs mt-1">
          Tất cả lều trong giỏ hàng phải thuộc cùng một khu glamping
        </p>
      </div>

      <div className="space-y-4">
        {cart.items.map((item) => {
          const isMenuExpanded = expandedMenuItems.has(item.id);
          const hasMenuProducts = item.menuProducts && Object.keys(item.menuProducts).length > 0;
          const isEditing = editingItemId === item.id;

          // Calculate prices real-time from item data instead of using cached pricingBreakdown
          const accommodationCost = item.pricingBreakdown?.accommodationCost || item.totalPrice || item.basePrice || 0;
          const accommodationDiscount = item.accommodationVoucher?.discountAmount || 0;

          // Calculate menu products total and discount from menuProducts
          let menuProductsCost = 0;
          let menuDiscount = 0;
          if (item.menuProducts) {
            if (isPerNightMenuProducts(item.menuProducts)) {
              // Per-night format
              Object.values(item.menuProducts).forEach((nightSelections) => {
                if (nightSelections) {
                  Object.values(nightSelections).forEach((selection) => {
                    if (selection && selection.quantity > 0) {
                      menuProductsCost += (selection.price || 0) * selection.quantity;
                      menuDiscount += selection.voucher?.discountAmount || 0;
                    }
                  });
                }
              });
            } else {
              // Flat format
              Object.values(item.menuProducts).forEach((selection: any) => {
                if (selection && selection.quantity > 0) {
                  menuProductsCost += (selection.price || 0) * selection.quantity;
                  menuDiscount += selection.voucher?.discountAmount || 0;
                }
              });
            }
          }

          // Calculate real subtotal
          const realSubtotal = accommodationCost - accommodationDiscount + menuProductsCost - menuDiscount;
          const realGrossTotal = accommodationCost + menuProductsCost; // Total before any discounts

          return (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Summary View - Clickable */}
                <div
                  className={`flex gap-4 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors ${
                    isEditing ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleEditItem(item.id)}
                >
                  {/* Item Image */}
                  {item.itemImageUrl && (
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={item.itemImageUrl}
                        alt={item.itemName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {item.itemName}
                          {isEditing && (
                            <span className="ml-2 text-sm text-blue-600 font-normal">
                              (Đang chỉnh sửa)
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.zoneName.vi}</p>
                      </div>
                      <div
                        className="flex items-center gap-2 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditItem(item.id);
                          }}
                          className={`h-8 w-8 ${isEditing ? 'text-blue-600' : ''}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Auto-save handles saving, so we can delete directly
                            if (isEditing) {
                              setEditingItemId(null);
                            }
                            removeFromCart(item.id);
                          }}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Dates Info */}
                    <div className="flex flex-wrap gap-2 mb-2 text-sm">
                      <Badge variant="secondary">
                        {formatDate(item.checkIn)} - {formatDate(item.checkOut)}
                      </Badge>
                      <Badge variant="secondary">
                        {item.nights} {item.nights === 1 ? 'đêm' : 'đêm'}
                      </Badge>
                    </div>

                    {/* Parameters */}
                    {item.parameters && item.parameters.length > 0 && (
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-2">
                          {item.parameters.map((param) => {
                            // Handle multilingual text
                            const paramName = typeof param.name === 'object' && param.name !== null
                              ? (param.name.vi || param.name.en || '')
                              : (param.name || '')

                            return (
                              <Badge
                                key={param.id}
                                variant="outline"
                                style={{
                                  borderColor: param.color_code || undefined,
                                  color: param.color_code || undefined
                                }}
                              >
                                {paramName}: {param.quantity}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Menu Products (Collapsible) - Only show when not editing */}
                    {!isEditing && hasMenuProducts && (
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenuExpansion(item.id);
                          }}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isMenuExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>
                            Món ăn & đồ uống
                          </span>
                        </button>

                        {isMenuExpanded && (
                          <div className="mt-2 pl-5 space-y-3">
                            {/* Check if per-night format */}
                            {isPerNightMenuProducts(item.menuProducts) ? (
                              // Display per-night menu products
                              Object.entries(item.menuProducts).map(([nightIndex, nightSelections]) => {
                                const night = parseInt(nightIndex);
                                const nightDate = addDays(new Date(item.checkIn), night);
                                const nightLabel = `Ngày ${night + 1} (${format(nightDate, 'dd/MM')})`;

                                return (
                                  <div key={nightIndex} className="border-l-2 border-blue-200 pl-3">
                                    <div className="font-medium text-sm text-blue-700 mb-1">{nightLabel}</div>
                                    <div className="space-y-2">
                                      {Object.entries(nightSelections).map(([productId, selection]) => {
                                        const itemTotal = selection.price * selection.quantity;
                                        const discount = selection.voucher?.discountAmount || 0;

                                        return (
                                          <div key={productId} className="space-y-1">
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                              <span>
                                                {selection.name} x {selection.quantity}
                                              </span>
                                              {/* Show original price (before discount) */}
                                              <span>{formatPrice(itemTotal)}</span>
                                            </div>
                                            {selection.voucher && (
                                              <div className="flex justify-between text-xs text-green-600 pl-4">
                                                <span>🎫 {selection.voucher.code}</span>
                                                <span>-{formatPrice(discount)}</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              // Display flat (legacy) menu products
                              Object.entries(item.menuProducts).map(([productId, selection]) => {
                                const itemTotal = selection.price * selection.quantity;
                                const discount = selection.voucher?.discountAmount || 0;

                                return (
                                  <div key={productId} className="space-y-1">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>
                                        {selection.name} x {selection.quantity}
                                      </span>
                                      {/* Show original price (before discount) */}
                                      <span>{formatPrice(itemTotal)}</span>
                                    </div>
                                    {selection.voucher && (
                                      <div className="flex justify-between text-xs text-green-600 pl-4">
                                        <span>🎫 {selection.voucher.code}</span>
                                        <span>-{formatPrice(discount)}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Accommodation Voucher badge - Only show when not editing */}
                    {!isEditing && item.accommodationVoucher && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-600">
                            🎫 Voucher lều: {item.accommodationVoucher.code}
                          </span>
                          <span className="text-green-600 font-medium">
                            -{formatPrice(item.accommodationVoucher.discountAmount)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Price display - Only show when not editing */}
                    {!isEditing && (
                      <div className="flex justify-between items-center pt-3 border-t mt-3">
                        <span className="text-sm text-muted-foreground">Giá lều này:</span>
                        <div className="text-right">
                          {/* Show strikethrough price if there are any discounts */}
                          {(accommodationDiscount > 0 || menuDiscount > 0) && realGrossTotal > realSubtotal && (
                            <div className="text-sm text-gray-400 line-through">
                              {formatPrice(realGrossTotal)}
                            </div>
                          )}
                          {/* Show real-time calculated subtotal */}
                          <span className="text-lg font-semibold text-blue-600">
                            {formatPrice(realSubtotal)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Edit Form - Collapsible */}
                <Collapsible open={isEditing}>
                  <CollapsibleContent>
                    <CartItemInlineEditForm
                      item={item}
                      isOpen={isEditing}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
