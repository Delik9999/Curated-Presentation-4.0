'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { GhostPerformer, SwapCandidate } from '@/lib/insights/types';

interface GhostSwapCardsProps {
  ghostPerformers: GhostPerformer[];
  swapCandidates: SwapCandidate[];
}

export function GhostSwapCards({ ghostPerformers, swapCandidates }: GhostSwapCardsProps) {
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ghost Performers Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-400">
            Selling Without Display
          </CardTitle>
          <CardDescription>
            These SKUs are selling without being on display. They're strong candidates to add to your feature area.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ghostPerformers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">SKU</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Collection</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {ghostPerformers.map((item, idx) => (
                    <tr key={`${item.sku}-${idx}`} className="border-b border-border/50">
                      <td className="py-2 px-2 font-mono text-sm text-foreground">{item.sku}</td>
                      <td className="py-2 px-2 text-foreground">{item.collectionName}</td>
                      <td className="py-2 px-2 text-right font-semibold text-green-600 dark:text-green-400">
                        {item.unitsCustomer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-green-600 dark:text-green-400 mb-2">✓</div>
              <p className="text-sm font-medium text-foreground">Looking good!</p>
              <p className="text-muted-foreground text-sm">
                All your best sellers are on display. Check the Efficiency Matrix for optimization opportunities.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Swap Candidates Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400">
            On Display But Not Selling
          </CardTitle>
          <CardDescription>
            These pieces are tying up wall space without producing sales. Consider swapping them for stronger performers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {swapCandidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">SKU</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Collection</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Since</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {swapCandidates.map((item, idx) => (
                    <tr key={`${item.sku}-${idx}`} className="border-b border-border/50">
                      <td className="py-2 px-2 font-mono text-sm text-foreground">{item.sku}</td>
                      <td className="py-2 px-2 text-foreground">{item.collectionName}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {formatDate(item.onDisplaySince)}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-red-600 dark:text-red-400">
                        {item.unitsCustomer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-green-600 dark:text-green-400 mb-2">✓</div>
              <p className="text-sm font-medium text-foreground">Displays are earning their space</p>
              <p className="text-muted-foreground text-sm">
                All displayed items are generating sales. Focus on expanding successful displays.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
