'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { CollectionPerformance } from '@/lib/insights/types';

interface MoneyOnTableProps {
  collections: CollectionPerformance[];
}

// Gap Card with side-by-side bar visualization
function GapCard({ collection }: { collection: CollectionPerformance }) {
  const currentRevenue = collection.revenueCustomer;
  const projectedRevenue = currentRevenue + collection.projectedRevenueLift;
  const maxRevenue = Math.max(currentRevenue, projectedRevenue);

  // Calculate ROI period
  const displayCost = 500;
  const monthlyLift = collection.projectedRevenueLift / 12;
  const roiMonths = monthlyLift > 0 ? Math.ceil(displayCost / monthlyLift) : 0;

  const roiText = roiMonths < 1
    ? 'Instant ROI'
    : roiMonths < 12
      ? `${roiMonths} months`
      : `${(roiMonths / 12).toFixed(1)} years`;

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-foreground">{collection.collectionName}</h4>
          <p className="text-xs text-muted-foreground">
            {collection.unitsCustomer} units sold • No display
          </p>
        </div>
        <div className="text-right">
          <span className="px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
            +${collection.projectedRevenueLift.toLocaleString()}/yr
          </span>
        </div>
      </div>

      {/* Gap Visualization - Side by side bars */}
      <div className="space-y-2">
        {/* Current Sales */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">Current</span>
          <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
            <div
              className="h-full bg-blue-500 flex items-center justify-end px-2"
              style={{ width: `${(currentRevenue / maxRevenue) * 100}%` }}
            >
              <span className="text-xs text-white font-medium">
                ${(currentRevenue / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
        </div>

        {/* Projected Sales */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">Projected</span>
          <div className="flex-1 h-6 rounded bg-muted overflow-hidden relative">
            {/* Current portion (solid) */}
            <div
              className="absolute h-full bg-blue-500"
              style={{ width: `${(currentRevenue / maxRevenue) * 100}%` }}
            />
            {/* Projected lift (striped/ghosted) */}
            <div
              className="h-full flex items-center justify-end px-2"
              style={{
                width: `${(projectedRevenue / maxRevenue) * 100}%`,
                background: 'repeating-linear-gradient(45deg, rgb(34 197 94) 0px, rgb(34 197 94) 10px, rgb(22 163 74) 10px, rgb(22 163 74) 20px)'
              }}
            >
              <span className="text-xs text-white font-medium">
                ${(projectedRevenue / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Badge */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Pays for display in <strong className="text-green-600 dark:text-green-400">{roiText}</strong>
        </span>
        <span className="text-muted-foreground">
          Stocking avg: ${(collection.unitsTerritoryPerStore * collection.revenueCustomer / collection.unitsCustomer || 0).toFixed(0)}
        </span>
      </div>
    </div>
  );
}

export function MoneyOnTable({ collections }: MoneyOnTableProps) {
  // Filter for Unrealized Heroes: High sales but no display
  const unrealizedHeroes = collections
    .filter(c => c.quadrant === 'unrealized' && c.projectedRevenueLift > 0)
    .sort((a, b) => b.projectedRevenueLift - a.projectedRevenueLift)
    .slice(0, 4);

  const totalPotential = unrealizedHeroes.reduce((sum, c) => sum + c.projectedRevenueLift, 0);

  if (unrealizedHeroes.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>💰</span>
            Unrealized Potential
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-green-600 dark:text-green-400 text-2xl mb-2">✓</div>
            <p className="text-sm font-medium text-foreground">Optimized!</p>
            <p className="text-sm text-muted-foreground">
              All your top sellers have display support.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span>💰</span>
              Unrealized Potential
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              You're already selling these. Display them to sell 3× more.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${(totalPotential / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-muted-foreground">potential/year</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {unrealizedHeroes.map((collection) => (
          <GapCard key={collection.collectionName} collection={collection} />
        ))}

        <div className="pt-3 border-t text-xs text-muted-foreground">
          <strong>The Pitch:</strong> "You're leaving ${totalPotential.toLocaleString()} on the table.
          These collections already sell - displaying them captures the full demand."
        </div>
      </CardContent>
    </Card>
  );
}
