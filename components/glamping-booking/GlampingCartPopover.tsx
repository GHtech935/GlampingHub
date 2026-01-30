"use client";

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag, X, Calendar, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGlampingCart } from '@/components/providers/GlampingCartProvider';
import { formatCurrency } from '@/lib/utils';

interface GlampingCartPopoverProps {
  children: React.ReactNode;
}

export function GlampingCartPopover({ children }: GlampingCartPopoverProps) {
  const router = useRouter();
  const { cart, cartCount, removeFromCart } = useGlampingCart();
  const [open, setOpen] = React.useState(false);

  const handleViewBooking = () => {
    setOpen(false);
    router.push('/glamping/booking/form?from=cart');
  };

  const handleRemoveItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromCart(itemId);
  };

  // Calculate total
  const totalAmount = cart?.items.reduce((sum, item) => {
    return sum + (item.pricingBreakdown?.subtotal || item.totalPrice || item.basePrice);
  }, 0) || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[380px] p-0 z-[1000]"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Giỏ hàng của bạn</h3>
          </div>
          <Badge variant="secondary" className="font-semibold">
            {cartCount} {cartCount === 1 ? 'lều' : 'lều'}
          </Badge>
        </div>

        {/* Cart Items */}
        <div className="max-h-[400px] overflow-y-auto">
          {cart && cart.items.length > 0 ? (
            <div className="divide-y">
              {cart.items.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-3">
                    {/* Item Image */}
                    {item.itemImageUrl && (
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
                        <Image
                          src={item.itemImageUrl}
                          alt={item.itemName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate mb-1">
                        {item.itemName}
                      </h4>

                      <div className="flex flex-col gap-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{item.checkIn} → {item.checkOut}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {item.adults} người lớn
                            {item.children > 0 && `, ${item.children} trẻ em`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-semibold text-sm text-blue-600">
                          {formatCurrency(
                            item.pricingBreakdown?.subtotal || item.totalPrice || item.basePrice
                          )}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleRemoveItem(item.id, e)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Giỏ hàng của bạn đang trống
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Hãy thêm lều yêu thích vào giỏ hàng!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <>
            <Separator />
            <div className="p-4 space-y-3">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <span className="font-bold text-lg text-blue-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              {/* View Booking Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleViewBooking}
                disabled={cartCount === 0}
              >
                Xem chi tiết booking
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-gray-500">
                Khu glamping: {cart.zoneName.vi}
              </p>
            </div>
          </>
        )}

        {/* Empty Cart Footer */}
        {(!cart || cart.items.length === 0) && (
          <>
            <Separator />
            <div className="p-4">
              <Button
                className="w-full"
                size="lg"
                disabled
                variant="outline"
              >
                Xem chi tiết booking
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
