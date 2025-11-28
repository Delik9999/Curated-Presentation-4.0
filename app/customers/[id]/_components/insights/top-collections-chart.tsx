'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { CollectionPerformance } from '@/lib/insights/types';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface TopCollectionsChartProps {
  collections: CollectionPerformance[];
}

// Generate mock monthly data if not provided
function generateMockMonthlyData(total: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const weights = [0.06, 0.07, 0.09, 0.10, 0.09, 0.08, 0.07, 0.10, 0.11, 0.13, 0.10];

  return months.map((month, i) => ({
    month,
    units: Math.round(total * weights[i] * (0.8 + Math.random() * 0.4)),
    revenue: Math.round(total * weights[i] * 700 * (0.8 + Math.random() * 0.4)),
  }));
}

export function TopCollectionsChart({ collections }: TopCollectionsChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Sort collections by revenue (total dollar amount) descending
  const sortedCollections = [...collections].sort(
    (a, b) => b.revenueCustomer - a.revenueCustomer
  );

  // Show 5 by default, 20 when expanded
  const visibleCount = isExpanded ? 20 : 5;
  const visibleCollections = sortedCollections.slice(0, visibleCount);
  const hasMore = sortedCollections.length > 5;

  // Chart data - always show top 7 for visual
  const chartData = sortedCollections.slice(0, 7).map((c) => ({
    name: c.collectionName,
    revenue: c.revenueCustomer,
    index: c.performanceIndex,
  }));

  const getIndexColor = (index: number) => {
    if (index >= 1.5) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (index >= 0.75) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  const getBarColor = (index: number) => {
    if (index >= 1.5) return '#22c55e';
    if (index >= 0.75) return '#f59e0b';
    return '#ef4444';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleRowExpand = (collectionName: string) => {
    setExpandedRow(expandedRow === collectionName ? null : collectionName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Best-Selling Collections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horizontal Bar Chart - by Revenue */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={70}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Table with Expandable Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground w-8"></th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Collection</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Units</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">Performance</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">On Display</th>
              </tr>
            </thead>
            <tbody>
              {visibleCollections.map((collection) => {
                const isRowExpanded = expandedRow === collection.collectionName;
                const monthlyData = collection.monthlySales || generateMockMonthlyData(collection.unitsCustomer);

                return (
                  <>
                    <tr
                      key={collection.collectionName}
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRowExpand(collection.collectionName)}
                    >
                      <td className="py-3 px-2">
                        {isRowExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="py-3 px-2 font-medium text-foreground">
                        {collection.collectionName}
                      </td>
                      <td className="py-3 px-2 text-right text-foreground font-medium">
                        {formatCurrency(collection.revenueCustomer)}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {collection.unitsCustomer}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getIndexColor(
                            collection.performanceIndex
                          )}`}
                        >
                          {collection.performanceIndex.toFixed(1)}×
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {collection.onDisplay ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                    {isRowExpanded && (
                      <tr key={`${collection.collectionName}-chart`}>
                        <td colSpan={6} className="py-4 px-4 bg-muted/30">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Monthly Sales - {collection.collectionName}
                            </p>
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                  <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <YAxis
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={30}
                                  />
                                  <Tooltip
                                    formatter={(value: number, name: string) => [
                                      name === 'revenue' ? formatCurrency(value) : `${value} units`,
                                      name === 'revenue' ? 'Revenue' : 'Units'
                                    ]}
                                    contentStyle={{
                                      backgroundColor: 'var(--background)',
                                      border: '1px solid var(--border)',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                    }}
                                  />
                                  <Bar
                                    dataKey="units"
                                    fill={getBarColor(collection.performanceIndex)}
                                    radius={[2, 2, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expand/Collapse Button */}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show top {Math.min(20, sortedCollections.length)} collections
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
