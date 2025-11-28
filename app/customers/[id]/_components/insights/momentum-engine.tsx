'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ComposedChart, Area, Bar, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import { CollectionInspector } from './collection-inspector';

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
  // Productivity (The Hero Metric)
  productivityScore: number;      // ARPD: Total Revenue / Stocking Dealers
  totalRevenue: number;           // L12M revenue
  stockingDealerCount: number;    // Dealers with displays
  avgUnitPrice: number;           // Average sale price
  isHighTicket: boolean;          // > $2,500 avg price
  // Momentum
  revenueMomentumDelta: number;   // Revenue trend %
  status: 'rent-payer' | 'rising-star' | 'high-value-stable' | 'decelerating' | 'stable';
  // Volumes
  retailUnits: number;
  projectUnits: number;
  weeklyData: WeeklyMomentumPoint[];
}

interface MomentumGroups {
  rentPayers: MomentumEntry[];
  risingStars: MomentumEntry[];
  highValueStable: MomentumEntry[];
  decelerating: MomentumEntry[];
  other: MomentumEntry[];
}

interface MomentumEngineProps {
  customerId?: string;
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Smoothing utility - applies rolling average to reduce noise
function smoothData(data: { value: number }[], windowSize: number) {
  return data.map((entry, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = data.slice(start, index + 1);
    const sum = window.reduce((acc, curr) => acc + curr.value, 0);
    const avg = sum / window.length;

    return {
      ...entry,
      originalValue: entry.value, // Keep raw data for bars
      value: avg, // Smoothed value for trend line
    };
  });
}

// Diverging Momentum Sparkline - shows danger when below baseline
interface MomentumSparklineProps {
  data: WeeklyMomentumPoint[];
  height?: number;
  width?: number;
  maxWeeks?: number; // Limit to last N weeks, or show all if undefined
}

function MomentumSparkline({ data, height = 40, width = 120, maxWeeks }: MomentumSparklineProps) {
  if (!data || data.length < 2) return null;

  // Filter data based on maxWeeks
  const filteredData = useMemo(() => {
    if (!maxWeeks || maxWeeks >= data.length) return data;
    return data.slice(-maxWeeks); // Take last N weeks
  }, [data, maxWeeks]);

  // Calculate the baseline (average of baselineMA values)
  const baseline = useMemo(() => {
    const validBaselines = filteredData.filter(d => d.baselineMA > 0).map(d => d.baselineMA);
    return validBaselines.length > 0
      ? validBaselines.reduce((a, b) => a + b, 0) / validBaselines.length
      : 0;
  }, [filteredData]);

  // Determine smoothing window based on view
  // 12-week view: 3-week rolling average
  // All-time view: 8-week rolling average
  const windowSize = maxWeeks === 12 ? 3 : 8;

  // Calculate average weekly volume for commitment threshold
  const avgWeeklyVolume = useMemo(() => {
    const volumes = filteredData.map(d => d.revenue).filter(v => v > 0);
    return volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
  }, [filteredData]);

  // Major commitment threshold: >$5K or >3x average
  const COMMITMENT_VALUE_THRESHOLD = 5000;

  // Transform and smooth data for recharts
  const chartData = useMemo(() => {
    const rawData = filteredData.map(d => {
      const isMajorCommitment = d.revenue > COMMITMENT_VALUE_THRESHOLD ||
                                 d.revenue > avgWeeklyVolume * 3;
      return {
        value: d.revenue,
        baseline: baseline,
        stockingVolume: d.stockingVolume || 0,
        replenishmentVolume: d.replenishmentVolume || 0,
        // For Commitment & Sustain model (All Time view)
        standardVolume: isMajorCommitment ? 0 : d.revenue,
        commitmentVolume: isMajorCommitment ? d.revenue : 0,
      };
    });
    return smoothData(rawData, windowSize);
  }, [filteredData, baseline, windowSize, avgWeeklyVolume]);

  // Calculate days since last order (for All Time view)
  const daysSinceLastOrder = useMemo(() => {
    if (filteredData.length === 0) return 0;
    const lastWeekWithSales = filteredData
      .slice()
      .reverse()
      .find(d => d.revenue > 0);
    if (!lastWeekWithSales) return 0;

    const lastDate = new Date(lastWeekWithSales.weekStart);
    const today = new Date();
    return Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [filteredData]);

  // Show "overdue" indicator if >120 days without re-order (only in All Time view)
  const isOverdue = !maxWeeks && daysSinceLastOrder > 120;

  // Calculate gradient offset for split color effect (use smoothed values)
  const gradientOffset = useMemo(() => {
    const dataMax = Math.max(...chartData.map(d => d.value));
    const dataMin = Math.min(...chartData.map(d => d.value));

    if (dataMax <= baseline) return 0; // All Red
    if (dataMin >= baseline) return 1; // All Green

    return (dataMax - baseline) / (dataMax - dataMin);
  }, [chartData, baseline]);

  // Generate unique ID for gradient
  const gradientId = useMemo(() => `splitColor-${Math.random().toString(36).substr(2, 9)}`, []);

  if (baseline === 0) return null;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset={gradientOffset} stopColor="#10b981" stopOpacity={0.8} />
              <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={gradientOffset} stopColor="#10b981" stopOpacity={0.15} />
              <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, 'auto']} hide />
          {/* Baseline reference line */}
          <ReferenceLine
            y={baseline}
            stroke="#6b7280"
            strokeDasharray="3 3"
            strokeWidth={1}
          />

          {/* 12-Week View: Setup vs Replenishment */}
          {maxWeeks === 12 && (
            <>
              {/* Stocking Volume (Dark Grey - Setup/Foundation) */}
              <Bar
                stackId="volume"
                dataKey="stockingVolume"
                barSize={4}
                fill="#4a4a4a"
                fillOpacity={0.3}
                radius={[0, 0, 0, 0]}
                isAnimationActive={false}
              />
              {/* Replenishment Volume (Bright - Proof of sell-through) */}
              <Bar
                stackId="volume"
                dataKey="replenishmentVolume"
                barSize={4}
                fill="#10b981"
                fillOpacity={0.7}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </>
          )}

          {/* All-Time View: Commitment & Sustain Model */}
          {!maxWeeks && (
            <>
              {/* Standard Orders (Grey) */}
              <Bar
                dataKey="standardVolume"
                barSize={4}
                fill="#6b7280"
                fillOpacity={0.6}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
              {/* Major Commitments (Brand Blue - The Hero Bets) */}
              <Bar
                dataKey="commitmentVolume"
                barSize={4}
                fill="#3b82f6"
                fillOpacity={0.9}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </>
          )}

          {/* Overdue indicator - red line at end if >120 days without order */}
          {isOverdue && (
            <ReferenceLine
              x={chartData.length - 1}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}

          {/* Smoothed trend line overlay (The "Sustain" indicator) */}
          <Area
            type="basis"
            dataKey="value"
            stroke={`url(#${gradientId})`}
            fill={`url(#${gradientId}-fill)`}
            strokeWidth={2}
            strokeOpacity={0.8}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Split bar for retail vs project units
function SplitBar({ retail, project }: { retail: number; project: number }) {
  const total = retail + project;
  if (total === 0) return null;

  const retailPercent = (retail / total) * 100;

  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted flex">
      <div className="bg-blue-500 h-full" style={{ width: `${retailPercent}%` }} />
      <div
        className="bg-muted-foreground/30 h-full"
        style={{
          width: `${100 - retailPercent}%`,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
        }}
      />
    </div>
  );
}

// Individual momentum card with productivity badges
function MomentumCard({ entry, showTrendBadge = false, maxWeeks, onClick }: { entry: MomentumEntry; showTrendBadge?: boolean; maxWeeks?: number; onClick?: () => void }) {
  const deltaColor = entry.revenueMomentumDelta >= 15
    ? 'text-emerald-600 dark:text-emerald-400'
    : entry.revenueMomentumDelta <= -10
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground';

  // Trend badge for Rent Payers (shows momentum context)
  const getTrendBadge = () => {
    if (!showTrendBadge) return null;

    if (entry.revenueMomentumDelta <= -10) {
      return (
        <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          📉 {entry.revenueMomentumDelta}%
        </span>
      );
    } else if (entry.revenueMomentumDelta >= 15) {
      return (
        <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          🚀 +{entry.revenueMomentumDelta}%
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Rank */}
        <div className="w-8 text-center">
          <span className={`text-lg font-bold ${
            entry.rank <= 3 ? 'text-amber-500' : 'text-muted-foreground'
          }`}>
            {entry.rank.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">
              {entry.collectionName}
            </span>
            {/* Diamond tag for high-ticket items */}
            {entry.isHighTicket && (
              <span className="text-xs" title={`Avg sale: ${formatCurrency(entry.avgUnitPrice)}`}>
                💎
              </span>
            )}
            {/* Trend badge for rent payers */}
            {getTrendBadge()}
          </div>
          <div className="text-xs text-muted-foreground">
            {entry.skuCount} SKUs • {entry.stockingDealerCount} dealer{entry.stockingDealerCount !== 1 ? 's' : ''}
            {entry.stockingDealerCount < 3 && (
              <span className="ml-1 text-amber-500" title="Limited sample size">⚠️</span>
            )}
          </div>

          {/* Split bar */}
          <div className="mt-1.5">
            <SplitBar retail={entry.retailUnits} project={entry.projectUnits} />
          </div>
        </div>

        {/* Productivity Badge (The Hero Stat) */}
        <div className="text-right">
          <div className="text-sm font-bold text-foreground">
            {formatCurrency(entry.productivityScore)}/yr
          </div>
          <div className="text-xs text-muted-foreground">
            per dealer
          </div>
          {entry.avgUnitPrice > 0 && (
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              Avg: {formatCurrency(entry.avgUnitPrice)}
            </div>
          )}
        </div>

        {/* Diverging Momentum Sparkline */}
        <div className="hidden sm:block">
          <MomentumSparkline data={entry.weeklyData} width={120} height={40} maxWeeks={maxWeeks} />
        </div>

        {/* Momentum Delta */}
        <div className="w-16 text-right">
          <div className={`text-sm font-semibold ${deltaColor}`}>
            {entry.revenueMomentumDelta > 0 ? '+' : ''}{entry.revenueMomentumDelta}%
          </div>
          <div className="text-xs text-muted-foreground">
            vs 12wk
          </div>
        </div>
      </div>
    </div>
  );
}

// Momentum group bucket
function MomentumBucket({
  title,
  emoji,
  badge,
  entries,
  description,
  borderColor,
  showTrendBadges = false,
  maxWeeks,
  onEntryClick,
}: {
  title: string;
  emoji: string;
  badge: string;
  entries: MomentumEntry[];
  description: string;
  borderColor: string;
  showTrendBadges?: boolean;
  maxWeeks?: number;
  onEntryClick?: (entry: MomentumEntry) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <div className={`rounded-lg border-l-4 ${borderColor} bg-card`}>
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
            {badge}
          </span>
          <span className="ml-auto text-sm text-muted-foreground">
            {entries.length} collection{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="p-2 space-y-2">
        {entries.map(entry => (
          <MomentumCard
            key={entry.collectionName}
            entry={entry}
            showTrendBadge={showTrendBadges}
            maxWeeks={maxWeeks}
            onClick={() => onEntryClick?.(entry)}
          />
        ))}
      </div>
    </div>
  );
}

type TimeRange = '12w' | 'all';

export function MomentumEngine({ customerId }: MomentumEngineProps) {
  const [groups, setGroups] = useState<MomentumGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('12w');
  const [selectedEntry, setSelectedEntry] = useState<MomentumEntry | null>(null);

  useEffect(() => {
    async function loadMomentum() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ view: 'groups' });
        if (customerId) params.set('customerId', customerId);

        const response = await fetch(`/api/insights/momentum?${params}`);
        if (!response.ok) throw new Error('Failed to fetch momentum');

        const data = await response.json();
        setGroups(data.groups);
      } catch (err) {
        console.error('Momentum error:', err);
        setError('Failed to load momentum data');
      } finally {
        setLoading(false);
      }
    }

    loadMomentum();
  }, [customerId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Luxury Momentum Engine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !groups) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Luxury Momentum Engine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>{error || 'Insufficient data for momentum analysis'}</p>
            <p className="text-sm mt-1">Requires at least 4 weeks of sales history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCollections =
    groups.rentPayers.length +
    groups.risingStars.length +
    groups.highValueStable.length +
    groups.decelerating.length +
    groups.other.length;

  const maxWeeks = timeRange === '12w' ? 12 : undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📊</span>
            Luxury Momentum Engine
          </CardTitle>
          {/* Time Range Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setTimeRange('12w')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === '12w'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              12 Weeks
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          ARPD (Revenue Per Display) • {totalCollections} collections
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rent Payers - Top productivity */}
        <MomentumBucket
          title="Rent Payers"
          emoji="💰"
          badge="Top Producers"
          entries={groups.rentPayers}
          description="Highest revenue yield per display spot - these pay for their floor space"
          borderColor="border-amber-500"
          showTrendBadges={true}
          maxWeeks={maxWeeks}
          onEntryClick={setSelectedEntry}
        />

        {/* Rising Stars - High momentum */}
        <MomentumBucket
          title="Rising Stars"
          emoji="🚀"
          badge="Trending Up"
          entries={groups.risingStars}
          description="Breaking out - revenue momentum ≥ +15% above baseline"
          borderColor="border-emerald-500"
          maxWeeks={maxWeeks}
          onEntryClick={setSelectedEntry}
        />

        {/* High Value Stable */}
        <MomentumBucket
          title="High Value Stable"
          emoji="⚓"
          badge="Reliable"
          entries={groups.highValueStable.slice(0, 5)}
          description="Strong ARPD (≥$5K) with consistent performance"
          borderColor="border-blue-500"
          maxWeeks={maxWeeks}
          onEntryClick={setSelectedEntry}
        />

        {/* Decelerating - Losing momentum */}
        <MomentumBucket
          title="Decelerating"
          emoji="📉"
          badge="Losing Momentum"
          entries={groups.decelerating}
          description="Cooling down - momentum ≤ -10% below baseline (potential knock-off risk)"
          borderColor="border-red-500"
          maxWeeks={maxWeeks}
          onEntryClick={setSelectedEntry}
        />

        {/* Legend - changes based on view mode */}
        <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
          {timeRange === '12w' ? (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-[#4a4a4a]/30" />
                  <span>Setup</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-emerald-500/70" />
                  <span>Replenishment</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 border-t border-dashed border-muted-foreground" />
                  <span>Baseline</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>💎</span>
                  <span>High-ticket</span>
                </div>
              </div>
              <p>
                <strong>Setup vs Proof:</strong> Dark = stocking (&gt;$15K).
                Bright = replenishment (sell-through).
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-[#6b7280]/60" />
                  <span>Standard</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500/90" />
                  <span>Commitment</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 border-t border-dashed border-muted-foreground" />
                  <span>8wk sustain</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>💎</span>
                  <span>High-ticket</span>
                </div>
              </div>
              <p>
                <strong>Commitment & Sustain:</strong> Blue bars = major bets (&gt;$5K or 3x avg).
                Line shows if momentum sustains after commitment.
              </p>
            </>
          )}
        </div>
      </CardContent>

      {/* Collection Inspector Drawer */}
      <CollectionInspector
        entry={selectedEntry}
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
      />
    </Card>
  );
}
