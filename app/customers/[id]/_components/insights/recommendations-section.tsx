'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { DisplayMixRecommendation, NewIntroRecommendation } from '@/lib/insights/types';

interface RecommendationsSectionProps {
  displayMix: DisplayMixRecommendation[];
  newIntros: NewIntroRecommendation[];
}

export function RecommendationsSection({ displayMix, newIntros }: RecommendationsSectionProps) {
  const getBadgeLabel = (faces: number) => {
    if (faces >= 5) return { label: 'Anchor', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' };
    if (faces >= 3) return { label: 'Support', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' };
    return { label: 'Accent', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Display Mix Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Display Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayMix.map((item) => {
              const badge = getBadgeLabel(item.recommendedFaces);
              return (
                <div
                  key={item.collectionName}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{item.collectionName}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.recommendedFaces} faces
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* New Intros Card */}
      <Card>
        <CardHeader>
          <CardTitle>New Intros You're Likely to Sell</CardTitle>
        </CardHeader>
        <CardContent>
          {newIntros.length > 0 ? (
            <div className="space-y-4">
              {newIntros.map((item, idx) => (
                <div
                  key={`${item.sku}-${idx}`}
                  className="pb-4 border-b border-border/50 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {item.sku}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {item.collectionName}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.shortReason}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No new intro recommendations at this time.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
