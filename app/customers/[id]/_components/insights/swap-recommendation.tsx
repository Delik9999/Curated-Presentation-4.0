'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { CollectionPerformance } from '@/lib/insights/types';

interface SwapRecommendationProps {
  collections: CollectionPerformance[];
}

export function SwapRecommendation({ collections }: SwapRecommendationProps) {
  // Find the best swap opportunity
  const unrealized = collections
    .filter(c => c.quadrant === 'unrealized')
    .sort((a, b) => b.revenueCustomer - a.revenueCustomer);

  const drags = collections
    .filter(c => c.quadrant === 'evaluate')
    .sort((a, b) => a.performanceIndex - b.performanceIndex);

  // Need at least one of each for a swap
  if (unrealized.length === 0 || drags.length === 0) {
    return null;
  }

  const heroToAdd = unrealized[0];
  const candidateToRemove = drags[0];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate net gain
  const netGain = heroToAdd.projectedRevenueLift;

  return (
    <Card className="border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🔄 Recommended Swap
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Free up floor space by swapping an underperformer for an unrealized hero
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Remove side */}
          <div className="flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-medium mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              REMOVE
            </div>
            <div className="font-semibold text-foreground text-sm truncate">
              {candidateToRemove.collectionName}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Index: {candidateToRemove.performanceIndex.toFixed(1)}x
            </div>
            <div className="text-xs text-muted-foreground">
              {candidateToRemove.displayPresenceScore} displays • {candidateToRemove.unitsCustomer} units
            </div>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* Install side */}
          <div className="flex-1 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-medium mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              INSTALL
            </div>
            <div className="font-semibold text-foreground text-sm truncate">
              {heroToAdd.collectionName}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Index: {heroToAdd.performanceIndex.toFixed(1)}x
            </div>
            <div className="text-xs text-muted-foreground">
              {heroToAdd.displayPresenceScore} displays • {heroToAdd.unitsCustomer} units
            </div>
          </div>
        </div>

        {/* Net gain */}
        {netGain > 0 && (
          <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800 text-center">
            <div className="text-xs text-muted-foreground">Projected Net Revenue Gain</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              +{formatCurrency(netGain)}/yr
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
