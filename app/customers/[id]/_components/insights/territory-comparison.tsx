'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { CollectionPerformance } from '@/lib/insights/types';

interface TerritoryComparisonProps {
  collections: CollectionPerformance[];
}

export function TerritoryComparison({ collections }: TerritoryComparisonProps) {
  const getIndexIndicator = (index: number) => {
    if (index > 1.2) {
      return {
        icon: '▲',
        color: 'text-green-600 dark:text-green-400',
        label: 'Above avg',
      };
    }
    if (index >= 0.8) {
      return {
        icon: '•',
        color: 'text-amber-600 dark:text-amber-400',
        label: 'Average',
      };
    }
    return {
      icon: '▼',
      color: 'text-red-600 dark:text-red-400',
      label: 'Below avg',
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>How You Compare to Similar Showrooms</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Collection</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Your Units</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Territory Avg</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">Index</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => {
                const indicator = getIndexIndicator(collection.performanceIndex);
                return (
                  <tr key={collection.collectionName} className="border-b border-border/50">
                    <td className="py-3 px-2 font-medium text-foreground">
                      {collection.collectionName}
                    </td>
                    <td className="py-3 px-2 text-right text-foreground">
                      {collection.unitsCustomer}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {collection.unitsTerritoryPerStore.toFixed(1)}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`font-bold ${indicator.color}`}>
                          {indicator.icon}
                        </span>
                        <span className={`font-semibold ${indicator.color}`}>
                          {collection.performanceIndex.toFixed(1)}×
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
