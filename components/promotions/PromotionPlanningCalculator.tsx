'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { formatCurrency } from '@/lib/utils/currency';
import type { ActivePromotion } from '@/types/promotion';

interface PromotionPlanningCalculatorProps {
  potentialSavingsByTier?: ActivePromotion['potentialSavingsByTier'];
  currentTierLevel?: number | null;
  tierRules: ActivePromotion['tierRules'];
}

export function PromotionPlanningCalculator({
  potentialSavingsByTier,
  currentTierLevel,
  tierRules,
}: PromotionPlanningCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Find future tiers (tiers higher than current)
  const futureTiers = potentialSavingsByTier?.filter(
    (tier) => tier.tierLevel > (currentTierLevel || 0)
  ) || [];

  // Already at max tier
  if (futureTiers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Partnership Planning Calculator</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You've already reached the highest tier for this promotion.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border-2">
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left group"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Partnership Planning Calculator
              </h3>
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                Planning Tool
              </Badge>
            </div>
            <p className="text-base text-neutral-700 dark:text-neutral-300">
              Model how adding more SKUs impacts your savings
            </p>
          </div>
          <div className="text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-2 font-semibold text-lg">
            {isExpanded ? (
              <>
                Collapse <ChevronUpIcon className="w-5 h-5" />
              </>
            ) : (
              <>
                Model Savings → <ChevronDownIcon className="w-5 h-5" />
              </>
            )}
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {futureTiers.map((tierProjection) => {
            // Find corresponding tier rule for discount %
            const tierRule = tierRules.find((r) => r.tierLevel === tierProjection.tierLevel);
            const discountPercent = tierRule?.displayDiscountPercent || 0;

            return (
              <Card key={tierProjection.tierLevel} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500 text-white text-base px-3 py-1">
                          {discountPercent}% OFF
                        </Badge>
                        <span className="text-sm text-muted-foreground">Tier {tierProjection.tierLevel}</span>
                      </div>

                      <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                        Expand by {tierProjection.skusToReachTier} SKU
                        {tierProjection.skusToReachTier === 1 ? '' : 's'} to reach this tier
                      </p>

                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        +{formatCurrency(tierProjection.additionalSavingsFromCurrent)} additional savings
                      </p>

                      <p className="text-xs text-muted-foreground">
                        ({formatCurrency(tierProjection.estSavings)} total savings at this tier)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
