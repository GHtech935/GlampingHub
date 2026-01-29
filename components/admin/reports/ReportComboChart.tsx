"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

interface ReportComboChartProps {
  data: Record<string, any>[];
  xKey: string;
  barKey: string;
  line1Key: string;
  line2Key: string;
  barLabel?: string;
  line1Label?: string;
  line2Label?: string;
  barColor?: string;
  line1Color?: string;
  line2Color?: string;
  height?: number;
  formatLeftAxis?: (value: number) => string;
  formatRightAxis?: (value: number) => string;
}

export function ReportComboChart({
  data,
  xKey,
  barKey,
  line1Key,
  line2Key,
  barLabel = "Total",
  line1Label = "Bookings",
  line2Label = "Qty",
  barColor = "#6B8E23",
  line1Color = "#1a237e",
  line2Color = "#4169E1",
  height = 300,
  formatLeftAxis,
  formatRightAxis,
}: ReportComboChartProps) {
  const defaultFormatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
  };

  const defaultFormatCount = (value: number) => String(value);

  const fmtLeft = formatLeftAxis || defaultFormatCurrency;
  const fmtRight = formatRightAxis || defaultFormatCount;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtLeft}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={fmtRight}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={(value: number, name: string) => {
              if (name === barLabel) return [fmtLeft(value), name];
              return [value.toLocaleString(), name];
            }}
          />
          <Legend verticalAlign="bottom" height={36} />
          <Bar
            yAxisId="left"
            dataKey={barKey}
            fill={barColor}
            name={barLabel}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={line1Key}
            stroke={line1Color}
            name={line1Label}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={line2Key}
            stroke={line2Color}
            name={line2Label}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
