import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { ActivePromotion } from '@/types/promotion';
import Link from 'next/link';

interface PromotionCurrentStatusCardProps {
  currentSkuCount?: number | null;
  currentTierLevel?: number | null;
  tierRules: ActivePromotion['tierRules'];
  estimatedSavings?: number | null;
  potentialSavingsByTier?: ActivePromotion['potentialSavingsByTier'];
  customerId: string;
  selectedVendor?: string;
}

export function PromotionCurrentStatusCard({
  currentSkuCount,
  currentTierLevel,
  tierRules,
  estimatedSavings,
  potentialSavingsByTier,
  customerId,
  selectedVendor,
}: PromotionCurrentStatusCardProps) {
  // No selection detected
  if (currentSkuCount === null || currentSkuCount === undefined) {
    return (
      <Card className="shadow-md border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl">Your Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg text-neutral-700 dark:text-neutral-300">
            No active Working Selection detected. Start a selection to see your tier progress.
          </p>
          <Link href={`/customers/${customerId}?tab=selection${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}>
            <Button size="lg" className="font-semibold">
              Open Working Selection
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Find next tier
  const nextTier = potentialSavingsByTier?.find((tier) => tier.tierLevel > (currentTierLevel || 0));
  const maxTier = potentialSavingsByTier?.[potentialSavingsByTier.length - 1];

  // Sort tiers for visual progression
  const sortedTiers = [...tierRules].sort((a, b) => a.tierLevel - b.tierLevel);
  const minSkuToStart = sortedTiers[0]?.minSkuCount || 5;

  return (
    <Card className="shadow-md border-2 bg-gradient-to-br from-green-50/30 to-blue-50/30 dark:from-green-950/10 dark:to-blue-950/10">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">Your Current Status</CardTitle>
        <p className="text-muted-foreground">Live progress based on your working selection</p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Primary Status Message */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold text-blue-700 dark:text-blue-400">
              {currentSkuCount}
            </span>
            <span className="text-2xl text-neutral-700 dark:text-neutral-300">
              qualifying {currentSkuCount === 1 ? 'SKU' : 'SKUs'}
            </span>
          </div>

          {currentTierLevel ? (
            <div className="flex items-baseline gap-3">
              <span className="text-lg text-neutral-700 dark:text-neutral-300">
                You are at
              </span>
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                Tier {currentTierLevel}
              </span>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-base font-medium text-yellow-800 dark:text-yellow-300">
                Add {minSkuToStart - currentSkuCount} more {minSkuToStart - currentSkuCount === 1 ? 'SKU' : 'SKUs'} to unlock Tier 1 benefits
              </p>
            </div>
          )}

          {nextTier && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-6">
              <p className="text-xl font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Add {nextTier.skusToReachTier} more {nextTier.skusToReachTier === 1 ? 'SKU' : 'SKUs'} to unlock Tier {nextTier.tierLevel}
              </p>
              {nextTier.additionalSavingsFromCurrent > 0 && (
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                  +{formatCurrency(nextTier.additionalSavingsFromCurrent)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Segmented Progress Bar */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
            Progress to Next Tier
          </h3>
          {nextTier ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {Array.from({ length: nextTier.tierLevel === 1 ? minSkuToStart : nextTier.skusToReachTier + (sortedTiers[nextTier.tierLevel - 2]?.minSkuCount || 0) }).map((_, index) => {
                  const isComplete = index < currentSkuCount;
                  return (
                    <div
                      key={index}
                      className={cn(
                        'h-3 flex-1 rounded-full transition-all',
                        isComplete
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      )}
                    />
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                {currentSkuCount} of {nextTier.tierLevel === 1 ? minSkuToStart : nextTier.skusToReachTier + (sortedTiers[nextTier.tierLevel - 2]?.minSkuCount || 0)} SKUs
              </p>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-base font-medium text-green-800 dark:text-green-300">
                You've reached the highest tier! Maximum benefits unlocked.
              </p>
            </div>
          )}
        </div>

        {/* Savings Comparison Block */}
        <div className="border-t-2 pt-6">
          <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
            Savings Comparison
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white dark:bg-neutral-900 rounded-lg border border-border">
              <div className="text-xs text-muted-foreground mb-1">CURRENT SAVINGS</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(estimatedSavings || 0)}
              </div>
            </div>
            {maxTier && (
              <div className="text-center p-4 bg-white dark:bg-neutral-900 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">MAX SAVINGS</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(maxTier.estSavings)}
                </div>
              </div>
            )}
            {nextTier && nextTier.additionalSavingsFromCurrent > 0 && (
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                <div className="text-xs text-blue-700 dark:text-blue-400 mb-1 font-semibold">NEXT TIER</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  +{formatCurrency(nextTier.additionalSavingsFromCurrent)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <Link href={`/customers/${customerId}?tab=selection${selectedVendor ? `&vendor=${selectedVendor}` : ''}`}>
          <Button size="lg" className="w-full font-semibold text-lg h-14">
            View Eligible SKUs in Working Selection →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
