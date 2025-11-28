'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface WeeklyDataPoint {
  weekStart: string;
  retailUnits: number;
  projectUnits: number;
  movingAverage: number;
}

interface LeaderboardEntry {
  rank: number;
  sku: string;
  productName: string;
  collectionName: string;
  runRate: number;
  projectVolume: number;
  totalVolume: number;
  trend: 'up' | 'down' | 'flat' | 'new';
  trendPercent: number;
  rankDelta: number;
  weeklyData: WeeklyDataPoint[];
  isNewIntro: boolean;
  firstSaleDate: string;
}

interface VelocityLeaderboardProps {
  customerId: string;
  scope?: 'customer' | 'territory';
}

// Mini sparkline component
function Sparkline({ data }: { data: WeeklyDataPoint[] }) {
  if (!data || data.length === 0) return null;

  const maxMA = Math.max(...data.map(d => d.movingAverage), 1);
  const height = 24;
  const width = 80;
  const padding = 2;

  // Create SVG path for moving average line
  const maPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((d.movingAverage / maxMA) * (height - 2 * padding));
    return `${x},${y}`;
  }).join(' ');

  // Create dots for raw data
  const maxRaw = Math.max(...data.map(d => d.retailUnits), 1);

  return (
    <svg width={width} height={height} className="inline-block">
      {/* Moving average line */}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={maPoints}
        className="text-blue-500"
      />
      {/* Raw data dots */}
      {data.map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((d.retailUnits / maxRaw) * (height - 2 * padding));
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2"
            className="fill-muted-foreground/50"
          />
        );
      })}
    </svg>
  );
}

// Retail vs Project split bar
function SplitBar({ retail, project }: { retail: number; project: number }) {
  const total = retail + project;
  if (total === 0) return null;

  const retailPercent = (retail / total) * 100;

  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted flex">
      <div
        className="bg-blue-500 h-full"
        style={{ width: `${retailPercent}%` }}
      />
      <div
        className="bg-muted-foreground/30 h-full"
        style={{ width: `${100 - retailPercent}%`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }}
      />
    </div>
  );
}

// Trend indicator
function TrendIndicator({ trend, percent, rankDelta }: { trend: string; percent: number; rankDelta: number }) {
  if (trend === 'new') {
    return (
      <div className="flex flex-col items-center">
        <span className="text-green-500 text-sm">🚀</span>
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">New</span>
      </div>
    );
  }

  if (trend === 'up') {
    return (
      <div className="flex flex-col items-center">
        <span className="text-green-500 text-sm">📈</span>
        <span className="text-xs text-green-600 dark:text-green-400">+{percent}%</span>
      </div>
    );
  }

  if (trend === 'down') {
    return (
      <div className="flex flex-col items-center">
        <span className="text-red-500 text-sm">📉</span>
        <span className="text-xs text-red-600 dark:text-red-400">{percent}%</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <span className="text-muted-foreground text-sm">➖</span>
      <span className="text-xs text-muted-foreground">Flat</span>
    </div>
  );
}

export function VelocityLeaderboard({ customerId, scope = 'territory' }: VelocityLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hotNewIntros, setHotNewIntros] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          customerId,
          scope,
          limit: '15',
        });

        const response = await fetch(`/api/insights/leaderboard?${params}`);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');

        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setHotNewIntros(data.hotNewIntros || []);
      } catch (err) {
        console.error('Leaderboard error:', err);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [customerId, scope]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Velocity Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Velocity Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>{error || 'Not enough data for velocity analysis'}</p>
            <p className="text-sm mt-1">Requires at least 3 weeks of sales history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span>🏆</span>
          Velocity Leaderboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          3-Week Moving Average • Project orders excluded from rank
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hot New Intros Badge */}
        {hotNewIntros.length > 0 && (
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <span>🔥</span>
              <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                Hot New Intros
              </span>
            </div>
            <div className="space-y-1">
              {hotNewIntros.map(item => (
                <div key={item.sku} className="text-sm flex items-center gap-2">
                  <span className="font-medium text-foreground">{item.collectionName}</span>
                  <span className="text-muted-foreground">jumped</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    +{item.rankDelta} spots
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="space-y-2">
          {leaderboard.map((item) => (
            <div
              key={item.sku}
              className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className="w-8 text-center">
                  <span className={`text-lg font-bold ${
                    item.rank <= 3 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}>
                    {item.rank.toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {item.collectionName}
                    </span>
                    {item.isNewIntro && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        New
                      </span>
                    )}
                    {item.rankDelta > 10 && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        +{item.rankDelta}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.sku} {/* Shows "X SKUs" */}
                  </div>

                  {/* Split bar */}
                  <div className="mt-1.5">
                    <SplitBar retail={item.runRate * 3} project={item.projectVolume} />
                  </div>
                </div>

                {/* Run Rate */}
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">
                    {item.runRate}
                  </div>
                  <div className="text-xs text-muted-foreground">units/wk</div>
                </div>

                {/* Sparkline */}
                <div className="hidden sm:block">
                  <Sparkline data={item.weeklyData} />
                </div>

                {/* Trend */}
                <div className="w-12">
                  <TrendIndicator
                    trend={item.trend}
                    percent={item.trendPercent}
                    rankDelta={item.rankDelta}
                  />
                </div>
              </div>

              {/* Context line */}
              {item.projectVolume > 0 && (
                <div className="mt-2 text-xs text-muted-foreground pl-11">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(0,0,0,0.2) 1px, rgba(0,0,0,0.2) 2px)' }} />
                    {item.projectVolume} project units excluded
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-full bg-blue-500" />
            <span>Retail</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-full bg-muted-foreground/30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(0,0,0,0.2) 1px, rgba(0,0,0,0.2) 2px)' }} />
            <span>Project (excluded)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
