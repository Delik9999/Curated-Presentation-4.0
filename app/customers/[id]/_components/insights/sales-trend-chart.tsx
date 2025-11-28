'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { CollectionPerformance } from '@/lib/insights/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SalesTrendChartProps {
  collections: CollectionPerformance[];
  periodLabel: string;
}

export function SalesTrendChart({ collections, periodLabel }: SalesTrendChartProps) {
  // Aggregate monthly sales across all collections
  const monthlyTotals = new Map<string, { units: number; revenue: number }>();

  for (const collection of collections) {
    if (collection.monthlySales) {
      for (const sale of collection.monthlySales) {
        const existing = monthlyTotals.get(sale.month) || { units: 0, revenue: 0 };
        monthlyTotals.set(sale.month, {
          units: existing.units + sale.units,
          revenue: existing.revenue + sale.revenue,
        });
      }
    }
  }

  // Convert to array and sort by month order
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = monthOrder
    .filter(month => monthlyTotals.has(month))
    .map(month => ({
      month,
      ...monthlyTotals.get(month)!,
    }));

  if (chartData.length === 0) {
    return null;
  }

  // Calculate trend
  const firstMonth = chartData[0];
  const lastMonth = chartData[chartData.length - 1];
  const revenueChange = lastMonth.revenue - firstMonth.revenue;
  const percentChange = firstMonth.revenue > 0
    ? ((revenueChange / firstMonth.revenue) * 100).toFixed(0)
    : 0;
  const isPositive = revenueChange >= 0;

  // Calculate totals
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalUnits = chartData.reduce((sum, d) => sum + d.units, 0);
  const avgMonthlyRevenue = totalRevenue / chartData.length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Sales Trajectory</CardTitle>
            <p className="text-sm text-muted-foreground">{periodLabel}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">{totalUnits} units</span>
              <span className={`font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(Number(percentChange))}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompact}
                width={50}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <div className="font-semibold text-foreground mb-1">{label}</div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="font-medium">{formatCurrency(data.revenue)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Units:</span>
                            <span className="font-medium">{data.units}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly average indicator */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-sm">
          <span className="text-muted-foreground">Monthly Average</span>
          <span className="font-medium text-foreground">{formatCurrency(avgMonthlyRevenue)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
