'use client';

import { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';

interface WeeklyMomentumPoint {
  weekStart: string;
  revenue: number;
  signalMA: number;
  baselineMA: number;
  stockingVolume: number;
  replenishmentVolume: number;
  projectVolume: number;
}

interface MomentumEntry {
  rank: number;
  collectionName: string;
  skuCount: number;
  productivityScore: number;
  totalRevenue: number;
  stockingDealerCount: number;
  avgUnitPrice: number;
  isHighTicket: boolean;
  revenueMomentumDelta: number;
  status: string;
  retailUnits: number;
  projectUnits: number;
  weeklyData: WeeklyMomentumPoint[];
}

interface CollectionInspectorProps {
  entry: MomentumEntry | null;
  open: boolean;
  onClose: () => void;
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get quarter from date
function getQuarter(dateStr: string): string {
  const month = new Date(dateStr).getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

// Get activity level descriptor for market data (privacy-safe)
function getActivityLevel(value: number, baseline: number): string {
  if (baseline === 0) return 'No Data';
  const ratio = value / baseline;
  if (ratio >= 1.5) return 'Very High';
  if (ratio >= 1.2) return 'High';
  if (ratio >= 0.8) return 'Moderate';
  if (ratio >= 0.5) return 'Low';
  return 'Minimal';
}

// Get activity level color
function getActivityColor(level: string): string {
  switch (level) {
    case 'Very High': return 'text-emerald-400';
    case 'High': return 'text-emerald-500';
    case 'Moderate': return 'text-foreground';
    case 'Low': return 'text-amber-500';
    case 'Minimal': return 'text-red-400';
    default: return 'text-muted-foreground';
  }
}

// Custom tooltip component
function CustomTooltip({ active, payload, label, privacyMode = false }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const isStocking = data.stockingVolume > 0;
  const isProject = data.projectVolume > 0;
  const hasReplenishment = data.actualReplenishment > 0;

  // Privacy mode: show activity levels instead of dollar amounts for market/baseline data
  if (privacyMode) {
    const activityLevel = getActivityLevel(data.revenue, data.baselineMA);
    const activityColor = getActivityColor(activityLevel);

    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-slate-300 mb-2">
          Week of {formatDate(data.weekStart)}
        </p>
        <div className="space-y-1.5">
          {/* My data - fully transparent */}
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">My Volume:</span>
            <span className="font-mono font-bold text-blue-400">
              {formatCurrency(data.revenue)}
            </span>
          </div>
          {isStocking && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Stocking:</span>
              <span className="font-mono font-bold text-blue-300">
                {formatCurrency(data.stockingVolume)}
              </span>
            </div>
          )}
          {hasReplenishment && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Replenish:</span>
              <span className="font-mono text-emerald-400">
                {formatCurrency(data.actualReplenishment)}
              </span>
            </div>
          )}
          {isProject && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Project:</span>
              <span className="font-mono text-purple-400">
                {formatCurrency(data.projectVolume)}
              </span>
            </div>
          )}
          {/* Market data - obfuscated */}
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-700">
            <span className="text-slate-500">Territory Trend:</span>
            <span className={`font-bold italic ${activityColor}`}>
              {activityLevel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Standard mode - show all values with sales velocity context
  const isOverdue = data.daysSinceOrder > 100;
  const scheduleStatus = isOverdue ? 'Overdue' : 'On Schedule';
  const statusColor = isOverdue ? 'text-amber-500' : 'text-emerald-500';
  const hasRetailVolume = data.retailVolume > 0;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">
        Week of {formatDate(data.weekStart)}
      </p>
      <div className="space-y-1.5 text-muted-foreground">
        {/* 3-Month Run Rate (WMA Trend) */}
        {data.trendValue > 0 && (
          <div className="flex justify-between gap-4 pb-1 border-b">
            <span>3-Month Run Rate:</span>
            <span className="text-emerald-500 font-bold">
              ~{formatCurrency(data.trendValue)}/wk
            </span>
          </div>
        )}

        {/* Retail Order */}
        {hasRetailVolume && (
          <div className="text-blue-500">
            <p className="font-medium">
              Retail Order: {formatCurrency(data.retailVolume)}
            </p>
          </div>
        )}

        {/* Project Order (Sugar Rush) */}
        {isProject && (
          <div className="text-purple-500">
            <p className="font-medium">
              ⚡ Project: {formatCurrency(data.projectVolume)}
            </p>
            <p className="text-xs text-purple-400 italic">
              One-off (not in trend)
            </p>
          </div>
        )}

        {/* Total if both present */}
        {hasRetailVolume && isProject && (
          <div className="flex justify-between gap-4 pt-1 border-t text-xs">
            <span>Total:</span>
            <span className="text-foreground font-medium">
              {formatCurrency(data.revenue)}
            </span>
          </div>
        )}

        {/* Schedule Status */}
        <div className="text-xs border-t pt-1 mt-1 flex justify-between">
          <span>Status:</span>
          <span className={`font-medium ${statusColor}`}>
            {scheduleStatus}
            {isOverdue && ` (${data.daysSinceOrder} days)`}
          </span>
        </div>
      </div>
    </div>
  );
}

type ChartMode = 'timeline' | 'revenue-index';

export function CollectionInspector({ entry, open, onClose }: CollectionInspectorProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>('timeline');

  // Calculate baseline for the collection
  const baseline = useMemo(() => {
    if (!entry?.weeklyData) return 0;
    const validBaselines = entry.weeklyData
      .filter(d => d.baselineMA > 0)
      .map(d => d.baselineMA);
    return validBaselines.length > 0
      ? validBaselines.reduce((a, b) => a + b, 0) / validBaselines.length
      : 0;
  }, [entry]);

  // Prepare chart data with Pure Sales Velocity (Weighted Moving Average)
  const chartData = useMemo(() => {
    if (!entry?.weeklyData) return [];

    // WMA parameters
    const WMA_WINDOW = 12; // 3-month quarterly view

    // Calculate Retail Volume (Stocking + Replenishment, NOT Projects)
    const weeklyRetail = entry.weeklyData.map(d => ({
      ...d,
      retailVolume: d.stockingVolume + d.replenishmentVolume,
      isProject: d.projectVolume > 0,
    }));

    // Calculate 12-week Weighted Moving Average for each point
    // Weights: recent weeks weighted higher (12, 11, 10, ... 1)
    // Total weight = 78
    const trendValues: number[] = [];

    for (let i = 0; i < weeklyRetail.length; i++) {
      let weightedSum = 0;
      let totalWeight = 0;

      // Look back up to 12 weeks (or as many as available)
      for (let j = 0; j < WMA_WINDOW && (i - j) >= 0; j++) {
        const weight = WMA_WINDOW - j; // 12 for most recent, 11 for next, etc.
        const weekIndex = i - j;
        weightedSum += weeklyRetail[weekIndex].retailVolume * weight;
        totalWeight += weight;
      }

      // Calculate weighted average (represents "Active Buying Power")
      const wma = totalWeight > 0 ? weightedSum / totalWeight : 0;
      trendValues.push(wma);
    }

    // Track days since last order for schedule indicator
    let lastOrderIndex = -1;
    const daysSinceOrder: number[] = [];

    for (let i = 0; i < weeklyRetail.length; i++) {
      if (weeklyRetail[i].retailVolume > 0) {
        lastOrderIndex = i;
      }
      const weeksSince = lastOrderIndex >= 0 ? i - lastOrderIndex : i;
      daysSinceOrder.push(weeksSince * 7);
    }

    return weeklyRetail.map((d, i) => ({
      ...d,
      index: i,
      // Retail Volume = Stocking + Replenishment (standard orders)
      retailVolume: d.retailVolume,
      // 12-week Weighted Moving Average (Retail Trend)
      trendValue: Math.round(trendValues[i]),
      // Days since last retail order
      daysSinceOrder: daysSinceOrder[i],
      // Schedule status
      isOverdue: daysSinceOrder[i] > 100,
      quarter: getQuarter(d.weekStart),
    }));
  }, [entry]);

  // Stocking thresholds (match momentum.ts)
  const STOCKING_VALUE_THRESHOLD = 15000;
  const STOCKING_QUANTITY_THRESHOLD = 10;

  // Get recent significant orders for the list with order type classification
  const recentOrders = useMemo(() => {
    if (!chartData) return [];
    return chartData
      .filter(d => d.revenue > 0)
      .slice(-20)
      .reverse()
      .map((d, i) => {
        // Use server-side classification (Width/Depth algorithm)
        const hasStocking = d.stockingVolume > 0;
        const hasProject = d.projectVolume > 0;
        const hasReplenishment = d.replenishmentVolume > 0;

        // Determine primary order type for display
        let orderType: 'stocking' | 'project' | 'replenishment';
        if (hasStocking) {
          orderType = 'stocking';
        } else if (hasProject) {
          orderType = 'project';
        } else {
          orderType = 'replenishment';
        }

        return {
          ...d,
          originalIndex: chartData.length - 1 - chartData.slice(-20).reverse().indexOf(d),
          orderType,
        };
      });
  }, [chartData]);

  // Calculate average replenish cycle (days between replenishment orders)
  const avgReplenishCycle = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;

    // Get weeks with replenishment orders (not stocking)
    const replenishWeeks = chartData
      .filter(d => d.replenishmentVolume > 0)
      .map(d => new Date(d.weekStart).getTime())
      .sort((a, b) => a - b);

    if (replenishWeeks.length < 2) return null;

    // Calculate gaps between consecutive replenishment orders
    const gaps: number[] = [];
    for (let i = 1; i < replenishWeeks.length; i++) {
      const daysDiff = (replenishWeeks[i] - replenishWeeks[i - 1]) / (1000 * 60 * 60 * 24);
      gaps.push(daysDiff);
    }

    const avgDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return Math.round(avgDays);
  }, [chartData]);

  // Identify quarter boundaries for reference areas
  const quarterBoundaries = useMemo(() => {
    if (!chartData.length) return [];
    const boundaries: { start: number; end: number; quarter: string }[] = [];
    let currentQuarter = chartData[0]?.quarter;
    let start = 0;

    chartData.forEach((d, i) => {
      if (d.quarter !== currentQuarter) {
        boundaries.push({ start, end: i - 1, quarter: currentQuarter });
        currentQuarter = d.quarter;
        start = i;
      }
    });
    // Add last quarter
    boundaries.push({ start, end: chartData.length - 1, quarter: currentQuarter });

    return boundaries;
  }, [chartData]);

  if (!entry) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {entry.collectionName}
            {entry.isHighTicket && <span>💎</span>}
          </SheetTitle>
          <div className="text-sm text-muted-foreground">
            {entry.skuCount} SKUs • {entry.stockingDealerCount} dealers •{' '}
            {formatCurrency(entry.productivityScore)}/yr per dealer
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Interactive Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">
                  {chartMode === 'timeline' ? 'Revenue Timeline' : 'Revenue Index'}
                </h3>
                {/* Mode Toggle */}
                <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
                  <button
                    onClick={() => setChartMode('timeline')}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      chartMode === 'timeline'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Show actual dollar amounts"
                  >
                    $
                  </button>
                  <button
                    onClick={() => setChartMode('revenue-index')}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      chartMode === 'revenue-index'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Privacy-safe mode (hide market totals)"
                  >
                    📊
                  </button>
                </div>
              </div>
              {/* Legend - Top Right */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm opacity-80" />
                  <span className="text-foreground/70">Retail</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-sm" />
                  <span className="text-foreground/70">Project</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-emerald-500" style={{ height: '3px' }} />
                  <span className="text-foreground/70">Trend</span>
                </div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                  onMouseMove={(state: any) => {
                    if (state?.activeTooltipIndex !== undefined) {
                      setHoveredIndex(state.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Quarter shading */}
                  {quarterBoundaries.map((q, i) =>
                    i % 2 === 1 ? (
                      <ReferenceArea
                        key={q.quarter + i}
                        x1={q.start}
                        x2={q.end}
                        fill="#f3f4f6"
                        fillOpacity={0.5}
                      />
                    ) : null
                  )}

                  <XAxis
                    dataKey="weekStart"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  {/* AXIS 1: REVENUE (For Bars) */}
                  {/* Scales linearly to the max order value */}
                  <YAxis
                    yAxisId="revenue"
                    tickFormatter={chartMode === 'timeline' ? (v) => formatCurrency(v) : () => ''}
                    tick={chartMode === 'timeline' ? { fontSize: 10 } : false}
                    axisLine={chartMode === 'timeline'}
                    tickLine={chartMode === 'timeline'}
                    width={chartMode === 'timeline' ? 50 : 20}
                    domain={[0, 'auto']}
                  />

                  {/* AXIS 2: HEALTH (For Trend Line) */}
                  {/* Independent scale so the line uses full chart height */}
                  <YAxis
                    yAxisId="health"
                    orientation="right"
                    hide={true}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    content={<CustomTooltip privacyMode={chartMode === 'revenue-index'} />}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />

                  {/* Baseline reference */}
                  <ReferenceLine
                    y={baseline}
                    yAxisId="revenue"
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    label={{
                      value: 'Baseline',
                      position: 'right',
                      fontSize: 10,
                      fill: '#6b7280',
                    }}
                  />

                  {/* SVG Pattern for hatched Project bars */}
                  <defs>
                    <pattern
                      id="projectHatch"
                      patternUnits="userSpaceOnUse"
                      width="4"
                      height="4"
                      patternTransform="rotate(45)"
                    >
                      <line x1="0" y1="0" x2="0" y2="4" stroke="#a855f7" strokeWidth="2" />
                    </pattern>
                  </defs>

                  {/* LAYER 1: Retail Orders (Standard Business) */}
                  {/* Stocking + Replenishment = regular dealer orders */}
                  <Bar
                    dataKey="retailVolume"
                    yAxisId="revenue"
                    stackId="bars"
                    fill="#3b82f6"
                    fillOpacity={0.8}
                    radius={[0, 0, 0, 0]}
                  />

                  {/* LAYER 2: Project Orders (Sugar Rush) */}
                  {/* One-off project orders - cash but not trend indicator */}
                  <Bar
                    dataKey="projectVolume"
                    yAxisId="revenue"
                    stackId="bars"
                    fill="#a855f7"
                    fillOpacity={1}
                    radius={[4, 4, 0, 0]}
                  />

                  {/* TREND LINE: 3-Month Run Rate (Independent Scale) */}
                  {/* 12-week WMA showing Retail Trend velocity */}
                  <Line
                    type="monotone"
                    dataKey="trendValue"
                    yAxisId="health"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Recent Orders</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {recentOrders.map((order, i) => {
                // Determine colors based on order type
                const amountColor = order.orderType === 'stocking'
                  ? 'text-blue-500 dark:text-blue-400'
                  : order.orderType === 'project'
                    ? 'text-purple-500 dark:text-purple-400'
                    : 'text-emerald-500 dark:text-emerald-400';

                return (
                  <div
                    key={order.weekStart + i}
                    className={`flex items-center justify-between p-2 rounded text-sm transition-colors ${
                      hoveredIndex === order.originalIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-16">
                        {formatDate(order.weekStart)}
                      </span>
                      {/* Order type badge */}
                      {order.orderType === 'stocking' && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          Stocking
                        </span>
                      )}
                      {order.orderType === 'project' && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                          Project
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${amountColor}`}>
                        {formatCurrency(order.revenue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-semibold">{formatCurrency(entry.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Momentum</p>
              <p className={`text-lg font-semibold ${
                entry.revenueMomentumDelta >= 15
                  ? 'text-emerald-500'
                  : entry.revenueMomentumDelta <= -10
                    ? 'text-red-500'
                    : ''
              }`}>
                {entry.revenueMomentumDelta > 0 ? '+' : ''}
                {entry.revenueMomentumDelta}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Replenish Cycle</p>
              {avgReplenishCycle ? (
                <p className={`text-lg font-semibold ${
                  avgReplenishCycle <= 30
                    ? 'text-emerald-500'
                    : avgReplenishCycle >= 90
                      ? 'text-amber-500'
                      : ''
                }`}>
                  {avgReplenishCycle} days
                  {avgReplenishCycle <= 30 && (
                    <span className="text-xs ml-1" title="Fast mover">🔥</span>
                  )}
                </p>
              ) : (
                <p className="text-lg font-semibold text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Retail Units</p>
              <p className="text-lg font-semibold">{entry.retailUnits}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Project Units</p>
              <p className="text-lg font-semibold text-purple-500">{entry.projectUnits}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Unit Price</p>
              <p className="text-lg font-semibold">{formatCurrency(entry.avgUnitPrice)}</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
