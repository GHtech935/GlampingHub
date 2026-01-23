"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataPoint {
  date?: string;
  month?: string;
  month_name?: string;
  revenue: number;
  bookings: number;
}

interface RevenueChartProps {
  data: DataPoint[];
  title: string;
  description?: string;
  type: 'daily' | 'monthly';
}

export function RevenueChart({ data, title, description, type }: RevenueChartProps) {
  console.log('RevenueChart data:', data);
  console.log('RevenueChart type:', type);
  console.log('RevenueChart first item:', data[0]);
  console.log('RevenueChart last item:', data[data.length - 1]);
  console.log('RevenueChart items with revenue > 0:', data.filter(d => d.revenue > 0));

  // Calculate max revenue for scaling
  const maxRevenue = useMemo(() => {
    return Math.max(...data.map(d => d.revenue), 1);
  }, [data]);

  // Calculate total and average
  const stats = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.revenue, 0);
    const avg = total / data.length;
    const totalBookings = data.reduce((sum, d) => sum + d.bookings, 0);

    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(data.length / 2);
    const firstHalfAvg = data.slice(0, midPoint).reduce((sum, d) => sum + d.revenue, 0) / midPoint;
    const secondHalfAvg = data.slice(midPoint).reduce((sum, d) => sum + d.revenue, 0) / (data.length - midPoint);
    const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    return { total, avg, totalBookings, trend };
  }, [data]);

  // Format label
  const formatLabel = (item: DataPoint) => {
    if (type === 'daily' && item.date) {
      const date = new Date(item.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }
    if (type === 'monthly' && item.month_name) {
      return item.month_name;
    }
    return '';
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.total)}đ
            </div>
            <div className="flex items-center gap-1 text-sm">
              {stats.trend > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">+{stats.trend.toFixed(1)}%</span>
                </>
              ) : stats.trend < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">{stats.trend.toFixed(1)}%</span>
                </>
              ) : (
                <span className="text-gray-600">0%</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Bar Chart */}
        <div className="space-y-2">
          <div className="flex items-end justify-between h-48 gap-1 border border-gray-200 rounded bg-gray-50 p-2">
            {data.map((item, index) => {
              const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              const isWeekend = type === 'daily' && item.date &&
                [0, 6].includes(new Date(item.date).getDay());

              if (item.revenue > 0) {
                console.log(`Item ${index}: revenue=${item.revenue}, height=${height}%, maxRevenue=${maxRevenue}`);
              }

              return (
                <div
                  key={index}
                  className="flex flex-col items-center flex-1 group relative h-full"
                >
                  {/* Bar */}
                  <div
                    className={cn(
                      "w-full rounded-t transition-all duration-200 group-hover:opacity-80 self-end",
                      item.revenue > 0
                        ? (isWeekend ? "bg-blue-500" : "bg-green-500")
                        : "bg-gray-200"
                    )}
                    style={{
                      height: item.revenue > 0 ? `${Math.max(height, 5)}%` : '1%'
                    }}
                    title={`${formatLabel(item)}: ${item.revenue.toLocaleString('vi-VN')}đ (${item.bookings} bookings)`}
                  />

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                      <div className="font-semibold">{formatLabel(item)}</div>
                      <div>{item.revenue.toLocaleString('vi-VN')}đ</div>
                      <div className="text-gray-300">{item.bookings} bookings</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Labels */}
          <div className="flex items-center justify-between gap-1 text-xs text-gray-600">
            {data.map((item, index) => {
              // Show every nth label to avoid crowding
              const showLabel = type === 'monthly' ||
                (type === 'daily' && (index % 3 === 0 || index === data.length - 1));

              return (
                <div
                  key={index}
                  className="flex-1 text-center"
                >
                  {showLabel && formatLabel(item)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div>
            <div className="text-xs text-gray-600">Tổng doanh thu</div>
            <div className="text-lg font-semibold text-gray-900">
              {stats.total.toLocaleString('vi-VN')}đ
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Trung bình</div>
            <div className="text-lg font-semibold text-gray-900">
              {stats.avg.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Tổng bookings</div>
            <div className="text-lg font-semibold text-gray-900">
              {stats.totalBookings}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
