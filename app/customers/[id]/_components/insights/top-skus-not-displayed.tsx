'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { TopSkuNotOnDisplay } from '@/lib/insights/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TopSkusNotDisplayedProps {
  skus: TopSkuNotOnDisplay[];
}

export function TopSkusNotDisplayed({ skus }: TopSkusNotDisplayedProps) {
  if (!skus || skus.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Show top 3 SKUs with charts
  const topSkus = skus.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling SKUs Not On Display</CardTitle>
        <p className="text-sm text-muted-foreground">
          These products are selling well but aren't displayed - consider adding them
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {topSkus.map((sku) => (
          <div key={sku.sku} className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm">{sku.sku}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {sku.productName}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="font-semibold text-foreground">
                  {formatCurrency(sku.revenueCustomer)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {sku.unitsCustomer} units
                </div>
              </div>
            </div>

            {/* Monthly sales chart */}
            {sku.monthlySales && sku.monthlySales.length > 0 && (
              <div className="h-24 bg-muted/30 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sku.monthlySales} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: number) => [`${value} units`, 'Units']}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar
                      dataKey="units"
                      fill="#3b82f6"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pattern indicator */}
            <div className="text-xs text-muted-foreground">
              {sku.monthlySales && sku.monthlySales.length > 1 ? (
                <span className="text-green-600 dark:text-green-400">
                  Re-order pattern detected
                </span>
              ) : (
                <span>
                  Single purchase - may be project
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
