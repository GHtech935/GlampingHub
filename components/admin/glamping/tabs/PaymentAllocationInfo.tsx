'use client';

import React from 'react';
import { Info, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency } from '@/lib/utils';
import { ItemBadge, useItemColor } from '../shared';
import type { BookingItem } from '../types';

interface PaymentAllocationInfoProps {
  items: BookingItem[];
  totalPaid: number;
  totalAmount: number;
  locale: string;
}

export function PaymentAllocationInfo({
  items,
  totalPaid,
  totalAmount,
  locale,
}: PaymentAllocationInfoProps) {
  const { getColorForItem } = useItemColor();

  // Skip rendering if no payments yet or single item
  if (totalPaid === 0 || items.length <= 1) {
    return null;
  }

  // Calculate proportional allocation per item
  const itemAllocations = items.map((item, index) => {
    const itemTotal = item.totalPrice;
    const proportion = totalAmount > 0 ? itemTotal / totalAmount : 0;
    const estimatedPaid = totalPaid * proportion;
    const paidPercentage = itemTotal > 0 ? (estimatedPaid / itemTotal) * 100 : 0;

    return {
      item,
      index,
      itemTotal,
      proportion,
      estimatedPaid,
      paidPercentage: Math.min(100, paidPercentage),
    };
  });

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-start gap-2 mb-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-900">
            {locale === 'vi' ? '💡 Phân bổ thanh toán theo lều (tự động)' : '💡 Payment Allocation by Tent (Automatic)'}
          </h4>
          <p className="text-xs text-blue-700 mt-1">
            {locale === 'vi'
              ? 'Phân bổ tự động theo tỷ lệ giá trị, chỉ mang tính tham khảo'
              : 'Automatic allocation based on price proportion, for reference only'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {itemAllocations.map(({ item, index, itemTotal, proportion, estimatedPaid, paidPercentage }) => {
          const colorScheme = getColorForItem(index);

          return (
            <div
              key={item.id}
              className={cn(
                'p-3 rounded-lg border-l-4 bg-white',
                colorScheme.border
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <ItemBadge
                  itemIndex={index}
                  colorScheme={colorScheme}
                  size="sm"
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.itemName}</p>
                  {item.parameterName && (
                    <p className="text-xs text-gray-600">{item.parameterName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">
                    {locale === 'vi' ? 'Tổng' : 'Total'}
                  </p>
                  <p className="font-semibold text-sm">{formatCurrency(itemTotal)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {locale === 'vi' ? 'Ước tính đã trả' : 'Estimated paid'}:
                  </span>
                  <span className={cn('font-medium', colorScheme.text)}>
                    {formatCurrency(estimatedPaid)}
                    <span className="text-gray-500 ml-1">
                      ({(proportion * 100).toFixed(1)}% {locale === 'vi' ? 'theo tỷ lệ' : 'proportion'})
                    </span>
                  </span>
                </div>

                <Progress
                  value={paidPercentage}
                  className="h-2"
                />

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{paidPercentage.toFixed(1)}% {locale === 'vi' ? 'đã trả' : 'paid'}</span>
                  {paidPercentage < 100 && (
                    <span>
                      {locale === 'vi' ? 'Còn' : 'Remaining'}: {formatCurrency(itemTotal - estimatedPaid)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              {locale === 'vi' ? 'Tổng đã thanh toán' : 'Total Paid'}:
            </span>
          </div>
          <span className="font-bold text-blue-600">{formatCurrency(totalPaid)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-700">
            {locale === 'vi' ? 'Tổng booking' : 'Total Booking'}:
          </span>
          <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </Card>
  );
}
