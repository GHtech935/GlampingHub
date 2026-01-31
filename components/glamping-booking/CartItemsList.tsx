"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Tent, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGlampingCart } from '@/components/providers/GlampingCartProvider';
import { CartItemInlineEditForm } from './CartItemInlineEditForm';
import { useTranslations } from 'next-intl';

export function CartItemsList() {
  const { cart, removeFromCart, clearCart } = useGlampingCart();
  const t = useTranslations('booking');

  // Get zoneId from first item in cart
  const zoneId = cart?.items?.[0]?.zoneId;

  if (!cart || cart.items.length === 0) {
    return null;
  }

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
        {cart.items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Summary View */}
                <div className="flex gap-4 p-2 -m-2">
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
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.zoneName.vi}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Edit Form - Always expanded */}
                <CartItemInlineEditForm
                  item={item}
                  isOpen={true}
                />
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
