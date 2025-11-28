'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { NonPerformingAsset } from '@/lib/insights/types';

interface NonPerformingAssetsProps {
  assets: NonPerformingAsset[];
}

export function NonPerformingAssets({ assets }: NonPerformingAssetsProps) {
  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Non-Performing Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-green-600 dark:text-green-400 mb-2">✓</div>
            <p className="text-sm font-medium text-foreground">All displays are earning</p>
            <p className="text-muted-foreground text-sm">
              Every displayed collection has 1+ turns per year.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          Non-Performing Assets
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Displayed collections with &lt;1 turn/year - consider swapping
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assets.map((asset) => (
            <div
              key={asset.collectionName}
              className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20"
            >
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm">
                  {asset.collectionName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {asset.displayCount} display{asset.displayCount !== 1 ? 's' : ''} • {asset.unitsSold} units sold
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {asset.turnRate.toFixed(1)}x
                </div>
                <div className="text-xs text-muted-foreground">
                  turns/yr
                </div>
              </div>
            </div>
          ))}
        </div>

        {assets.length > 0 && (
          <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800">
            <p className="text-xs text-muted-foreground">
              <strong>Action:</strong> Swap these for Unrealized Heroes to improve ROI on floor space.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
