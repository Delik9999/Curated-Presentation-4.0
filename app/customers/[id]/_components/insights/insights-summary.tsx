'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { CustomerInsights } from '@/lib/insights/types';

interface InsightsSummaryProps {
  insights: CustomerInsights;
}

export function InsightsSummary({ insights }: InsightsSummaryProps) {
  const topCollection = insights.topCollections[0];

  // Calculate opportunity gap - sum of projected revenue lift from unrealized collections
  const unrealizedCollections = insights.topCollections.filter(c => c.quadrant === 'unrealized');
  const totalOpportunityGap = unrealizedCollections.reduce((sum, c) => sum + c.projectedRevenueLift, 0);

  // Calculate total revenue
  const totalRevenue = insights.topCollections.reduce((sum, c) => sum + c.revenueCustomer, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-neutral-900">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: Title and subtitle */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Opportunity Engine</h2>
            <p className="text-muted-foreground">
              Your treasure map to unrealized revenue
            </p>
            <p className="text-sm text-muted-foreground">
              {insights.customerName} • {insights.periodLabel}
            </p>
          </div>

          {/* Right: Stats chips */}
          <div className="flex flex-wrap gap-4">
            {/* Total Revenue */}
            <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 shadow-sm border border-border">
              <span className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</span>
              <span className="text-xs text-muted-foreground">Total Revenue</span>
            </div>

            {/* Opportunity Gap */}
            {totalOpportunityGap > 0 && (
              <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 shadow-sm border border-red-200 dark:border-red-800">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalOpportunityGap)}</span>
                <span className="text-xs text-red-600/70 dark:text-red-400/70">Opportunity Gap</span>
              </div>
            )}

            {/* Total Units */}
            <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 shadow-sm border border-border">
              <span className="text-2xl font-bold text-foreground">{insights.totalUnits}</span>
              <span className="text-xs text-muted-foreground">Total Units</span>
            </div>

            {/* Active Collections */}
            <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 shadow-sm border border-border">
              <span className="text-2xl font-bold text-foreground">{insights.totalCollectionsActive}</span>
              <span className="text-xs text-muted-foreground">Collections</span>
            </div>

            {/* Top Collection */}
            {topCollection && (
              <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 shadow-sm border border-border">
                <span className="text-lg font-bold text-foreground">{topCollection.collectionName}</span>
                <span className="text-xs text-muted-foreground">{topCollection.unitsCustomer} units (top)</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
