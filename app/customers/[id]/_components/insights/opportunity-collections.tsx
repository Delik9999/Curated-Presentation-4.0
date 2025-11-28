'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { OpportunityCollection } from '@/lib/insights/types';

interface OpportunityCollectionsProps {
  opportunities: OpportunityCollection[];
}

export function OpportunityCollections({ opportunities }: OpportunityCollectionsProps) {
  if (!opportunities || opportunities.length === 0) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Opportunities</CardTitle>
        <p className="text-sm text-muted-foreground">
          Collections where you're below the average store (YTD)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {opportunities.slice(0, 5).map((opp) => (
            <div
              key={opp.collectionName}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex-1">
                <div className="font-medium text-foreground">{opp.collectionName}</div>
                <div className="text-sm text-muted-foreground">
                  Avg per store: {formatCurrency(opp.territoryAvgRevenue)} • You: {formatCurrency(opp.customerRevenue)}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium">
                  +{formatCurrency(opp.opportunityGap)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  potential
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
