'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { CollectionPerformance } from '@/lib/insights/types';

interface UnderRepresentedHeroesProps {
  collections: CollectionPerformance[];
}

export function UnderRepresentedHeroes({ collections }: UnderRepresentedHeroesProps) {
  // Filter to unrealized potential - high sales, low display
  const unrealized = collections.filter(c => c.quadrant === 'unrealized');

  if (unrealized.length === 0) {
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

  // Estimate ROI period (assuming avg display cost of $500)
  const estimateROIPeriod = (annualLift: number): string => {
    if (annualLift <= 0) return '';
    const displayCost = 500;
    const monthsToBreakEven = (displayCost / (annualLift / 12));
    if (monthsToBreakEven < 1) return 'under 1 month';
    if (monthsToBreakEven < 12) return `~${Math.ceil(monthsToBreakEven)} months`;
    return `~${(monthsToBreakEven / 12).toFixed(1)} years`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          🚀 Unrealized Heroes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These are selling on catalog alone. Imagine the lift with a display.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-muted">
          {unrealized.map((collection) => (
            <div
              key={collection.collectionName}
              className="flex-shrink-0 w-64 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              <div className="font-semibold text-foreground mb-2 truncate">
                {collection.collectionName}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(collection.revenueCustomer)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Units</span>
                  <span className="font-medium text-foreground">
                    {collection.unitsCustomer}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Displays</span>
                  <span className="font-medium text-foreground">
                    {collection.displayPresenceScore}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Avg</span>
                  <span className="font-medium text-foreground">
                    {collection.marketAvgPresence.toFixed(1)}
                  </span>
                </div>
              </div>

              {collection.projectedRevenueLift > 0 && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  {/* Opportunity Gap Badge */}
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium mb-2">
                    ⚠️ +{formatCurrency(collection.projectedRevenueLift)}/yr
                  </div>
                  {/* ROI Period */}
                  <div className="text-xs text-muted-foreground">
                    Pays for display in {estimateROIPeriod(collection.projectedRevenueLift)}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Sales Index:</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${collection.salesVelocityIndex * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground">
                  {(collection.salesVelocityIndex * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {unrealized.length > 2 && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            Scroll to see more →
          </div>
        )}
      </CardContent>
    </Card>
  );
}
