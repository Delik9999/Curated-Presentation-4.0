'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { CollectionPerformance } from '@/lib/insights/types';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from 'recharts';
import { useState } from 'react';

interface OpportunityMatrixProps {
  collections: CollectionPerformance[];
}

const quadrantColors = {
  unrealized: '#ef4444', // red - high sales, low display
  optimized: '#22c55e',  // green - high sales, high display
  evaluate: '#f59e0b',   // amber - low sales, high display
  sleeper: '#6b7280',    // gray - low sales, low display
};

const quadrantLabels = {
  unrealized: 'Unrealized Hero',
  optimized: 'Anchor',
  evaluate: 'Optimization Candidate',
  sleeper: 'Niche',
};

const quadrantActions = {
  unrealized: 'Add Display',
  optimized: 'Protect',
  evaluate: 'Swap/Rotate',
  sleeper: 'Monitor',
};

export function OpportunityMatrix({ collections }: OpportunityMatrixProps) {
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  if (!collections || collections.length === 0) {
    return null;
  }

  const toggleFilter = (quadrant: string) => {
    setActiveFilter(prev => prev === quadrant ? null : quadrant);
  };

  // Prepare data for scatter plot
  // Use display count for bubble sizing (bigger bubble = more displays)
  const maxDisplays = Math.max(...collections.map(c => c.displayPresenceScore), 1);

  const scatterData = collections.map(c => {
    // Map display count to bubble size (50-600 range)
    // Collections with 0 displays get minimum size
    const normalizedSize = c.displayPresenceScore === 0
      ? 50
      : 50 + (c.displayPresenceScore / maxDisplays) * 550;
    return {
      x: c.monthsOnFloor,
      y: c.salesVelocityIndex,
      z: normalizedSize,
      name: c.collectionName,
      quadrant: c.quadrant,
      units: c.unitsCustomer,
      revenue: c.revenueCustomer,
      displays: c.displayPresenceScore,
      opportunityFlag: c.opportunityFlag,
      projectedLift: c.projectedRevenueLift,
      performanceIndex: c.performanceIndex,
      monthsOnFloor: c.monthsOnFloor,
    };
  });

  // Calculate max months for X-axis (cap at 24)
  const maxMonths = Math.min(Math.max(...collections.map(c => c.monthsOnFloor), 6), 24);
  const salesThreshold = 0.15; // must be 15% of top seller to be "high sales"

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Count collections in each quadrant
  const quadrantCounts = {
    unrealized: collections.filter(c => c.quadrant === 'unrealized').length,
    optimized: collections.filter(c => c.quadrant === 'optimized').length,
    evaluate: collections.filter(c => c.quadrant === 'evaluate').length,
    sleeper: collections.filter(c => c.quadrant === 'sleeper').length,
  };

  // Find top opportunity (unrealized with highest sales)
  const topOpportunity = collections
    .filter(c => c.quadrant === 'unrealized')
    .sort((a, b) => b.revenueCustomer - a.revenueCustomer)[0];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof scatterData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
          <div className="font-semibold text-foreground mb-1">{data.name}</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-medium">{formatCurrency(data.revenue)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Units Sold:</span>
              <span className="font-medium">{data.units}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Displays:</span>
              <span className="font-medium">{data.displays}</span>
            </div>
            {data.displays > 0 && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Months on Floor:</span>
                  <span className="font-medium">{data.monthsOnFloor.toFixed(1)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Turn Rate:</span>
                  <span className="font-medium">{(data.units / data.displays).toFixed(1)}x</span>
                </div>
              </>
            )}

            {/* Zone-specific smart insights */}
            {data.quadrant === 'unrealized' && (
              <div className="mt-2 px-2 py-1.5 bg-green-50 dark:bg-green-900/20 rounded text-xs border border-green-200 dark:border-green-800">
                <span className="text-green-700 dark:text-green-300">
                  🚀 Predicted Lift: +{formatCurrency(data.projectedLift)}/yr
                </span>
              </div>
            )}
            {data.quadrant === 'evaluate' && data.x > 0 && (
              <div className="mt-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded text-xs border border-amber-200 dark:border-amber-800">
                <span className="text-amber-700 dark:text-amber-300">
                  📉 {data.x} display{data.x > 1 ? 's' : ''} underperforming
                </span>
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${quadrantColors[data.quadrant]}20`,
                    color: quadrantColors[data.quadrant]
                  }}
                >
                  {quadrantLabels[data.quadrant]}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  → {quadrantActions[data.quadrant]}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Lifecycle Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Bubble size = display count • Y = sales velocity • X = months on floor
            </p>
          </div>
          {topOpportunity && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Unrealized Hero</div>
              <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                {topOpportunity.collectionName}
              </div>
              {topOpportunity.projectedRevenueLift > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  +{formatCurrency(topOpportunity.projectedRevenueLift)}/yr
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Quadrant summary chips - clickable filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quadrantCounts.unrealized > 0 && (
            <button
              onClick={() => toggleFilter('unrealized')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                activeFilter === 'unrealized'
                  ? 'bg-red-500 text-white ring-2 ring-red-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeFilter === 'unrealized' ? 'bg-white' : 'bg-red-500'}`} />
              {quadrantCounts.unrealized} Heroes
            </button>
          )}
          {quadrantCounts.optimized > 0 && (
            <button
              onClick={() => toggleFilter('optimized')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                activeFilter === 'optimized'
                  ? 'bg-green-500 text-white ring-2 ring-green-300'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeFilter === 'optimized' ? 'bg-white' : 'bg-green-500'}`} />
              {quadrantCounts.optimized} Anchors
            </button>
          )}
          {quadrantCounts.evaluate > 0 && (
            <button
              onClick={() => toggleFilter('evaluate')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                activeFilter === 'evaluate'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeFilter === 'evaluate' ? 'bg-white' : 'bg-amber-500'}`} />
              {quadrantCounts.evaluate} Candidates
            </button>
          )}
          {quadrantCounts.sleeper > 0 && (
            <button
              onClick={() => toggleFilter('sleeper')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                activeFilter === 'sleeper'
                  ? 'bg-gray-500 text-white ring-2 ring-gray-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeFilter === 'sleeper' ? 'bg-white' : 'bg-gray-500'}`} />
              {quadrantCounts.sleeper} Niche
            </button>
          )}
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Scatter plot */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
              {/* Dead Zone - Old displays with low sales (swap candidates) */}
              <ReferenceArea
                x1={12}
                x2={maxMonths}
                y1={0}
                y2={salesThreshold}
                fill="#ef4444"
                fillOpacity={0.08}
              />

              {/* New/Fresh zone - highlight for new items */}
              <ReferenceArea
                x1={0}
                x2={3}
                y1={salesThreshold}
                y2={1}
                fill="#22c55e"
                fillOpacity={0.05}
              />

              <XAxis
                type="number"
                dataKey="x"
                name="Display Age (Months)"
                domain={[0, maxMonths]}
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
                ticks={[0, 3, 6, 12, 18, 24].filter(t => t <= maxMonths)}
                label={{
                  value: 'Display Age (Months)',
                  position: 'bottom',
                  offset: 20,
                  style: { fontSize: 11, fill: 'var(--muted-foreground)' }
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Sales Velocity Index"
                domain={[0, 1]}
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                label={{
                  value: 'Sales Velocity',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -10,
                  style: { fontSize: 11, fill: 'var(--muted-foreground)' }
                }}
              />
              <ZAxis
                type="number"
                dataKey="z"
                range={[50, 600]}
                name="Displays"
              />

              {/* Performance threshold line */}
              <ReferenceLine
                y={salesThreshold}
                stroke="var(--border)"
                strokeDasharray="3 3"
                label={{ value: '15%', position: 'right', fontSize: 9, fill: 'var(--muted-foreground)' }}
              />
              {/* 12 month line - optimization threshold */}
              <ReferenceLine
                x={12}
                stroke="var(--border)"
                strokeDasharray="3 3"
                label={{ value: '1yr', position: 'top', fontSize: 9, fill: 'var(--muted-foreground)' }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Scatter
                data={scatterData}
                onMouseEnter={(data) => setHoveredCollection(data.name)}
                onMouseLeave={() => setHoveredCollection(null)}
              >
                {scatterData.map((entry, index) => {
                  // Apply filter opacity
                  const isFiltered = activeFilter && entry.quadrant !== activeFilter;
                  const isHovered = hoveredCollection === entry.name;

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={quadrantColors[entry.quadrant]}
                      fillOpacity={isFiltered ? 0.1 : (isHovered ? 1 : 0.7)}
                      stroke={isHovered ? quadrantColors[entry.quadrant] : 'transparent'}
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Quadrant legend */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
          <div className="text-xs">
            <div className="font-medium text-red-600 dark:text-red-400 mb-1">
              🚀 Unrealized Heroes
            </div>
            <div className="text-muted-foreground">
              Selling on catalog alone. Add display to capture lift.
            </div>
          </div>
          <div className="text-xs">
            <div className="font-medium text-green-600 dark:text-green-400 mb-1">
              💎 Anchors
            </div>
            <div className="text-muted-foreground">
              Your stars. Protect inventory depth; don't remove.
            </div>
          </div>
          <div className="text-xs">
            <div className="font-medium text-amber-600 dark:text-amber-400 mb-1">
              📉 Optimization Candidates
            </div>
            <div className="text-muted-foreground">
              Wasting floor space. Swap for an Unrealized Hero.
            </div>
          </div>
          <div className="text-xs">
            <div className="font-medium text-gray-600 dark:text-gray-400 mb-1">
              💤 Niche
            </div>
            <div className="text-muted-foreground">
              Low priority. Monitor or skip.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
