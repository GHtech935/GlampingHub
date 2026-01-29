'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import { useItemColor } from '../shared';

interface ItemBreakdown {
  itemId: string;
  tentId?: string;
  itemName: string;
  parameterName?: string;
  total: number;
  percentage: number;
}

interface ItemFinancialBreakdownProps {
  breakdowns: ItemBreakdown[];
  grandTotal: number;
  locale: string;
}

export function ItemFinancialBreakdown({
  breakdowns,
  grandTotal,
  locale,
}: ItemFinancialBreakdownProps) {
  const { getColorForItemId, itemIdToIndex } = useItemColor();

  // Skip if single item or no breakdowns
  if (breakdowns.length <= 1) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        {locale === 'vi' ? 'Phân tích theo lều' : 'Breakdown by Tent'}
      </h4>

      <div className="space-y-2">
        {breakdowns.map((breakdown, index) => {
          const colorKey = breakdown.tentId || breakdown.itemId;
          const colorScheme = getColorForItemId(colorKey);
          const itemIndex = itemIdToIndex.get(colorKey) ?? index;

          return (
            <div
              key={breakdown.tentId || `${breakdown.itemId}-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', colorScheme.dot)} />
              <div className="flex-1">
                <div className="font-medium text-gray-700">
                  {locale === 'vi' ? 'Lều' : 'Tent'} {itemIndex + 1}: {breakdown.itemName}
                </div>
                {breakdown.parameterName && (
                  <div className="text-xs text-gray-500">{breakdown.parameterName}</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {formatCurrency(breakdown.total)}
                </div>
                <div className="text-xs text-gray-500">
                  ({breakdown.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Bar Chart */}
      <div className="mt-4 pt-3 border-t border-slate-300">
        <div className="h-6 flex rounded-lg overflow-hidden">
          {breakdowns.map((breakdown, index) => {
            const colorKey = breakdown.tentId || breakdown.itemId;
            const colorScheme = getColorForItemId(colorKey);

            return (
              <div
                key={breakdown.tentId || `${breakdown.itemId}-${index}`}
                className={cn(colorScheme.dot, 'relative group')}
                style={{ width: `${breakdown.percentage}%` }}
              >
                {breakdown.percentage > 10 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                    {breakdown.percentage.toFixed(0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grand Total */}
      <div className="mt-3 pt-3 border-t border-slate-300">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            {locale === 'vi' ? 'Tổng booking' : 'Total Booking'}:
          </span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>
    </Card>
  );
}
