'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { Promotion, PromotionCalculation } from '@/lib/promotions/types';

interface TierBenefitsTableProps {
  promotion: Promotion;
  calculation: PromotionCalculation;
}

export function TierBenefitsTable({ promotion, calculation }: TierBenefitsTableProps) {
  // Determine which tier system is active
  const hasSkuTiers = promotion.skuTiers.length > 0;
  const hasDollarTiers = promotion.dollarTiers.length > 0;

  // Get the active tier list
  const tiers = useMemo(() => {
    if (hasSkuTiers) {
      return promotion.skuTiers.sort((a, b) => a.threshold - b.threshold);
    } else if (hasDollarTiers) {
      return promotion.dollarTiers.sort((a, b) => a.threshold - b.threshold);
    }
    return [];
  }, [hasSkuTiers, hasDollarTiers, promotion]);

  // Calculate estimated savings for each tier
  const calculateEstimatedSavings = (tierDiscountPercent: number) => {
    // Use current selection value as baseline
    const baseValue = calculation.displaySubtotal || 10000; // Default to $10k if no selection
    return baseValue * (tierDiscountPercent / 100);
  };

  // Determine which tier is currently achieved
  const currentValue = hasSkuTiers ? calculation.uniqueDisplaySkus : calculation.displaySubtotal;
  const currentTierDiscount = calculation.bestTierDiscount;

  if (tiers.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-neutral-50 to-gray-50 dark:from-neutral-900 dark:to-gray-900 border-b border-neutral-200 dark:border-neutral-800">
        <CardTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Tier Benefits Breakdown
        </CardTitle>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
          {hasSkuTiers
            ? 'Unlock higher discounts by adding more unique products to your selection'
            : 'Unlock higher discounts by increasing your total order value'}
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-100 dark:bg-neutral-800 border-b-2 border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Tier Level
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  {hasSkuTiers ? 'SKU Requirement' : 'Dollar Requirement'}
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Discount Rate
                </th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Est. Savings
                </th>
                <th className="text-center py-4 px-6 text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {tiers.map((tier, index) => {
                const isAchieved = currentValue >= tier.threshold;
                const isCurrent = isAchieved && tier.discountPercent === currentTierDiscount;
                const remaining = tier.threshold - currentValue;
                const estimatedSavings = calculateEstimatedSavings(tier.discountPercent);

                return (
                  <tr
                    key={tier.id}
                    className={cn(
                      'transition-all duration-200',
                      isCurrent && 'bg-green-50 dark:bg-green-950/20 shadow-inner',
                      !isCurrent && isAchieved && 'bg-blue-50 dark:bg-blue-950/20',
                      !isAchieved && 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    )}
                  >
                    {/* Tier Level */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg',
                          isCurrent && 'bg-green-500 text-white',
                          !isCurrent && isAchieved && 'bg-blue-500 text-white',
                          !isAchieved && 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                        )}>
                          {index + 1}
                        </div>
                        <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                          Tier {index + 1}
                        </span>
                      </div>
                    </td>

                    {/* Requirement */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                          {hasSkuTiers ? `${tier.threshold} SKUs` : formatCurrency(tier.threshold)}
                        </div>
                        {!isAchieved && (
                          <div className="text-xs text-neutral-600 dark:text-neutral-400">
                            {hasSkuTiers
                              ? `${remaining} more ${remaining === 1 ? 'SKU' : 'SKUs'} needed`
                              : `${formatCurrency(remaining)} more needed`}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Discount Rate */}
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-2">
                        <span className={cn(
                          'text-2xl font-bold',
                          isCurrent && 'text-green-600 dark:text-green-400',
                          !isCurrent && isAchieved && 'text-blue-600 dark:text-blue-400',
                          !isAchieved && 'text-neutral-600 dark:text-neutral-400'
                        )}>
                          {tier.discountPercent}%
                        </span>
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          OFF
                        </span>
                      </div>
                    </td>

                    {/* Estimated Savings */}
                    <td className="py-4 px-6 text-right">
                      <div className="space-y-1">
                        <div className={cn(
                          'text-lg font-bold tabular-nums',
                          isCurrent && 'text-green-600 dark:text-green-400',
                          !isCurrent && isAchieved && 'text-blue-600 dark:text-blue-400',
                          !isAchieved && 'text-neutral-600 dark:text-neutral-400'
                        )}>
                          {formatCurrency(estimatedSavings)}
                        </div>
                        {isCurrent && (
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Current Savings
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      {isCurrent ? (
                        <Badge className="bg-green-500 text-white border-0 text-base px-4 py-1.5 font-bold shadow-md">
                          <svg className="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Current Tier
                        </Badge>
                      ) : isAchieved ? (
                        <Badge className="bg-blue-500 text-white border-0 text-sm px-3 py-1 font-semibold">
                          ✓ Achieved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-2 border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 text-sm px-3 py-1 font-medium">
                          {hasSkuTiers
                            ? `${remaining} more`
                            : `${formatCurrency(remaining)} more`}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tier Comparison Summary */}
        <div className="border-t-2 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Status */}
            <div className="text-center">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Your Current Status
              </div>
              <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {hasSkuTiers ? `${currentValue} SKUs` : formatCurrency(currentValue)}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                {currentTierDiscount > 0 ? `Saving ${currentTierDiscount}%` : 'No tier yet'}
              </div>
            </div>

            {/* Next Milestone */}
            <div className="text-center">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Next Milestone
              </div>
              {calculation.nextSkuTier || calculation.nextDollarTier ? (
                <>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {hasSkuTiers && calculation.nextSkuTier
                      ? `${calculation.nextSkuTier.tier.threshold} SKUs`
                      : hasDollarTiers && calculation.nextDollarTier
                      ? formatCurrency(calculation.nextDollarTier.tier.threshold)
                      : '-'}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                    {hasSkuTiers && calculation.nextSkuTier
                      ? `Unlock ${calculation.nextSkuTier.tier.discountPercent}% OFF`
                      : hasDollarTiers && calculation.nextDollarTier
                      ? `Unlock ${calculation.nextDollarTier.tier.discountPercent}% OFF`
                      : ''}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    Max Tier
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                    You're at the highest level!
                  </div>
                </>
              )}
            </div>

            {/* Potential Savings */}
            <div className="text-center">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Max Potential Savings
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(calculateEstimatedSavings(tiers[tiers.length - 1].discountPercent))}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                At {tiers[tiers.length - 1].discountPercent}% OFF
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
